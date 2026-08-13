import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Mail, ShieldCheck, X } from "lucide-react";
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
  const [sentTo, setSentTo] = useState("");

  useEffect(() => {
    if (!open) return;
    setSentTo("");
    const frame = requestAnimationFrame(() => emailInput.current?.focus());
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
    if (result === "email-sent") setSentTo(email.trim().toLowerCase());
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !model.busy && onClose()}>
      <section className="sign-in-modal" role="dialog" aria-modal="true" aria-labelledby="sign-in-title">
        <header>
          <div className="modal-brand"><img src="./image-stitch-mark.svg" alt="" /><span>ImageStitch</span></div>
          <button className="modal-close" title="Close sign in" aria-label="Close sign in" disabled={Boolean(model.busy)} onClick={onClose}><X size={18} /></button>
        </header>
        {sentTo ? (
          <div className="sign-in-success">
            <span><CheckCircle2 size={28} /></span>
            <h2 id="sign-in-title">Check your inbox</h2>
            <p>We sent a secure sign-in link to <strong>{sentTo}</strong>. You can close this window while you wait.</p>
            <button onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <div className="modal-copy">
              <p>{model.mode === "service" ? "WELCOME BACK" : "YOUR IMAGESTITCH PROFILE"}</p>
              <h2 id="sign-in-title">{model.mode === "service" ? "Sign in to ImageStitch" : "Make this editor yours"}</h2>
              <span>{model.mode === "service"
                ? "Enter your email and we’ll send you a secure sign-in link—no password needed."
                : "Use your email to personalize ImageStitch in this browser while cloud accounts are being connected."}</span>
            </div>
            <form className="modal-sign-in-form" onSubmit={(event) => void submit(event)}>
              <label htmlFor="modal-account-email">Email address</label>
              <div><Mail size={17} /><input ref={emailInput} id="modal-account-email" type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
              <button disabled={model.busy === "sign-in"}>{model.busy === "sign-in" ? "Working…" : model.mode === "service" ? "Email me a sign-in link" : "Continue on this device"}</button>
            </form>
            <div className="modal-security-note"><ShieldCheck size={16} /><p>{model.mode === "service"
              ? "Secure sessions use protected cookies. Signing in never uploads a project or connects an AI provider by itself."
              : "This device profile stays in this browser. Cloud sync and provider connections remain unavailable until the account service is connected."}</p></div>
            {model.error && <button className="modal-error" onClick={model.clearMessage}>{model.error}<small>Dismiss</small></button>}
            <button className="modal-continue-offline" onClick={onClose}>Keep creating without an account</button>
          </>
        )}
      </section>
    </div>
  );
}
