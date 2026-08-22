import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  Cloud,
  CloudOff,
  Cpu,
  FileText,
  GripHorizontal,
  History,
  Image as ImageIcon,
  LoaderCircle,
  Maximize2,
  MessageSquarePlus,
  Minus,
  Paperclip,
  Redo2,
  Settings2,
  Square,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import {
  AI_MODEL_CATALOG,
  AI_REASONING_EFFORTS,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_REASONING_EFFORT,
  type AiAttachment,
  type AiModelId,
  type AiReasoningEffort,
  type CloudAiConversation,
} from "../lib/account-connections";
import type { AccountConnectionsModel } from "../hooks/use-account-connections";
import {
  deleteAiConversation,
  listAllAiConversations,
  saveAiConversation,
  type StoredAiConversation,
  type StoredAiConversationMessage,
  type StoredAiPassReceipt,
} from "../lib/storage";

const MAX_USER_ATTACHMENTS = 4;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 12 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml",
  "text/plain", "text/markdown", "application/json", "text/csv",
]);
const POSITION_STORAGE_KEY = "glassware.ai-widget-position.v1";

export interface AiAgentRequest {
  connectionId: string;
  prompt: string;
  model: AiModelId;
  reasoningEffort: AiReasoningEffort;
  attachments: AiAttachment[];
  agentSessionId?: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface AiAgentProgress {
  pass: number;
  maxPasses: number;
  phase: "thinking" | "applying" | "inspecting";
  message: string;
}

export interface AiAgentReceipt {
  summary: string;
  assessment: string;
  passCount: number;
  appliedCount: number;
  skippedCount: number;
  generatedImageCount: number;
  importedImageCount: number;
  sourcedImageCount: number;
  revisionNumber: number | null;
  agentSessionId?: string;
  qualitySummary: string;
  receipts: StoredAiPassReceipt[];
  usage: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
  };
}

type ChatMessage = StoredAiConversationMessage;

interface LocalAttachment extends AiAttachment {
  size: number;
  image: boolean;
}

interface AiDropdownOption<T extends string> {
  value: T;
  label: string;
  detail?: string;
}

function AiDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  leading,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<AiDropdownOption<T>>;
  onChange: (value: T) => void;
  disabled?: boolean;
  leading?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className={`ai-custom-select ${open ? "open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="ai-custom-select-trigger"
        title={label}
        aria-label={`${label}: ${selected?.label ?? value}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {leading}
        <span>{selected?.label ?? value}</span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="ai-custom-select-menu" id={listboxId} role="listbox" aria-label={label}>
          <small>{label}</small>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={option.value === value ? "selected" : ""}
              onClick={() => { onChange(option.value); setOpen(false); }}
            >
              <span><strong>{option.label}</strong>{option.detail && <small>{option.detail}</small>}</span>
              {option.value === value && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Unable to read that file."));
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read that file."));
    reader.readAsDataURL(file);
  });
}

function initialPosition() {
  try {
    const parsed = JSON.parse(localStorage.getItem(POSITION_STORAGE_KEY) || "null");
    if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) return { x: parsed.x, y: parsed.y };
  } catch {
    // A stored widget position is only a convenience.
  }
  return { x: Math.max(405, window.innerWidth - 860), y: 86 };
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function titleForPrompt(prompt: string) {
  const title = prompt.replace(/\s+/g, " ").trim();
  return title.length > 58 ? `${title.slice(0, 57).trimEnd()}…` : title;
}

function formatConversationDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Saved conversation" : new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(date);
}

function storedFromCloud(conversation: CloudAiConversation, accountId: string, local?: StoredAiConversation): StoredAiConversation {
  return {
    ...conversation,
    accountId,
    ...(local?.updatedAt === conversation.updatedAt && local.agentSessionId ? { agentSessionId: local.agentSessionId } : {}),
  };
}

function cloudFromStored(conversation: StoredAiConversation, fallbackProjectName: string): CloudAiConversation {
  return {
    id: conversation.id,
    projectId: conversation.projectId,
    projectName: conversation.projectName || fallbackProjectName,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messages: conversation.messages.filter((message) => message.status !== "running").map((message) => ({
      ...message,
      status: message.status === "running" ? "failed" : message.status,
    })),
    ...(conversation.connectionId ? { connectionId: conversation.connectionId } : {}),
    ...(conversation.model ? { model: conversation.model } : {}),
    ...(conversation.reasoningEffort ? { reasoningEffort: conversation.reasoningEffort } : {}),
  };
}

