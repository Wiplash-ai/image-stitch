import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileCode2,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Unplug,
  X,
} from "lucide-react";
import { AI_CONNECTION_CATALOG, type AiConnectionKind } from "../lib/account-connections";
import type { AccountConnectionsModel } from "../hooks/use-account-connections";
import type { GlassWareProject } from "../lib/model";

type AiSettingsTab = "chatgpt" | "api" | "skill";
const OPENAI_API_KEYS_URL = "https://platform.openai.com/api-keys";
const GITHUB_SKILL_URL = "https://github.com/Wiplash-ai/glassware/blob/main/public/skills/glassware-create/SKILL.md";
const RAW_GITHUB_SKILL_URL = "https://raw.githubusercontent.com/Wiplash-ai/glassware/main/public/skills/glassware-create/SKILL.md";

const TAB_DEFINITIONS = [
  { id: "chatgpt", label: "ChatGPT", icon: null },
  { id: "api", label: "API key", icon: KeyRound },
  { id: "skill", label: "Use your AI", icon: FileCode2 },
] as const satisfies ReadonlyArray<{ id: AiSettingsTab; label: string; icon: typeof KeyRound | null }>;

function definition(kind: AiConnectionKind) {
  return AI_CONNECTION_CATALOG.find((entry) => entry.kind === kind)!;
}

