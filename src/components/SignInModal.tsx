import { useEffect, useRef, useState, type FormEvent } from "react";
import { Github, KeyRound, Mail, ShieldCheck, X } from "lucide-react";
import type { AccountConnectionsModel } from "../hooks/use-account-connections";

export function SignInModal({
  model,
  open,
  onClose,
}: {
  model: AccountConnectionsModel;
  open: boolean;
  onClose: () => void;
}) {
  const emailInput = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      emailInput.current?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !model.busy) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, model.busy, onClose]);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await model.signIn(email);
    if (result === "device-session") onClose();
  }

  const providersDisabled = Boolean(model.busy) || model.cloudStatus === "checking";

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !model.busy && onClose()}>
      <section className="sign-in-modal" role="dialog" aria-modal="true" aria-labelledby="sign-in-title">
        <header>
          <div className="modal-brand"><img src="./glassware-mark.svg" alt="" /><span>GlassWare</span></div>
          <button className="modal-close" title="Close sign in" aria-label="Close sign in" disabled={Boolean(model.busy)} onClick={onClose}><X size={18} /></button>
        </header>
        <div className="modal-copy">
          <p>YOUR WIPLASH ACCOUNT</p>
          <h2 id="sign-in-title">Sign in to GlassWare</h2>
          <span>Use Google, GitHub, or your Wiplash account to keep one secure identity across Wiplash apps.</span>
        </div>
        <div className="modal-provider-list" aria-label="Sign-in methods">
          <button disabled={providersDisabled} onClick={() => void model.signInWith("google")}>
            <GoogleMark /><span>Continue with Google</span>
          </button>
          <button disabled={providersDisabled} onClick={() => void model.signInWith("github")}>
            <Github size={19} /><span>Continue with GitHub</span>
          </button>
          <button disabled={providersDisabled} onClick={() => void model.signInWith("wiplash")}>
            <KeyRound size={19} /><span>Continue with Wiplash</span>
          </button>
        </div>
        <div className={`modal-cloud-status ${model.cloudStatus}`} role="status" aria-live="polite">
          <span aria-hidden="true" />
          <p>{model.cloudMessage}</p>
        </div>
        <div className="modal-divider"><span>OR USE THIS DEVICE ONLY</span></div>
        <form className="modal-sign-in-form" onSubmit={(event) => void submit(event)}>
          <label htmlFor="modal-account-email">Email for this browser</label>
          <div className="modal-email-field"><Mail size={19} /><input ref={emailInput} id="modal-account-email" type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
          <button disabled={model.busy === "sign-in"}>{model.busy === "sign-in" ? "Working…" : "Continue on this device"}</button>
        </form>
        <div className="modal-security-note"><ShieldCheck size={18} /><p>
          Cloud sign-in uses protected cookies. The device profile stays in this browser. Neither option uploads a project or connects an AI provider by itself.
        </p></div>
        {model.error && <button className="modal-error" onClick={model.clearMessage}>{model.error}<small>Dismiss</small></button>}
        <button className="modal-continue-offline" onClick={onClose}>Keep creating without an account</button>
      </section>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58A8.66 8.66 0 0 0 9 0 9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}
