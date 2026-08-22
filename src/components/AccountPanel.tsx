import { CheckCircle2, CloudOff, CreditCard, HardDrive, LogOut, ShieldCheck, UserRound } from "lucide-react";
import type { AccountConnectionsModel } from "../hooks/use-account-connections";

function storageLabel(bytes: number): string {
  if (bytes < 1024 ** 2) return `${Math.max(0, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(bytes < 10 * 1024 ** 3 ? 1 : 0)} GB`;
}

export function AccountPanel({
  model,
  openSignIn,
  cloudProjectCount = 0,
}: {
  model: AccountConnectionsModel;
  openSignIn: () => void;
  cloudProjectCount?: number;
}) {
  const account = model.snapshot.account;
  const billing = model.snapshot.billing;
  const canSync = billing.cloudAccess === "read_write";

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
              <span className="status-chip">{account.mode === "device" ? "ON THIS DEVICE" : "SIGNED IN"}</span>
              <h3>{account.displayName}</h3>
              <p>{account.email}</p>
            </div>
          </section>
          {account.mode === "authenticated" && (
            <section className={`panel-section billing-summary ${billing.cloudAccess === "download_only" ? "attention" : ""}`}>
              <div className="billing-summary-heading">
                <span><CreditCard size={17} /></span>
                <div><small>CURRENT PLAN</small><strong>{billing.planName}</strong></div>
              </div>
              <div className="billing-storage-row">
                <HardDrive size={16} />
                <span>
                  {billing.storageLimitBytes === null
                    ? `${storageLabel(billing.storageUsedBytes)} used · Unlimited storage`
                    : `${storageLabel(billing.storageUsedBytes)} of ${storageLabel(billing.storageLimitBytes)} used`}
                </span>
              </div>
              {billing.cloudAccess === "download_only" && (
                <p>Your cloud is download-only after three failed payment attempts. Restore billing before {billing.downloadUntil ? new Date(billing.downloadUntil).toLocaleDateString() : "the recovery period ends"} to keep cloud copies.</p>
              )}
              {billing.plan === "creator" ? (
                <a className="secondary-wide billing-action" href="./pricing.html">Upgrade</a>
              ) : billing.portalAvailable ? (
                <button className="secondary-wide billing-action" disabled={Boolean(model.busy)} onClick={() => void model.openBillingPortal()}>Manage billing</button>
              ) : null}
            </section>
          )}
          <section className="panel-section account-setting">
            <div><strong>Project sync</strong><p>Keep artwork, original images, used fonts, thumbnails, revisions, and AI conversations available across your devices.</p></div>
            <label className="switch-row">
              <input
                type="checkbox"
                checked={model.snapshot.syncEnabled}
                disabled={Boolean(model.busy) || model.mode === "device" || !canSync}
                onChange={(event) => void model.setSyncEnabled(event.target.checked)}
              />
              <span>{model.mode === "device" || billing.cloudAccess === "none" ? "Upgrade required" : billing.cloudAccess === "download_only" ? "Download only" : model.snapshot.syncEnabled ? "Enabled" : "Off"}</span>
            </label>
          </section>
          <section className="panel-section account-facts">
            <div><CheckCircle2 size={16} /><span><strong>{cloudProjectCount}</strong> cloud project{cloudProjectCount === 1 ? "" : "s"}</span></div>
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
          <button className="account-sign-in-button" onClick={openSignIn}>Sign in to GlassWare</button>
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
