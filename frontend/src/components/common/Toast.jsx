/**
 * Toast
 * Floating notification banner. Animates in/out via CSS class.
 *
 * Props:
 *   message – string | null  – display text; null hides the toast
 */
export default function Toast({ message }) {
    return (
      <div className={`toast ${message ? "show" : ""}`}>
        {message}
      </div>
    );
  }