export function AiSettingsModal({
  model,
  project,
  open,
  onClose,
  openAccount,
}: {
  model: AccountConnectionsModel;
  project: GlassWareProject;
  open: boolean;
  onClose: () => void;
  openAccount: () => void;
}) {
  const firstTab = useRef<HTMLButtonElement>(null);
  const [activeTab, setActiveTab] = useState<AiSettingsTab>("chatgpt");
  const [apiKey, setApiKey] = useState("");
  const [copied, setCopied] = useState<"code" | "skill" | null>(null);
  const runtimeReady = model.snapshot.aiRuntime.available;
  const chatGpt = model.snapshot.connections.find((item) => item.kind === "chatgpt_codex_plugin");
  const openAiApi = model.snapshot.connections.find((item) => item.kind === "openai_api");

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => firstTab.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !model.busy) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, model.busy, onClose]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!open) return null;

  function requireAccount() {
    onClose();
    openAccount();
  }

  async function copy(value: string, kind: "code" | "skill") {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
  }

  async function submitApiKey(event: FormEvent) {
    event.preventDefault();
    if (!apiKey.trim()) return;
    const connected = await model.connectApiKey(apiKey.trim(), project.id);
    if (connected) setApiKey("");
  }

  const chatDefinition = definition("chatgpt_codex_plugin");
  const apiDefinition = definition("openai_api");

  return (
    <div className="modal-backdrop ai-settings-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !model.busy && onClose()}>
      <section className="ai-settings-modal" role="dialog" aria-modal="true" aria-labelledby="ai-settings-title">
        <header>
          <div className="ai-settings-heading"><div className="modal-brand"><img src="./glassware-mark.svg" alt="" /><span>GlassWare</span></div><div><small>YOUR AI CONNECTIONS</small><h2 id="ai-settings-title">Connect your AI</h2></div></div>
          <div className={`ai-settings-runtime ${runtimeReady ? "ready" : "unavailable"}`}><span />{runtimeReady ? "AI workspace ready" : "AI workspace unavailable"}</div>
          <button className="modal-close" title="Close AI settings" aria-label="Close AI settings" disabled={Boolean(model.busy)} onClick={onClose}><X size={19} /></button>
        </header>

        <nav className="ai-settings-tabs" role="tablist" aria-label="AI connection methods">
          {TAB_DEFINITIONS.map((tab, index) => {
            const Icon = tab.icon;
            return <button ref={index === 0 ? firstTab : undefined} key={tab.id} role="tab" aria-selected={activeTab === tab.id} aria-controls={`ai-settings-${tab.id}`} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>{Icon ? <Icon size={17} /> : <img className="openai-provider-mark" src="./openai-blossom-white.svg" alt="" />}{tab.label}</button>;
          })}
        </nav>

        <div className="ai-settings-body">
          {activeTab === "chatgpt" && (
            <section id="ai-settings-chatgpt" role="tabpanel" className="ai-provider-pane">
              <div className="ai-provider-intro"><span><img className="openai-provider-mark" src="./openai-blossom-white.svg" alt="" /></span><div><small>{chatDefinition.eyebrow}</small><h3>{chatDefinition.name}</h3><p>Use the Codex access included with an eligible ChatGPT subscription through OpenAI's one-time device sign-in.</p></div></div>
              <div className="ai-provider-security"><LockKeyhole size={17} /><p>GlassWare stores the resulting Codex authorization encrypted in the private runner. It never asks for ChatGPT cookies or your password, and you can disconnect and remove the authorization whenever you want.</p></div>
              {chatGpt ? (
                <div className="ai-connected-card"><div><CheckCircle2 size={20} /><span><strong>Connected</strong><small>{chatGpt.label}</small></span></div><button disabled={Boolean(model.busy)} onClick={() => void model.disconnect(chatGpt.id)}><Unplug size={16} /> Disconnect</button></div>
              ) : !model.snapshot.account ? (
                <button className="ai-modal-primary" onClick={requireAccount}>Sign in to GlassWare first</button>
              ) : (
                <button className="ai-modal-primary" disabled={Boolean(model.busy) || !runtimeReady} onClick={() => void model.connectChatGpt(project.id)}>{model.busy === "connect-chatgpt_codex_plugin" ? "Starting secure sign-in…" : "Connect ChatGPT"}</button>
              )}
              {model.deviceAuthorization && !chatGpt && (
                <div className="device-authorization modal-device-authorization">
                  <strong>{model.deviceAuthorization.status === "waiting" ? "Complete OpenAI sign-in" : "Preparing secure sign-in…"}</strong>
                  {model.deviceAuthorization.userCode && <code>{model.deviceAuthorization.userCode}</code>}
                  <div>
                    {model.deviceAuthorization.verificationUrl && <a href={model.deviceAuthorization.verificationUrl} target="_blank" rel="noreferrer">Open OpenAI <ExternalLink size={14} /></a>}
                    {model.deviceAuthorization.userCode && <button type="button" onClick={() => void copy(model.deviceAuthorization?.userCode ?? "", "code")}>{copied === "code" ? <Check size={14} /> : <Copy size={14} />}{copied === "code" ? "Copied" : "Copy code"}</button>}
                  </div>
                  <p>Keep this window open. GlassWare detects the connection automatically.</p>
                </div>
              )}
            </section>
          )}

          {activeTab === "api" && (
            <section id="ai-settings-api" role="tabpanel" className="ai-provider-pane">
              <div className="ai-provider-intro"><span><KeyRound size={23} /></span><div><small>{apiDefinition.eyebrow}</small><h3>{apiDefinition.name}</h3><p>Use separately billed OpenAI Platform access. Availability and usage limits follow the API project that owns the key.</p></div></div>
              <div className="ai-provider-security"><ShieldCheck size={17} /><p>The key is validated once, encrypted server-side, and never saved in browser storage or a GlassWare project. You can disconnect and remove it from GlassWare whenever you want.</p></div>
              <a className="api-key-create-link" href={OPENAI_API_KEYS_URL} target="_blank" rel="noreferrer">Create or manage an OpenAI API key <ExternalLink size={15} /></a>
              {openAiApi ? (
                <div className="ai-connected-card"><div><CheckCircle2 size={20} /><span><strong>Connected</strong><small>{openAiApi.label}</small></span></div><button disabled={Boolean(model.busy)} onClick={() => void model.disconnect(openAiApi.id)}><Unplug size={16} /> Disconnect</button></div>
              ) : !model.snapshot.account ? (
                <button className="ai-modal-primary" onClick={requireAccount}>Sign in to GlassWare first</button>
              ) : (
                <form className="api-key-form modal-api-key-form" onSubmit={submitApiKey}>
                  <label htmlFor="glassware-openai-api-key">OpenAI API key</label>
                  <input id="glassware-openai-api-key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" spellCheck={false} placeholder="sk-…" disabled={Boolean(model.busy)} />
                  <p>GlassWare sends this value once over HTTPS to the encrypted vault. The field clears after a successful connection.</p>
                  <button type="submit" disabled={Boolean(model.busy) || !runtimeReady || !apiKey.trim()}>{model.busy === "connect-openai_api" ? "Validating and encrypting…" : "Save API key securely"}</button>
                </form>
              )}
            </section>
          )}

          {activeTab === "skill" && (
            <section id="ai-settings-skill" role="tabpanel" className="ai-skill-pane">
              <div className="ai-provider-intro"><span><FileCode2 size={23} /></span><div><small>BRING YOUR OWN AGENT</small><h3>Use any AI that can read a skill</h3><p>Give your agent this public instruction file. It can create or revise a portable GlassWare project for you to import—without connecting that agent to your GlassWare account.</p></div></div>
              <div className="skill-link-box"><label htmlFor="glassware-skill-url">GlassWare SKILL.md on GitHub</label><div><input id="glassware-skill-url" readOnly value={RAW_GITHUB_SKILL_URL} onFocus={(event) => event.currentTarget.select()} /><button type="button" onClick={() => void copy(RAW_GITHUB_SKILL_URL, "skill")}>{copied === "skill" ? <Check size={16} /> : <Copy size={16} />}{copied === "skill" ? "Copied" : "Copy link"}</button></div><a href={GITHUB_SKILL_URL} target="_blank" rel="noreferrer">View the skill on GitHub <ExternalLink size={14} /></a></div>
              <ol className="skill-steps"><li><span>1</span><div><strong>Copy the link</strong><p>Paste it into Codex, Claude, Gemini, or another agent that can open public URLs.</p></div></li><li><span>2</span><div><strong>Describe the design</strong><p>Ask for a poster, invitation, social graphic, composition, or edits to an existing GlassWare file.</p></div></li><li><span>3</span><div><strong>Import the result</strong><p>Open the returned <code>.glassware.json</code> file from the Files panel and keep editing locally.</p></div></li></ol>
              <div className="ai-provider-security"><ShieldCheck size={17} /><p>The skill contains the portable project contract—not credentials, private APIs, or access to your account.</p></div>
            </section>
          )}
        </div>

        {(model.notice || model.error) && <button className={`modal-ai-message ${model.error ? "error" : "success"}`} onClick={model.clearMessage}>{model.error || model.notice}<small>Dismiss</small></button>}
        <footer><LockKeyhole size={15} /><span>Provider credentials stay outside project files and browser storage. Disconnect and remove them whenever you want.</span><button type="button" onClick={onClose}>Done</button></footer>
      </section>
    </div>
  );
}
