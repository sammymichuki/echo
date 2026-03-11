let activeSession = null;

export function claimAudioSession(id, stop) {
  if (activeSession && activeSession.id !== id) {
    activeSession.stop?.();
  }
  activeSession = { id, stop };
}

export function releaseAudioSession(id) {
  if (activeSession?.id === id) {
    activeSession = null;
  }
}
