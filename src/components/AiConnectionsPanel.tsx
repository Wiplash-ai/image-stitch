import { Bot, CheckCircle2, KeyRound, Link2, LockKeyhole, Sparkles, Unplug } from "lucide-react";
import { AI_CONNECTION_CATALOG, type AiConnectionKind } from "../lib/account-connections";
import type { AccountConnectionsModel } from "../hooks/use-account-connections";

const ICONS: Record<AiConnectionKind, typeof Link2> = {
  chatgpt_codex_plugin: Link2,
  openai_api: KeyRound,
};

export function AiConnectionsPanel({
  model,
  projectId,
  openAccount,
}: {
  model: AccountConnectionsModel;
  projectId: string;
  openAccount: () => void;
}) {
  const account = model.snapshot.account;

  return (
    <>
      <div className="panel-heading"><p>REVIEWABLE ASSISTANT</p><h1>Ask AI</h1></div>
      <div className="ai-principle"><Sparkles size={23} /><div><strong>Your canvas stays in charge.</strong><p>Connections can propose edit plans. Applying changes will remain a separate, reviewable action.</p></div></div>
      <div className="connection-list">
        {AI_CONNECTION_CATALOG.map((definition) => {
          const connection = model.snapshot.connections.find((item) => item.kind === definition.kind);
          const Icon = ICONS[definition.kind];
          const busy = model.busy === `connect-${definition.kind}` || model.busy === `disconnect-${connection?.id}`;
          return (
            <article className={`connection-card ${connection ? "connected" : ""}`} key={definition.kind}>
              <div className="connection-title">
                <span><Icon size={18} /></span>
                <div><small>{definition.eyebrow}</small><h3>{definition.name}</h3></div>
              </div>
              <p>{definition.description}</p>
              <div className="connection-detail"><LockKeyhole size={13} />{definition.detail}</div>
              {connection ? (
                <>
                  <div className="connection-status"><CheckCircle2 size={14} /><span>{connection.status === "attention" ? "Needs attention" : "Connected"}</span><small>{connection.label}</small></div>
                  <button className="disconnect-button" disabled={busy} onClick={() => void model.disconnect(connection.id)}><Unplug size={14} /> Disconnect</button>
                </>
              ) : account ? (
                <button className="connect-button" title={model.mode === "device" ? "Cloud account service required" : `Connect ${definition.name}`} disabled={busy || model.mode === "device"} onClick={() => void model.connect(definition.kind, projectId)}>
                  {model.mode === "device" ? "Cloud connection required" : "Connect securely"}
                </button>
              ) : (
                <button className="connect-button" onClick={openAccount}>Sign in to connect</button>
              )}
            </article>
          );
        })}
      </div>
      <div className="panel-section ai-note"><Bot size={20} /><div><strong>No bundled AI surcharge</strong><p>ChatGPT/Codex subscription access and separately billed API access are distinct. ImageStitch never converts one into the other.</p></div></div>
      {(model.notice || model.error) && (
        <button className={`panel-message ${model.error ? "error" : "success"}`} onClick={model.clearMessage}>
          {model.error || model.notice}<small>Dismiss</small>
        </button>
      )}
    </>
  );
}
