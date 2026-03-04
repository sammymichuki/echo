import { useState, useRef, useEffect } from "react";

/**
 * Manages playback state for a single voice post.
 * Simulates progress when no real audio URL is available (demo mode).
 *
 * @param {string|null} audioUrl  – URL of the audio file or null for demo
 * @param {number}      duration  – duration in seconds
 */
export function useAudioPlayer(audioUrl, duration) {
  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0); // 0–1

  const audioRef    = useRef(null);
  const intervalRef = useRef(null);
  // FIX 1: track demo position across pauses so resume continues from
  // where the user left off instead of jumping back to the start
  const demoCurRef  = useRef(0);

  // Real audio playback when URL exists
  useEffect(() => {
    if (!audioUrl) return;

    const a = new Audio(audioUrl);
    audioRef.current = a;

    const onTimeUpdate = () => {
      // FIX 3: guard against NaN when metadata hasn't loaded yet
      if (isFinite(a.duration) && a.duration > 0) {
        setProgress(a.currentTime / a.duration);
      }
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };

    a.addEventListener("timeupdate", onTimeUpdate);
    a.addEventListener("ended",      onEnded);

    return () => {
      // FIX 5: reset playing state when the URL changes so the UI
      // doesn't show "playing" with nothing actually running
      a.pause();
      a.removeEventListener("timeupdate", onTimeUpdate);
      a.removeEventListener("ended",      onEnded);
      audioRef.current = null;
      setPlaying(false);
      setProgress(0);
    };
  }, [audioUrl]);

  function toggle() {
    if (audioUrl && audioRef.current) {
      if (playing) {
        audioRef.current.pause();
        setPlaying(false);
      } else {
        // FIX 2: handle play() promise rejection (autoplay policy on mobile)
        audioRef.current.play().catch((err) => {
          console.error("Audio play failed:", err);
          setPlaying(false);
        });
        setPlaying(true);
      }
      return;
    }

    // Demo simulation
    if (playing) {
      clearInterval(intervalRef.current);
      setPlaying(false);
      // demoCurRef keeps its value so the next play() resumes from here
    } else {
      // FIX 4: guard against zero/missing duration to avoid infinite interval
      const safeDuration = duration && duration > 0 ? duration : 10;
      const steps = 60;

      // FIX 1: if we've reached the end, restart from the beginning
      if (demoCurRef.current >= steps) {
        demoCurRef.current = 0;
        setProgress(0);
      }

      setPlaying(true);

      intervalRef.current = setInterval(() => {
        demoCurRef.current += 1;
        setProgress(demoCurRef.current / steps);

        if (demoCurRef.current >= steps) {
          clearInterval(intervalRef.current);
          setPlaying(false);
          setProgress(0);
          demoCurRef.current = 0;
        }
      }, (safeDuration * 1000) / steps);
    }
  }

  // Cleanup on unmount
  useEffect(() => () => clearInterval(intervalRef.current), []);

  return { playing, progress, toggle };
}