export function AiConnectionsPanel({
  projectId,
  projectName,
  model,
  openSettings,
  onRunAgent,
  onUndoAi,
  onRedoAi,
  canUndoAi,
  canRedoAi,
  onClose,
}: {
  projectId: string;
  projectName: string;
  model: AccountConnectionsModel;
  openSettings: () => void;
  onRunAgent: (request: AiAgentRequest, onProgress: (progress: AiAgentProgress) => void, signal: AbortSignal) => Promise<AiAgentReceipt>;
  onUndoAi: () => void;
  onRedoAi: () => void;
  canUndoAi: boolean;
  canRedoAi: boolean;
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [selectedModel, setSelectedModel] = useState<AiModelId>(DEFAULT_AI_MODEL);
  const [reasoningEffort, setReasoningEffort] = useState<AiReasoningEffort>(DEFAULT_AI_REASONING_EFFORT);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>(() => crypto.randomUUID());
  const [conversationTitle, setConversationTitle] = useState("New conversation");
  const [conversationCreatedAt, setConversationCreatedAt] = useState(() => new Date().toISOString());
  const [conversationProjectId, setConversationProjectId] = useState(projectId);
  const [conversationProjectName, setConversationProjectName] = useState(projectName);
  const [agentSessionId, setAgentSessionId] = useState<string>();
  const [conversationHistory, setConversationHistory] = useState<StoredAiConversation[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<"local" | "syncing" | "synced" | "retrying">("local");
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const runAbortRef = useRef<AbortController | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const threadRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const conversationSaveVersionRef = useRef(0);
  const suppressNextSaveRef = useRef(false);
  const accountId = model.snapshot.account?.mode === "authenticated" ? model.snapshot.account.id : "";
  const canReadCloudHistory = Boolean(accountId) && model.snapshot.billing.cloudAccess !== "none";
  const canWriteCloudHistory = Boolean(accountId) && model.snapshot.billing.cloudAccess === "read_write";
  const conversationReadOnly = conversationProjectId !== projectId;

  function visibleConversations(conversations: StoredAiConversation[]) {
    if (!accountId) return conversations.filter((conversation) => !conversation.accountId);
    return conversations.filter((conversation) => conversation.accountId === accountId || (!conversation.accountId && conversation.projectId === projectId));
  }
  const activeConnectionId = useMemo(
    () => model.snapshot.connections.some((connection) => connection.id === selectedConnectionId)
      ? selectedConnectionId
      : model.snapshot.connections[0]?.id ?? "",
    [model.snapshot.connections, selectedConnectionId],
  );
  const activeConnection = model.snapshot.connections.find((connection) => connection.id === activeConnectionId);
  const runtimeReady = model.snapshot.aiRuntime.available;
  const connectionOptions = useMemo(() => model.snapshot.connections.map((connection) => ({
    value: connection.id,
    label: connection.label,
    detail: connection.kind === "openai_api" ? "Inspect and generate images" : "Inspect images with ChatGPT",
  })), [model.snapshot.connections]);
  const modelOptions = useMemo(() => AI_MODEL_CATALOG.map((entry) => ({
    value: entry.id,
    label: entry.name.replace("GPT-5.6 ", ""),
    detail: entry.detail,
  })), []);
  const reasoningOptions = useMemo(() => AI_REASONING_EFFORTS.map((entry) => ({
    value: entry.id,
    label: entry.name,
    detail: entry.id === "low" ? "Fast, focused creative work" : `${entry.name} deliberation`,
  })), []);

  useEffect(() => {
    let cancelled = false;
    setConversationLoaded(false);
    void (async () => {
      let local = visibleConversations(await listAllAiConversations());
      if (canReadCloudHistory) {
        setCloudSyncStatus("syncing");
        try {
          for (const conversation of local) {
            if (conversation.accountId) continue;
            conversation.accountId = accountId;
            conversation.projectName ||= conversation.projectId === projectId ? projectName : "GlassWare project";
            await saveAiConversation(conversation);
          }
          const remote = await model.listCloudAiConversations();
          const byId = new Map(local.map((conversation) => [conversation.id, conversation]));
          for (const cloudConversation of remote) {
            const localConversation = byId.get(cloudConversation.id);
            if (!localConversation || cloudConversation.updatedAt > localConversation.updatedAt) {
              const stored = storedFromCloud(cloudConversation, accountId, localConversation);
              await saveAiConversation(stored);
              byId.set(stored.id, stored);
            } else if (canWriteCloudHistory && localConversation.updatedAt > cloudConversation.updatedAt && !localConversation.messages.some((message) => message.status === "running")) {
              const receipt = await model.saveCloudAiConversation(cloudFromStored(
                localConversation,
                localConversation.projectId === projectId ? projectName : localConversation.projectName || "GlassWare project",
              ));
              const stored = storedFromCloud(receipt.conversation, accountId, receipt.status === "kept_remote" ? undefined : localConversation);
              await saveAiConversation(stored);
              byId.set(stored.id, stored);
            }
          }
          const remoteIds = new Set(remote.map((conversation) => conversation.id));
          for (const localConversation of canWriteCloudHistory ? local : []) {
            if (remoteIds.has(localConversation.id) || localConversation.messages.some((message) => message.status === "running")) continue;
            const receipt = await model.saveCloudAiConversation(cloudFromStored(
              localConversation,
              localConversation.projectId === projectId ? projectName : localConversation.projectName || "GlassWare project",
            ));
            const stored = storedFromCloud(receipt.conversation, accountId, receipt.status === "kept_remote" ? undefined : localConversation);
            await saveAiConversation(stored);
            byId.set(stored.id, stored);
          }
          local = [...byId.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
          setCloudSyncStatus("synced");
        } catch {
          setCloudSyncStatus("retrying");
        }
      } else {
        setCloudSyncStatus("local");
      }
      if (cancelled) return;
      setConversationHistory(local);
      const latest = local.find((conversation) => conversation.projectId === projectId);
      if (latest) {
        suppressNextSaveRef.current = true;
        hydrateConversation(latest);
      } else {
        suppressNextSaveRef.current = false;
        resetConversation();
      }
      setConversationLoaded(true);
    })().catch(() => {
      if (!cancelled) setConversationLoaded(true);
    });
    return () => { cancelled = true; };
  }, [projectId, accountId, canReadCloudHistory, canWriteCloudHistory]);

  useEffect(() => {
    if (conversationProjectId === projectId) setConversationProjectName(projectName);
  }, [projectId, projectName, conversationProjectId]);

  useEffect(() => {
    if (!accountId || !canWriteCloudHistory || cloudSyncStatus !== "retrying") return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setCloudSyncStatus("syncing");
        const local = visibleConversations(await listAllAiConversations());
        const remote = await model.listCloudAiConversations();
        const byId = new Map(local.map((conversation) => [conversation.id, conversation]));
        for (const conversation of local) {
          if (conversation.messages.some((message) => message.status === "running")) continue;
          const receipt = await model.saveCloudAiConversation(cloudFromStored(
            conversation,
            conversation.projectId === projectId ? projectName : conversation.projectName || "GlassWare project",
          ));
          const stored = storedFromCloud(receipt.conversation, accountId, receipt.status === "kept_remote" ? undefined : conversation);
          await saveAiConversation(stored);
          byId.set(stored.id, stored);
        }
        for (const conversation of remote) {
          if (byId.has(conversation.id)) continue;
          const stored = storedFromCloud(conversation, accountId);
          await saveAiConversation(stored);
          byId.set(stored.id, stored);
        }
        if (cancelled) return;
        setConversationHistory([...byId.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
        setCloudSyncStatus("synced");
      })().catch(() => {
        if (!cancelled) setCloudSyncStatus("retrying");
      });
    }, 10_000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [accountId, canWriteCloudHistory, cloudSyncStatus, projectId, projectName]);

  useEffect(() => {
    if (!conversationLoaded || messages.length === 0) return;
    if (suppressNextSaveRef.current) {
      suppressNextSaveRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => { void persistConversation(); }, 180);
    return () => window.clearTimeout(timer);
  }, [conversationLoaded, conversationId, conversationTitle, messages, agentSessionId, activeConnectionId, selectedModel, reasoningEffort]);

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!isRunning) return;
    setElapsedSeconds(0);
    const timer = window.setInterval(() => setElapsedSeconds((current) => current + 1), 1_000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      const width = minimized ? 340 : 570;
      setPosition({
        x: Math.max(8, Math.min(window.innerWidth - width - 8, event.clientX - drag.offsetX)),
        y: Math.max(72, Math.min(window.innerHeight - 64, event.clientY - drag.offsetY)),
      });
    };
    const stop = (event: PointerEvent) => {
      if (dragRef.current?.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setPosition((current) => {
        try { localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(current)); } catch { /* best effort */ }
        return current;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [minimized]);

  function startDrag(event: ReactPointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button, select, input, textarea")) return;
    dragRef.current = { pointerId: event.pointerId, offsetX: event.clientX - position.x, offsetY: event.clientY - position.y };
    event.preventDefault();
  }

  function currentConversation(): StoredAiConversation {
    return {
      id: conversationId,
      projectId: conversationProjectId,
      projectName: conversationProjectName,
      ...(accountId ? { accountId } : {}),
      title: conversationTitle,
      createdAt: conversationCreatedAt,
      updatedAt: new Date().toISOString(),
      messages: messages.slice(-60),
      ...(agentSessionId ? { agentSessionId } : {}),
      ...(activeConnectionId ? { connectionId: activeConnectionId } : {}),
      model: selectedModel,
      reasoningEffort,
    };
  }

  async function persistConversation() {
    if (!conversationLoaded || messages.length === 0) return;
    const version = ++conversationSaveVersionRef.current;
    const conversation = currentConversation();
    await saveAiConversation(conversation);
    if (version !== conversationSaveVersionRef.current) return;
    setConversationHistory(visibleConversations(await listAllAiConversations()));
    if (!canWriteCloudHistory || conversation.messages.some((message) => message.status === "running")) return;
    setCloudSyncStatus("syncing");
    try {
      const receipt = await model.saveCloudAiConversation(cloudFromStored(conversation, conversationProjectName));
      const stored = storedFromCloud(receipt.conversation, accountId, receipt.status === "kept_remote" ? undefined : conversation);
      await saveAiConversation(stored);
      if (version !== conversationSaveVersionRef.current) return;
      setConversationHistory(visibleConversations(await listAllAiConversations()));
      setCloudSyncStatus("synced");
    } catch {
      setCloudSyncStatus("retrying");
    }
  }

  function resetConversation() {
    suppressNextSaveRef.current = false;
    const createdAt = new Date().toISOString();
    setConversationId(crypto.randomUUID());
    setConversationProjectId(projectId);
    setConversationProjectName(projectName);
    setConversationTitle("New conversation");
    setConversationCreatedAt(createdAt);
    setAgentSessionId(undefined);
    setMessages([]);
    setAttachments([]);
    setAttachmentError("");
  }

  function startNewConversation() {
    if (isRunning) return;
    resetConversation();
    setHistoryOpen(false);
  }

  function hydrateConversation(conversation: StoredAiConversation) {
    setConversationId(conversation.id);
    setConversationProjectId(conversation.projectId);
    setConversationProjectName(conversation.projectName || (conversation.projectId === projectId ? projectName : "GlassWare project"));
    setConversationTitle(conversation.title);
    setConversationCreatedAt(conversation.createdAt);
    setAgentSessionId(conversation.agentSessionId);
    setMessages(conversation.messages.map((message) => message.status === "running" ? {
      ...message,
      status: "failed",
      content: "That response was interrupted before it finished.",
      detail: "Send another message to continue this conversation.",
    } : message));
    if (conversation.connectionId && model.snapshot.connections.some((connection) => connection.id === conversation.connectionId)) setSelectedConnectionId(conversation.connectionId);
    if (AI_MODEL_CATALOG.some((entry) => entry.id === conversation.model)) setSelectedModel(conversation.model as AiModelId);
    if (AI_REASONING_EFFORTS.some((entry) => entry.id === conversation.reasoningEffort)) setReasoningEffort(conversation.reasoningEffort as AiReasoningEffort);
  }

  function openConversation(conversation: StoredAiConversation) {
    if (isRunning) return;
    if (conversation.id === conversationId) {
      setHistoryOpen(false);
      return;
    }
    suppressNextSaveRef.current = true;
    hydrateConversation(conversation);
    setHistoryOpen(false);
  }

  async function removeConversation(conversation: StoredAiConversation) {
    if (isRunning || !window.confirm(`Delete “${conversation.title}” from your conversation history?`)) return;
    try {
      if (canReadCloudHistory) {
        setCloudSyncStatus("syncing");
        await model.deleteCloudAiConversation(conversation.id);
      }
      await deleteAiConversation(conversation.id);
      const next = visibleConversations(await listAllAiConversations());
      setConversationHistory(next);
      if (conversation.id === conversationId) {
        resetConversation();
      }
      setCloudSyncStatus(canReadCloudHistory ? "synced" : "local");
    } catch {
      setCloudSyncStatus("retrying");
    }
  }

  function closeWidget() {
    if (isRunning) {
      setMinimized(true);
      return;
    }
    void persistConversation();
    onClose();
  }

  async function addFiles(files: FileList | null) {
    setAttachmentError("");
    if (!files?.length) return;
    const incoming = [...files];
    if (attachments.length + incoming.length > MAX_USER_ATTACHMENTS) {
      setAttachmentError(`Attach up to ${MAX_USER_ATTACHMENTS} files at a time.`);
      return;
    }
    if (incoming.some((file) => !ACCEPTED_TYPES.has(file.type))) {
      setAttachmentError("Use PNG, JPEG, WebP, GIF, SVG, Markdown, text, JSON, or CSV files.");
      return;
    }
    if (incoming.some((file) => file.size > MAX_FILE_BYTES)) {
      setAttachmentError("Each attachment must be 5 MB or smaller.");
      return;
    }
    const total = attachments.reduce((sum, attachment) => sum + attachment.size, 0) + incoming.reduce((sum, file) => sum + file.size, 0);
    if (total > MAX_TOTAL_BYTES) {
      setAttachmentError("Attachments must total 12 MB or less.");
      return;
    }
    const next = await Promise.all(incoming.map(async (file): Promise<LocalAttachment> => ({
      id: crypto.randomUUID(),
      name: file.name,
      mimeType: file.type,
      dataUrl: await readAsDataUrl(file),
      size: file.size,
      image: file.type.startsWith("image/"),
    })));
    setAttachments((current) => [...current, ...next]);
  }

  async function submitPrompt(event: FormEvent) {
    event.preventDefault();
    const request = prompt.trim();
    if (!activeConnectionId || !request || isRunning || conversationReadOnly) return;
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(), role: "user", content: request, status: "sent",
      detail: attachments.length ? `${attachments.length} attachment${attachments.length === 1 ? "" : "s"}` : undefined,
      createdAt: new Date().toISOString(),
    };
    const assistantId = crypto.randomUUID();
    setMessages((current) => [...current, userMessage, {
      id: assistantId, role: "assistant", content: "Inspecting the current artboard…", status: "running",
      createdAt: new Date().toISOString(),
    }]);
    if (messages.length === 0) setConversationTitle(titleForPrompt(request));
    setPrompt("");
    setIsRunning(true);
    try {
      const controller = new AbortController();
      runAbortRef.current = controller;
      const receipt = await onRunAgent({
        connectionId: activeConnectionId,
        prompt: request,
        model: selectedModel,
        reasoningEffort,
        attachments: attachments.map(({ size: _size, image: _image, ...attachment }) => attachment),
        agentSessionId,
        conversationHistory: messages
          .filter((message) => message.status !== "running")
          .slice(-14)
          .map(({ role, content }) => ({ role, content })),
      }, (progress) => {
        setMessages((current) => current.map((message) => message.id === assistantId
          ? { ...message, content: progress.message, detail: `Visual step ${progress.pass} of up to ${progress.maxPasses}` }
          : message));
      }, controller.signal);
      setAgentSessionId(receipt.agentSessionId);
      setMessages((current) => current.map((message) => message.id === assistantId ? {
        ...message,
        status: "completed",
        content: receipt.summary,
        detail: receipt.revisionNumber
          ? `${receipt.appliedCount} edits${receipt.generatedImageCount ? ` · ${receipt.generatedImageCount} image generated` : ""}${receipt.importedImageCount ? ` · ${receipt.importedImageCount} attachment added` : ""}${receipt.sourcedImageCount ? ` · ${receipt.sourcedImageCount} open image added` : ""} · ${receipt.passCount} visual pass${receipt.passCount === 1 ? "" : "es"} · ${(receipt.usage.inputTokens + receipt.usage.outputTokens).toLocaleString()} tokens · revision ${receipt.revisionNumber} · ${receipt.qualitySummary}`
          : `${receipt.assessment} · ${(receipt.usage.inputTokens + receipt.usage.outputTokens).toLocaleString()} tokens · ${receipt.qualitySummary}`,
      } : message));
      setAttachments([]);
    } catch (cause) {
      const cancelled = cause instanceof Error && cause.name === "AbortError";
      setMessages((current) => current.map((message) => message.id === assistantId ? {
        ...message,
        status: "failed",
        content: cancelled ? "AI run cancelled. No partial AI edits were kept." : cause instanceof Error ? cause.message : "GlassWare AI could not finish that request.",
        detail: "No partial AI draft was kept.",
      } : message));
    } finally {
      runAbortRef.current = null;
      setIsRunning(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  const currentProjectHistory = conversationHistory.filter((conversation) => conversation.projectId === projectId);
  const otherProjectHistory = conversationHistory.filter((conversation) => conversation.projectId !== projectId);
  const cloudLabel = cloudSyncStatus === "synced" ? "CLOUD SYNCED"
    : cloudSyncStatus === "syncing" ? "SYNCING"
      : cloudSyncStatus === "retrying" ? "LOCAL · RETRYING"
        : "LOCAL ONLY";

  return (
    <section
      className={`ai-floating-widget ${minimized ? "minimized" : ""}`}
      style={{ left: position.x, top: position.y }}
      aria-label="GlassWare AI creative workspace"
    >
      <header className="ai-widget-titlebar" onPointerDown={startDrag}>
        <div className="ai-widget-grip" title="Drag Ask AI"><GripHorizontal size={17} /></div>
        <div><p>CREATIVE COPILOT</p><h1>Ask AI</h1></div>
        {!minimized && isRunning && <span className="ai-widget-running"><LoaderCircle className="spin" size={13} /> Working {formatElapsed(elapsedSeconds)}</span>}
        <div className="ai-widget-window-actions">
          {!minimized && <button type="button" title="New AI conversation" aria-label="New AI conversation" disabled={isRunning} onClick={startNewConversation}><MessageSquarePlus size={15} /></button>}
          {!minimized && <button type="button" title="Past AI conversations" aria-label="Past AI conversations" aria-expanded={historyOpen} onClick={() => setHistoryOpen((current) => !current)}><History size={15} /></button>}
          <button type="button" title={minimized ? "Restore Ask AI" : "Minimize Ask AI"} aria-label={minimized ? "Restore Ask AI" : "Minimize Ask AI"} onClick={() => setMinimized((current) => !current)}>{minimized ? <Maximize2 size={15} /> : <Minus size={15} />}</button>
          <button type="button" title={isRunning ? "Minimize while AI finishes" : "Close Ask AI (conversation is saved)"} aria-label={isRunning ? "Minimize Ask AI while it finishes" : "Close Ask AI"} onClick={closeWidget}><X size={15} /></button>
        </div>
      </header>

      {!minimized && (
        <>
          {!model.snapshot.account || model.snapshot.connections.length === 0 ? (
            <div className="ai-widget-connect">
              <Sparkles size={25} />
              <strong>Connect your AI</strong>
              <p>Connect ChatGPT or an OpenAI API key to let GlassWare edit, inspect, and refine this artboard for you.</p>
              <button type="button" onClick={openSettings}>Choose connection</button>
            </div>
          ) : (
            <>
              <div className={`ai-chat-runtime ${runtimeReady ? "ready" : "unavailable"}`}>
                <span />
                <strong>{runtimeReady ? activeConnection?.label : "AI workspace unavailable"}</strong>
                <small className={`ai-cloud-sync ${cloudSyncStatus}`} title={cloudSyncStatus === "retrying" ? "Saved locally. GlassWare retries cloud sync automatically while you are signed in." : "AI conversations sync to your Wiplash.ai account and can be removed whenever you want."}>
                  {cloudSyncStatus === "retrying" || cloudSyncStatus === "local" ? <CloudOff size={12} /> : <Cloud size={12} />}{cloudLabel}
                </small>
              </div>

              {historyOpen && (
                <aside className="ai-chat-history" aria-label="Past AI conversations">
                  <header><div><p>YOUR ACCOUNT</p><h2>AI conversations</h2></div><button type="button" title="Close conversation history" aria-label="Close conversation history" onClick={() => setHistoryOpen(false)}><X size={15} /></button></header>
                  <button type="button" className="ai-history-new" disabled={isRunning} onClick={startNewConversation}><MessageSquarePlus size={15} /><span><strong>New conversation</strong><small>Start with a blank AI context</small></span></button>
                  <div className="ai-history-list">
                    {conversationHistory.length === 0 && <p>No saved conversations yet. Your first message will appear here.</p>}
                    {currentProjectHistory.length > 0 && <h3>THIS PROJECT</h3>}
                    {currentProjectHistory.map((conversation) => (
                      <div key={conversation.id} className={`ai-history-row ${conversation.id === conversationId ? "active" : ""}`}>
                        <button type="button" className="ai-history-open" disabled={isRunning} onClick={() => openConversation(conversation)}>
                          <span><strong>{conversation.title}</strong><small>{formatConversationDate(conversation.updatedAt)} · {conversation.messages.filter((message) => message.role === "user").length} request{conversation.messages.filter((message) => message.role === "user").length === 1 ? "" : "s"}</small></span>
                          {conversation.id === conversationId && <Check size={14} />}
                        </button>
                        <button type="button" className="ai-history-delete" title={`Delete ${conversation.title}`} aria-label={`Delete ${conversation.title}`} disabled={isRunning} onClick={() => void removeConversation(conversation)}><Trash2 size={14} /></button>
                      </div>
                    ))}
                    {otherProjectHistory.length > 0 && <h3>OTHER PROJECTS</h3>}
                    {otherProjectHistory.map((conversation) => (
                      <div key={conversation.id} className={`ai-history-row ${conversation.id === conversationId ? "active" : ""}`}>
                        <button type="button" className="ai-history-open" disabled={isRunning} onClick={() => openConversation(conversation)}>
                          <span><strong>{conversation.title}</strong><small>{conversation.projectName || "GlassWare project"} · {formatConversationDate(conversation.updatedAt)}</small></span>
                          {conversation.id === conversationId && <Check size={14} />}
                        </button>
                        <button type="button" className="ai-history-delete" title={`Delete ${conversation.title}`} aria-label={`Delete ${conversation.title}`} disabled={isRunning} onClick={() => void removeConversation(conversation)}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                  <p className="ai-history-note">Synced to your account and cached on this device. Delete any conversation whenever you want.</p>
                </aside>
              )}

              {conversationReadOnly && (
                <div className="ai-conversation-read-only"><Cloud size={15} /><span><strong>{conversationProjectName}</strong>This conversation belongs to another project. Open that project to continue it.</span></div>
              )}

              <div className="ai-chat-thread" ref={threadRef} aria-live="polite" aria-label="AI conversation">
                <article className="ai-chat-message assistant intro">
                  <div className="ai-chat-avatar"><Sparkles size={15} /></div>
                  <div className="ai-chat-bubble">
                    <strong>Describe the finished result.</strong>
                    <p>I’ll edit the artboard automatically, look at the rendered result, and refine it. The whole AI session stays one-click undoable and redoable.</p>
                  </div>
                </article>
                {messages.map((message) => (
                  <article key={message.id} className={`ai-chat-message ${message.role} ${message.status}`}>
                    {message.role === "assistant" && <div className="ai-chat-avatar"><Bot size={15} /></div>}
                    <div className="ai-chat-bubble">
                      {message.role === "assistant" && message.status === "running" && <span className="ai-chat-working"><LoaderCircle className="spin" size={15} /> Luna is designing</span>}
                      <p>{message.content}</p>
                      {message.detail && <small className="ai-message-detail">{message.detail}{message.status === "running" ? ` · ${formatElapsed(elapsedSeconds)}` : ""}</small>}
                      {message.role === "assistant" && message.status === "completed" && <span className="ai-complete-mark"><Check size={13} /> Artboard updated</span>}
                    </div>
                  </article>
                ))}
              </div>

              <div className="ai-widget-session-actions">
                <button type="button" title="Undo every edit from the latest AI session" disabled={!canUndoAi || isRunning} onClick={onUndoAi}><Undo2 size={14} /> Undo AI edits</button>
                <button type="button" title="Restore the latest undone AI session (Ctrl/⌘+Shift+Z)" disabled={!canRedoAi || isRunning} onClick={onRedoAi}><Redo2 size={14} /> Redo AI edits</button>
                <button type="button" title="Manage AI connections" onClick={openSettings}><Settings2 size={14} /> Connections</button>
              </div>

              <form className="ai-chat-composer" onSubmit={submitPrompt}>
                {attachments.length > 0 && (
                  <div className="ai-attachments" aria-label="Attached files">
                    {attachments.map((attachment) => (
                      <span key={attachment.id} title={`${attachment.name} · ${Math.ceil(attachment.size / 1024)} KB`}>
                        {attachment.image ? <ImageIcon size={13} /> : <FileText size={13} />}
                        <b>{attachment.name}</b>
                        <button type="button" title={`Remove ${attachment.name}`} aria-label={`Remove ${attachment.name}`} onClick={() => setAttachments((current) => current.filter((entry) => entry.id !== attachment.id))}><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                )}
                {attachmentError && <p className="ai-attachment-error">{attachmentError}</p>}
                <label className="sr-only" htmlFor="glassware-ai-prompt">Message GlassWare AI</label>
                <textarea
                  id="glassware-ai-prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  maxLength={4000}
                  rows={3}
                  placeholder="Describe what you want. Luna will edit, inspect, and refine it…"
                  disabled={isRunning || conversationReadOnly}
                />
                <div className="ai-chat-composer-footer">
                  <div className="ai-chat-controls">
                    <button className="ai-attach-button" type="button" title="Attach images or documents" aria-label="Attach images or documents" disabled={isRunning || conversationReadOnly || attachments.length >= MAX_USER_ATTACHMENTS} onClick={() => fileInputRef.current?.click()}><Paperclip size={15} /></button>
                    <input ref={fileInputRef} hidden multiple type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,text/plain,text/markdown,application/json,text/csv,.md,.markdown,.json,.csv" onChange={(event) => { void addFiles(event.target.files); event.currentTarget.value = ""; }} />
                    <AiDropdown label="AI connection" value={activeConnectionId} options={connectionOptions} onChange={setSelectedConnectionId} disabled={isRunning || conversationReadOnly} leading={<Cpu size={13} />} />
                    <AiDropdown label="Model" value={selectedModel} options={modelOptions} onChange={setSelectedModel} disabled={isRunning || conversationReadOnly} />
                    <AiDropdown label="Reasoning effort" value={reasoningEffort} options={reasoningOptions} onChange={setReasoningEffort} disabled={isRunning || conversationReadOnly} />
                  </div>
                  {isRunning ? (
                    <button type="button" className="ai-send-button ai-cancel-button" onClick={() => runAbortRef.current?.abort()} title="Cancel this AI run and discard partial edits" aria-label="Cancel AI run"><Square size={13} fill="currentColor" /></button>
                  ) : (
                    <button type="submit" className="ai-send-button" disabled={!prompt.trim() || !activeConnectionId || conversationReadOnly} title={conversationReadOnly ? "Open this conversation's project to continue" : "Send to GlassWare AI"} aria-label="Send to GlassWare AI"><ArrowUp size={17} /></button>
                  )}
                </div>
              </form>
              <div className="ai-chat-note"><Check size={14} /><span>Automatic edits commit as one revision. Undo and redo the AI session anytime.</span></div>
            </>
          )}
        </>
      )}
    </section>
  );
}
