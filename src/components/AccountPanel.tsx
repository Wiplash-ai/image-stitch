import { useState, type FormEvent } from "react";
import { CheckCircle2, CloudOff, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import type { AccountConnectionsModel } from "../hooks/use-account-connections";

export function AccountPanel({ model }: { model: AccountConnectionsModel }) {
  const [email, setEmail] = useState("");
  const account = model.snapshot.account;

  async function submit(event: FormEvent) {
    event.preventDefault();
    await model.signIn(email);
  }

  return (
    <>
      <div className="panel-heading"><p>OPTIONAL IDENTITY</p><h1>Account</h1></div>
      {model.loading ? (
        <div className="account-loading">Checking account status…</div>
      ) : account ? (
        <>
          <section className="account-card">
            <span className="account-avatar"><UserRound size={22} /></span>
            <div>
              <span className="status-chip">{account.mode === "preview" ? "LOCAL PREVIEW" : "SIGNED IN"}</span>
              <h3>{account.displayName}</h3>
              <p>{account.email}</p>
            </div>
          </section>
          <section className="panel-section account-setting">
            <div><strong>Project sync</strong><p>Local projects are never uploaded merely because you signed in.</p></div>
            <label className="switch-row">
              <input
                type="checkbox"
                checked={model.snapshot.syncEnabled}
                disabled={Boolean(model.busy)}
                onChange={(event) => void model.setSyncEnabled(event.target.checked)}
              />
              <span>{model.snapshot.syncEnabled ? "Enabled" : "Off"}</span>
            </label>
          </section>
          <section className="panel-section account-facts">
            <div><CheckCircle2 size={16} /><span><strong>{model.snapshot.connections.length}</strong> AI connection{model.snapshot.connections.length === 1 ? "" : "s"}</span></div>
            <div><ShieldCheck size={16} /><span>Session cookies and provider secrets stay outside project files.</span></div>
          </section>
          <button className="secondary-wide" disabled={Boolean(model.busy)} onClick={() => void model.signOut()}><LogOut size={16} /> Sign out</button>
        </>
      ) : (
        <>
          <section className="account-intro">
            <CloudOff size={25} />
            <h3>Keep creating without an account.</h3>
            <p>Sign in only when you want optional sync, a ChatGPT/Codex plugin connection, or an encrypted API-key vault.</p>
          </section>
          <form className="sign-in-form" onSubmit={(event) => void submit(event)}>
            <label htmlFor="account-email">Email address</label>
            <div><Mail size={16} /><input id="account-email" type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
            <button disabled={model.busy === "sign-in"}>{model.mode === "local-preview" ? "Preview sign in" : "Email me a sign-in link"}</button>
          </form>
          {model.mode === "local-preview" && (
            <div className="preview-disclosure"><strong>Local development preview</strong><p>This exercises the account and connection interface on this device. It sends no email, creates no remote account, and cannot access OpenAI.</p></div>
          )}
        </>
      )}
      {(model.notice || model.error) && (
        <button className={`panel-message ${model.error ? "error" : "success"}`} onClick={model.clearMessage}>
          {model.error || model.notice}<small>Dismiss</small>
        </button>
      )}
    </>
  );
}
