import { useEffect, useRef } from "react";
import { X } from "lucide-react";
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
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      closeButton.current?.focus();
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

  const providersDisabled = Boolean(model.busy) || model.cloudStatus === "checking";

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !model.busy && onClose()}>
      <section className="sign-in-modal" role="dialog" aria-modal="true" aria-labelledby="sign-in-title">
        <header>
          <div className="modal-brand"><img src="./glassware-mark.svg" alt="" /><span>GlassWare</span></div>
          <button ref={closeButton} className="modal-close" title="Close sign in" aria-label="Close sign in" disabled={Boolean(model.busy)} onClick={onClose}><X size={18} /></button>
        </header>
        <div className="modal-copy">
          <p>GLASSWARE ACCOUNT</p>
          <h2 id="sign-in-title">Sign in or create an account</h2>
        </div>
        <div className="modal-provider-list" aria-label="Sign-in methods">
          <button className="modal-wiplash-provider" disabled={providersDisabled} onClick={() => void model.signInWith("wiplash")}>
            <WiplashMark />
            <span className="modal-provider-copy"><strong>Continue with Wiplash.ai</strong><small>Choose Google, GitHub, GitLab, or use your existing session</small></span>
          </button>
        </div>
        {model.cloudStatus !== "available" && <div className={`modal-cloud-status ${model.cloudStatus}`} role="status" aria-live="polite">
          <span aria-hidden="true" />
          <p>{model.cloudMessage}</p>
        </div>}
        {model.error && <button className="modal-error" onClick={model.clearMessage}>{model.error}<small>Dismiss</small></button>}
        <button className="modal-continue-offline" onClick={onClose}>Keep creating without an account</button>
      </section>
    </div>
  );
}

function WiplashMark() {
  return <img className="modal-wiplash-mark" src="./wiplash-circle-favicon-black-outline-shadow-small-darkest-wip.svg" alt="" aria-hidden="true" />;
}
