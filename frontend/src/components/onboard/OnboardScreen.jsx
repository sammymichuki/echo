/**
 * OnboardScreen
 * First-launch welcome screen. No auth, no signup.
 *
 * Props:
 *   onListen – () => void  – go straight to feed
 *   onRecord – () => void  – open record sheet immediately
 *   visible  – boolean
 */
export default function OnboardScreen({ onListen, onRecord, visible }) {
    return (
      <div className={`screen onboard ${visible ? "visible" : "hidden"}`}>
        <div className="logo-ring">
          <div className="logo-icon">◉</div>
        </div>
  
        <h1>
          Speak <em>freely</em>.<br />Listen deeply.
        </h1>
  
        <p>
          No names. No profiles. Just voices, feelings, and the quiet courage
          of being heard.
        </p>
  
        <button className="btn-primary" onClick={onListen}>
          🎧 Start Listening
        </button>
        <button className="btn-secondary" onClick={onRecord}>
          🎙 Post a Voice
        </button>
  
        <p className="onboard-note">Completely anonymous · No sign-up required</p>
      </div>
    );
  }