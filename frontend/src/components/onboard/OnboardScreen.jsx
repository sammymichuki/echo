import { useState } from "react";

/**
 * OnboardScreen
 * Bootstraps a persistent anonymous account and lets users restore it on another device.
 */
export default function OnboardScreen({
  visible,
  anonId,
  recoveryCode,
  revealRecovery = false,
  onCreateAccount,
  onRestoreAccount,
  onContinue,
}) {
  const [restoreCode, setRestoreCode] = useState("");
  const [restoring, setRestoring] = useState(false);
  const normalizedRestoreCode = restoreCode.trim().toUpperCase();

  async function handleRestore() {
    if (!normalizedRestoreCode) return;
    setRestoring(true);
    try {
      await onRestoreAccount?.(normalizedRestoreCode);
      setRestoreCode("");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className={`screen onboard ${visible ? "visible" : "hidden"}`}>
      <div className="logo-ring">
        <div className="logo-icon">◉</div>
      </div>

      <h1>
        Speak <em>freely</em>.<br />Stay the same anonymous voice.
      </h1>

      <p>
        Your public handle stays anonymous, but your private recovery code keeps it
        yours across devices and different days.
      </p>

      {revealRecovery ? (
        <div className="recovery-panel">
          <div className="recovery-label">Save this recovery code</div>
          <div className="recovery-code">{recoveryCode}</div>
          <div className="recovery-copy">
            Use it on another device to restore <strong>@{anonId?.slice(0, 12)}</strong>.
          </div>
          <button className="btn-primary" onClick={onContinue}>
            Continue to Echo
          </button>
        </div>
      ) : (
        <>
          <button className="btn-primary" onClick={onCreateAccount}>
            Create Anonymous Account
          </button>

          <div className="restore-panel">
            <div className="restore-title">Restore existing anonymous account</div>
            <input
              className="restore-input"
              value={restoreCode}
              onChange={(e) => setRestoreCode(e.target.value.toUpperCase())}
              placeholder="ABCD-EFGH-JKLM-NPQR"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
            <button className="btn-secondary" onClick={handleRestore} disabled={!normalizedRestoreCode || restoring}>
              {restoring ? "Restoring..." : "Restore With Recovery Code"}
            </button>
          </div>
        </>
      )}

      {recoveryCode && !revealRecovery && (
        <p className="onboard-note">Current recovery code saved on this device: {recoveryCode}</p>
      )}
    </div>
  );
}
