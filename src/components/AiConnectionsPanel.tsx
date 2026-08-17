import { useMemo, useState, type FormEvent } from "react";
import {
  Bot,
  Cpu,
  LoaderCircle,
  Play,
  PlugZap,
  RotateCcw,
  Settings2,
  Sparkles,
} from "lucide-react";
import {
  AI_MODEL_CATALOG,
  AI_REASONING_EFFORTS,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_REASONING_EFFORT,
  type AiModelId,
  type AiReasoningEffort,
} from "../lib/account-connections";
import type { AccountConnectionsModel } from "../hooks/use-account-connections";
import type { GlassWareProject } from "../lib/model";

export function AiConnectionsPanel({
  model,
  project,
  openSettings,
}: {
  model: AccountConnectionsModel;
  project: GlassWareProject;
  openSettings: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [selectedModel, setSelectedModel] = useState<AiModelId>(DEFAULT_AI_MODEL);
  const [reasoningEffort, setReasoningEffort] = useState<AiReasoningEffort>(DEFAULT_AI_REASONING_EFFORT);
  const activeConnectionId = useMemo(
    () => model.snapshot.connections.some((connection) => connection.id === selectedConnectionId)
      ? selectedConnectionId
      : model.snapshot.connections[0]?.id ?? "",
    [model.snapshot.connections, selectedConnectionId],
  );
  const runtimeReady = model.snapshot.aiRuntime.available;
  const isRunning = model.busy === "ai-job" || Boolean(model.aiJob && ["queued", "running"].includes(model.aiJob.status));

  function submitPrompt(event: FormEvent) {
    event.preventDefault();
    if (!activeConnectionId || !prompt.trim()) return;
    void model.runAi(activeConnectionId, prompt.trim(), project, selectedModel, reasoningEffort);
  }

  return (
    <>
      <div className="panel-heading"><p>PRIVATE AI WORKSPACE</p><h1>Ask AI</h1></div>
      <div className="ai-principle"><Sparkles size={23} /><div><strong>Your canvas stays in charge.</strong><p>Your AI works in an isolated workspace and returns a plan. Nothing changes until you review it.</p></div></div>
      <div className={`ai-runtime-status ${runtimeReady ? "ready" : "unavailable"}`}>
        <span />
        <div><strong>{runtimeReady ? "AI workspace ready" : "AI workspace unavailable"}</strong><p>{model.snapshot.aiRuntime.message}</p></div>
      </div>

      {!model.snapshot.account ? (
        <div className="ai-empty-state ai-connect-state"><span><PlugZap size={21} /></span><strong>Connect your AI</strong><p>Choose ChatGPT, an API key, or give the GlassWare skill to another agent. Sign-in is only required for stored connections.</p><button type="button" onClick={openSettings}>Choose connection</button></div>
      ) : model.snapshot.connections.length === 0 ? (
        <div className="ai-empty-state ai-connect-state"><span><PlugZap size={21} /></span><strong>Connect your AI</strong><p>Choose ChatGPT, an API key, or give the GlassWare skill to another agent. More providers can join this connection center later.</p><button type="button" onClick={openSettings}>Choose connection</button></div>
      ) : (
        <>
          <section className="ai-connection-summary">
            <div>
              <span><Cpu size={17} /></span>
              <div><small>AI CONNECTIONS</small><strong>{model.snapshot.connections.length} ready</strong></div>
            </div>
            <button type="button" onClick={openSettings} title="Manage AI connections"><Settings2 size={16} /> Manage connections</button>
          </section>
          <form className="ai-request" onSubmit={submitPrompt}>
            <div className="section-label"><span>Creative direction</span><small>PLAN ONLY</small></div>
            <label htmlFor="glassware-ai-prompt">What should GlassWare create?</label>
            <textarea
              id="glassware-ai-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              maxLength={4000}
              rows={5}
              placeholder="Create a bold birthday invitation with playful type, confetti shapes, and a clear place for the party details."
              disabled={isRunning}
            />
            <label htmlFor="glassware-ai-connection">Connection</label>
            <select id="glassware-ai-connection" value={activeConnectionId} onChange={(event) => setSelectedConnectionId(event.target.value)} disabled={isRunning}>
              {model.snapshot.connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.label}</option>)}
            </select>
            <div className="ai-run-settings">
              <label htmlFor="glassware-ai-model">Model<select id="glassware-ai-model" value={selectedModel} onChange={(event) => setSelectedModel(event.target.value as AiModelId)} disabled={isRunning}>
                {AI_MODEL_CATALOG.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </select><small>{AI_MODEL_CATALOG.find((entry) => entry.id === selectedModel)?.detail}</small></label>
              <label htmlFor="glassware-ai-reasoning">Reasoning<select id="glassware-ai-reasoning" value={reasoningEffort} onChange={(event) => setReasoningEffort(event.target.value as AiReasoningEffort)} disabled={isRunning}>
                {AI_REASONING_EFFORTS.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </select><small>Medium is the balanced default.</small></label>
            </div>
            <button className="run-ai-button" type="submit" disabled={!prompt.trim() || !activeConnectionId || isRunning}>
              {isRunning ? <LoaderCircle className="spin" size={17} /> : <Play size={17} />}
              {isRunning ? "Codex is planning…" : "Create edit plan"}
            </button>
          </form>
        </>
      )}

      {model.aiJob && (
        <section className={`ai-job-result ${model.aiJob.status}`}>
          <div><strong>{model.aiJob.plan?.summary ?? (model.aiJob.status === "failed" ? "Plan failed" : "Codex is working")}</strong><small>{model.aiJob.status.toUpperCase()}</small></div>
          <p className="ai-job-model">{model.aiJob.model} · {model.aiJob.reasoningEffort} reasoning</p>
          {model.aiJob.plan && (
            <>
              <p>{model.aiJob.plan.rationale}</p>
              <ol>{model.aiJob.plan.operations.map((operation, index) => <li key={`${operation.action}-${index}`}><span>{index + 1}</span>{operation.label}</li>)}</ol>
            </>
          )}
          {model.aiJob.error && <p>{model.aiJob.error}</p>}
          {!['queued', 'running'].includes(model.aiJob.status) && <button type="button" onClick={model.clearAiJob}><RotateCcw size={15} /> New request</button>}
        </section>
      )}

      <div className="panel-section ai-note"><Bot size={22} /><div><strong>No bundled AI surcharge</strong><p>ChatGPT subscription access and separately billed API access remain distinct.</p></div></div>
      {(model.notice || model.error) && (
        <button className={`panel-message ${model.error ? "error" : "success"}`} onClick={model.clearMessage}>
          {model.error || model.notice}<small>Dismiss</small>
        </button>
      )}
    </>
  );
}
