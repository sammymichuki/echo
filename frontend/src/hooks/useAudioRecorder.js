import { useState, useRef, useEffect } from "react";

/**
 * Manages microphone recording via MediaRecorder API.
 * Returns the recorded blob + helpers.
 *
 * @param {number} maxSeconds – hard stop at this duration
 */
export function useAudioRecorder(maxSeconds = 60) {
  const [recording, setRecording] = useState(false);
  const [recorded,  setRecorded]  = useState(false);
  const [elapsed,   setElapsed]   = useState(0);
  const [blob,      setBlob]      = useState(null);
  const [error,     setError]     = useState(null);

  const mediaRef    = useRef(null);
  const streamRef   = useRef(null);
  const chunksRef   = useRef([]);
  const intervalRef = useRef(null);

  function resolveStartError(err) {
    const name = err?.name || "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "Microphone access denied. Allow microphone permission in your browser settings.";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "No microphone detected. Connect a mic and try again.";
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return "Microphone is busy (possibly used by another app). Close other apps and retry.";
    }
    if (name === "SecurityError") {
      return "Recording requires a secure context (HTTPS or localhost).";
    }
    return "Unable to start recording on this device/browser.";
  }

  function getRecorderOptions() {
    if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return {};
    const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    const supported = preferred.find((t) => MediaRecorder.isTypeSupported(t));
    return supported ? { mimeType: supported } : {};
  }

  async function start() {
    // FIX 1: guard against double-fire from synthetic mouse+touch events
    if (recording || recorded) return;
    setError(null);

    try {
      if (!navigator?.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        setError("This browser doesn't support voice recording here. Use a modern browser on HTTPS/localhost.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      // FIX 2: if start() was called twice concurrently and we lost the race,
      // bail out cleanly so we don't spawn a second MediaRecorder
      if (mediaRef.current && mediaRef.current.state !== "inactive") {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const mr = new MediaRecorder(stream, getRecorderOptions());
      mediaRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const type = mr.mimeType || chunksRef.current?.[0]?.type || "audio/webm";
        const b = new Blob(chunksRef.current, { type });
        if (!b.size) {
          setError("No audio captured. Hold/tap record a bit longer, then stop.");
          setBlob(null);
          setRecorded(false);
        } else {
          setBlob(b);
          setRecorded(true);
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRef.current = null;
      };

      mr.onerror = () => {
        setError("Recording failed unexpectedly. Please retry.");
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRef.current = null;
      };

      // Timeslice ensures we get periodic chunks (helps short recordings on some browsers).
      mr.start(250);
      setRecording(true);
      setElapsed(0);

      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= maxSeconds) {
            stop();
            return maxSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      setError(resolveStartError(err));
      setRecording(false);
      setRecorded(false);
      setBlob(null);
    }
  }

  function stop() {
    clearInterval(intervalRef.current);
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      try {
        mediaRef.current.requestData();
      } catch {
        // requestData is best-effort before stop
      }
      mediaRef.current.stop();
    }
    setRecording(false);
  }

  function reset() {
    clearInterval(intervalRef.current);
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    mediaRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setRecorded(false);
    setElapsed(0);
    setBlob(null);
    setError(null);
  }

  // cleanup on unmount
  useEffect(() => () => {
    clearInterval(intervalRef.current);
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  return { recording, recorded, elapsed, blob, error, start, stop, reset };
}
