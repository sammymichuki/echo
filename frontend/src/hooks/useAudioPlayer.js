import { useState, useRef, useEffect } from "react";
import { claimAudioSession, releaseAudioSession } from "../utils/audioSession";

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
  const demoCurRef  = useRef(0);
  const rafRef      = useRef(null);
  const playerIdRef = useRef(`player_${Math.random().toString(36).slice(2)}`);
  const demoStepCount = 60;

  function stopDemoPlayback() {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  function stopProgressLoop() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function stopPlayback(resetToStart = false) {
    stopDemoPlayback();
    stopProgressLoop();

    if (audioRef.current) {
      audioRef.current.pause();
      if (resetToStart) {
        audioRef.current.currentTime = 0;
        setProgress(0);
      }
    }

    setPlaying(false);
    releaseAudioSession(playerIdRef.current);
  }

  // Real audio playback when URL exists
  useEffect(() => {
    stopPlayback(true);
    demoCurRef.current = 0;
    setProgress(0);

    if (!audioUrl) return undefined;

    const a = new Audio(audioUrl);
    a.preload = "metadata";
    audioRef.current = a;

    const syncProgress = () => {
      if (isFinite(a.duration) && a.duration > 0) {
        setProgress(Math.min(a.currentTime / a.duration, 1));
      }
    };
    const tickProgress = () => {
      syncProgress();
      if (!a.paused && !a.ended) {
        rafRef.current = requestAnimationFrame(tickProgress);
      } else {
        rafRef.current = null;
      }
    };
    const startProgressLoop = () => {
      stopProgressLoop();
      rafRef.current = requestAnimationFrame(tickProgress);
    };
    const onPlay = () => {
      setPlaying(true);
      startProgressLoop();
    };
    const onPause = () => {
      setPlaying(false);
      stopProgressLoop();
      releaseAudioSession(playerIdRef.current);
      syncProgress();
    };
    const onEnded = () => {
      stopProgressLoop();
      setPlaying(false);
      setProgress(1);
      a.currentTime = 0;
      releaseAudioSession(playerIdRef.current);
    };
    const onError = () => {
      stopProgressLoop();
      setPlaying(false);
      releaseAudioSession(playerIdRef.current);
    };

    a.addEventListener("loadedmetadata", syncProgress);
    a.addEventListener("durationchange", syncProgress);
    a.addEventListener("timeupdate", syncProgress);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended",      onEnded);
    a.addEventListener("error", onError);

    return () => {
      stopPlayback();
      a.pause();
      a.removeEventListener("loadedmetadata", syncProgress);
      a.removeEventListener("durationchange", syncProgress);
      a.removeEventListener("timeupdate", syncProgress);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended",      onEnded);
      a.removeEventListener("error", onError);
      audioRef.current = null;
    };
  }, [audioUrl]);

  function seek(nextProgress) {
    const clamped = Math.max(0, Math.min(nextProgress, 1));
    setProgress(clamped);

    if (audioUrl && audioRef.current) {
      const audio = audioRef.current;
      if (isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = audio.duration * clamped;
      }
      return;
    }

    demoCurRef.current = Math.round(clamped * demoStepCount);
  }

  function toggle() {
    if (audioUrl && audioRef.current) {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
      } else {
        claimAudioSession(playerIdRef.current, () => stopPlayback());
        if (
          isFinite(audioRef.current.duration) &&
          audioRef.current.duration > 0 &&
          audioRef.current.currentTime >= audioRef.current.duration
        ) {
          audioRef.current.currentTime = 0;
          setProgress(0);
        }

        audioRef.current.play().catch((err) => {
          console.error("Audio play failed:", err);
          stopProgressLoop();
          setPlaying(false);
        });
      }
      return;
    }

    // Demo simulation
    if (playing) {
      stopPlayback();
    } else {
      const safeDuration = duration && duration > 0 ? duration : 10;
      const steps = demoStepCount;

      if (demoCurRef.current >= steps) {
        demoCurRef.current = 0;
        setProgress(0);
      }

      claimAudioSession(playerIdRef.current, () => stopPlayback());
      setPlaying(true);

      intervalRef.current = setInterval(() => {
        demoCurRef.current += 1;
        setProgress(demoCurRef.current / steps);

        if (demoCurRef.current >= steps) {
          stopDemoPlayback();
          setPlaying(false);
          setProgress(1);
          demoCurRef.current = steps;
          releaseAudioSession(playerIdRef.current);
        }
      }, (safeDuration * 1000) / steps);
    }
  }

  // Cleanup on unmount
  useEffect(() => () => {
    stopPlayback();
  }, []);

  return { playing, progress, toggle, seek };
}
