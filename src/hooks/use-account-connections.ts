import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAccountServiceClient,
  createDeviceAccountClient,
  DEFAULT_BILLING_SNAPSHOT,
  type AccountSnapshot,
  type AiDeviceAuthorization,
  type AiAgentContext,
  type AiAttachment,
  type AiJob,
  type AiModelId,
  type AiReasoningEffort,
  type CloudAiConversation,
  type CloudAiConversationReceipt,
  type CloudProjectArchive,
  type CloudProjectMetadata,
  type CloudProjectReceipt,
  type BillingInterval,
  type BillingPlan,
  type SignInProvider,
} from "../lib/account-connections";
import { isExtensionSurface } from "../lib/runtime-surface";

const EMPTY_SNAPSHOT: AccountSnapshot = {
  account: null,
  connections: [],
  syncEnabled: false,
  aiRuntime: { available: false, message: "AI workspace is unavailable" },
  billing: DEFAULT_BILLING_SNAPSHOT,
};
const PRODUCTION_ACCOUNT_API_URL = "https://auth.wiplash.ai/glassware";
const LOCAL_ACCOUNT_API_URL = "http://127.0.0.1:3010";
const AI_POLL_INTERVAL_MS = 2_500;
const RATE_LIMIT_RETRY_MS = 6_000;

function isRateLimitError(cause: unknown): boolean {
  return cause instanceof Error && /\b429\b|rate limit|too many requests/i.test(cause.message);
}

function currentReturnUrl(): string {
  const url = new URL(window.location.href);
  const current = url.searchParams;
  const next = new URLSearchParams();
  const plan = current.get("subscribe");
  const interval = current.get("billing");
  if (plan === "designer" || plan === "director") next.set("subscribe", plan);
  if (interval === "monthly" || interval === "annual") next.set("billing", interval);
  url.search = next.toString();
  url.hash = "";
  return url.toString();
}

function defaultAccountServiceUrl(): string {
  const hostname = globalThis.location?.hostname ?? "";
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
    ? LOCAL_ACCOUNT_API_URL
    : PRODUCTION_ACCOUNT_API_URL;
}

export interface AccountConnectionsModel {
  mode: "service" | "device";
  cloudStatus: "checking" | "available" | "unavailable";
  cloudMessage: string;
  snapshot: AccountSnapshot;
  loading: boolean;
  busy: string | null;
  notice: string;
  error: string;
  deviceAuthorization: AiDeviceAuthorization | null;
  signInWith(provider: SignInProvider): Promise<void>;
  signOut(): Promise<void>;
  connectApiKey(apiKey: string, projectId: string): Promise<boolean>;
  connectChatGpt(projectId: string): Promise<void>;
  disconnect(connectionId: string): Promise<void>;
  requestAiTurn(connectionId: string, prompt: string, project: unknown, model: AiModelId, reasoningEffort: AiReasoningEffort, attachments: AiAttachment[], agentContext: AiAgentContext, signal?: AbortSignal, onJob?: (job: AiJob) => void): Promise<AiJob>;
  requestImageEdit(connectionId: string, sourceDataUrl: string, maskDataUrl: string, prompt: string, model: AiModelId, reasoningEffort: AiReasoningEffort, agentSessionId?: string, signal?: AbortSignal, onJob?: (job: AiJob) => void): Promise<AiJob>;
  cancelAiJob(jobId: string): Promise<void>;
  listCloudAiConversations(projectId?: string): Promise<CloudAiConversation[]>;
  saveCloudAiConversation(conversation: CloudAiConversation): Promise<CloudAiConversationReceipt>;
  deleteCloudAiConversation(conversationId: string): Promise<void>;
  listCloudProjects(): Promise<CloudProjectMetadata[]>;
  loadCloudProject(projectId: string): Promise<CloudProjectArchive>;
  saveCloudProject(project: CloudProjectArchive): Promise<CloudProjectReceipt>;
  deleteCloudProject(projectId: string): Promise<void>;
  setSyncEnabled(enabled: boolean): Promise<void>;
  refreshBilling(): Promise<void>;
  startCheckout(plan: Exclude<BillingPlan, "creator">, interval: BillingInterval): Promise<boolean>;
  openBillingPortal(): Promise<boolean>;
  clearMessage(): void;
}

export function useAccountConnections(): AccountConnectionsModel {
  const extensionSurface = isExtensionSurface();
  const configuredBaseUrl = import.meta.env.VITE_GLASSWARE_ACCOUNT_API_URL?.trim()
    ?? import.meta.env.VITE_IMAGESTITCH_ACCOUNT_API_URL?.trim()
    ?? defaultAccountServiceUrl();
  const serviceSetup = useMemo(() => {
    if (extensionSurface) {
      return {
        client: null,
        configurationError: "Sign-in, cloud storage, and AI continue securely in the GlassWare web app.",
      };
    }
    try {
      return {
        client: createAccountServiceClient({ baseUrl: configuredBaseUrl }),
        configurationError: "",
      };
    } catch (cause) {
      return {
        client: null,
        configurationError: cause instanceof Error ? cause.message : "The account service configuration is invalid.",
      };
    }
  }, [configuredBaseUrl, extensionSurface]);
  const serviceClient = serviceSetup.client;
  const deviceClient = useMemo(() => createDeviceAccountClient(), []);
  const [snapshot, setSnapshot] = useState<AccountSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [cloudStatus, setCloudStatus] = useState<AccountConnectionsModel["cloudStatus"]>("checking");
  const [cloudMessage, setCloudMessage] = useState("Checking secure sign-in…");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [deviceAuthorization, setDeviceAuthorization] = useState<AiDeviceAuthorization | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCloudStatus("checking");
    setCloudMessage("Checking secure sign-in…");
    void (async () => {
      const deviceSnapshot = await deviceClient.getSnapshot();
      if (!serviceClient) {
        if (!cancelled) {
          setSnapshot(deviceSnapshot);
          setCloudStatus("unavailable");
          setCloudMessage(serviceSetup.configurationError || "OAuth sign-in is not configured.");
        }
        return;
      }
      try {
        const serviceSnapshot = await serviceClient.getSnapshot();
        if (!cancelled) {
          setSnapshot(serviceSnapshot.account
            ? serviceSnapshot
            : { ...deviceSnapshot, aiRuntime: serviceSnapshot.aiRuntime });
          setCloudStatus("available");
          setCloudMessage("");
        }
      } catch {
        if (!cancelled) {
          setSnapshot(deviceSnapshot);
          setCloudStatus("unavailable");
          setCloudMessage("OAuth sign-in service is not reachable yet.");
        }
      }
    })().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [deviceClient, serviceClient, serviceSetup.configurationError]);

  useEffect(() => {
    if (!serviceClient || !deviceAuthorization || !["starting", "waiting"].includes(deviceAuthorization.status)) return;
    let cancelled = false;
    let timer = 0;
    const poll = async () => {
      try {
        const result = await serviceClient.getChatGptConnection(deviceAuthorization.id);
        if (cancelled) return;
        if (result.authorization) setDeviceAuthorization(result.authorization);
        if (result.status === "connected" && result.snapshot) {
          setSnapshot(result.snapshot);
          setNotice("ChatGPT subscription connected to your private AI workspace.");
          return;
        }
        if (result.authorization && ["failed", "expired"].includes(result.authorization.status)) {
          setError(result.authorization.error || "ChatGPT authorization expired. Start it again.");
          return;
        }
        timer = window.setTimeout(poll, AI_POLL_INTERVAL_MS);
      } catch (cause) {
        if (cancelled) return;
        if (isRateLimitError(cause)) {
          timer = window.setTimeout(poll, RATE_LIMIT_RETRY_MS);
          return;
        }
        const message = cause instanceof Error ? cause.message : "Could not check ChatGPT authorization.";
        setDeviceAuthorization((current) => current ? { ...current, status: "failed", error: message } : current);
        setError(message);
      }
    };
    timer = window.setTimeout(poll, 1_000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [deviceAuthorization?.id, deviceAuthorization?.status, serviceClient]);

  const run = useCallback(async <T,>(label: string, task: () => Promise<T>, apply?: (value: T) => void): Promise<T | undefined> => {
    setBusy(label);
    setNotice("");
    setError("");
    try {
      const value = await task();
      apply?.(value);
      return value;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That account action could not be completed.");
      return undefined;
    } finally {
      setBusy(null);
    }
  }, []);

  const signOut = useCallback(async () => {
    const cloudSession = snapshot.account?.mode === "authenticated" && Boolean(serviceClient);
    const activeClient = cloudSession && serviceClient ? serviceClient : deviceClient;
    const next = await run("sign-out", () => activeClient.signOut(), cloudSession ? undefined : setSnapshot);
    if (!next) return;
    if (cloudSession) setSnapshot(await deviceClient.getSnapshot());
    setNotice("Signed out. Your local projects are still on this device.");
  }, [deviceClient, run, serviceClient, snapshot.account?.mode]);

  const signInWith = useCallback(async (provider: SignInProvider) => {
    if (!serviceClient) {
      setError(serviceSetup.configurationError || "OAuth sign-in is not configured.");
      return;
    }
    const authorization = await run(`sign-in-${provider}`, () => serviceClient.startSignIn(provider, currentReturnUrl()));
    if (!authorization) {
      setCloudStatus("unavailable");
      setCloudMessage("OAuth sign-in service is not reachable yet.");
      return;
    }
    setCloudStatus("available");
    window.location.assign(authorization.authorizationUrl);
  }, [run, serviceClient, serviceSetup.configurationError]);

  const connectApiKey = useCallback(async (apiKey: string, projectId: string) => {
    if (!serviceClient || snapshot.account?.mode !== "authenticated") {
      setError("Sign in before connecting an OpenAI API key.");
      return false;
    }
    const next = await run("connect-openai_api", () => serviceClient.connectApiKey(apiKey, projectId), setSnapshot);
    if (!next) return false;
    setNotice("OpenAI API access connected. The key is encrypted server-side and was not returned to this editor.");
    return true;
  }, [run, serviceClient, snapshot.account?.mode]);

  const connectChatGpt = useCallback(async (projectId: string) => {
    if (!serviceClient || snapshot.account?.mode !== "authenticated") {
      setError("Sign in before connecting a ChatGPT subscription.");
      return;
    }
    const authorization = await run("connect-chatgpt_codex_plugin", () => serviceClient.startChatGptConnection(projectId));
    if (!authorization?.authorization) return;
    setDeviceAuthorization(authorization.authorization);
    setNotice("ChatGPT device authorization started. Complete the one-time OpenAI sign-in shown below.");
  }, [run, serviceClient, snapshot.account?.mode]);

  const disconnect = useCallback(async (connectionId: string) => {
    const activeClient = snapshot.account?.mode === "authenticated" && serviceClient ? serviceClient : deviceClient;
    const next = await run(`disconnect-${connectionId}`, () => activeClient.disconnectConnection(connectionId), setSnapshot);
    if (!next) return;
    setNotice("AI connection disconnected.");
  }, [deviceClient, run, serviceClient, snapshot.account?.mode]);

  const requestAiTurn = useCallback(async (
    connectionId: string,
    prompt: string,
    project: unknown,
    model: AiModelId,
    reasoningEffort: AiReasoningEffort,
    attachments: AiAttachment[],
    agentContext: AiAgentContext,
    signal?: AbortSignal,
    onJob?: (job: AiJob) => void,
  ): Promise<AiJob> => {
    if (!serviceClient || snapshot.account?.mode !== "authenticated") {
      throw new Error("Sign in and connect an AI provider before asking GlassWare AI.");
    }
    setBusy("ai-agent");
    setNotice("");
    setError("");
    let activeJobId: string | null = null;
    const cancelActiveJob = () => {
      if (activeJobId) void serviceClient.cancelAiJob(activeJobId).catch(() => undefined);
    };
    const wait = (milliseconds: number) => new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("AI run cancelled.", "AbortError"));
        return;
      }
      const timer = window.setTimeout(() => {
        signal?.removeEventListener("abort", cancel);
        resolve();
      }, milliseconds);
      const cancel = () => {
        window.clearTimeout(timer);
        reject(new DOMException("AI run cancelled.", "AbortError"));
      };
      signal?.addEventListener("abort", cancel, { once: true });
    });
    signal?.addEventListener("abort", cancelActiveJob);
    try {
      let job = await serviceClient.createAiJob(connectionId, prompt, project, model, reasoningEffort, attachments, agentContext);
      activeJobId = job.id;
      onJob?.(job);
      if (signal?.aborted) {
        await serviceClient.cancelAiJob(job.id).catch(() => undefined);
        throw new DOMException("AI run cancelled.", "AbortError");
      }
      let reconnectAttempts = 0;
      while (job.status === "queued" || job.status === "running") {
        await wait(AI_POLL_INTERVAL_MS);
        try {
          job = await serviceClient.getAiJob(job.id);
          reconnectAttempts = 0;
          onJob?.(job);
        } catch (cause) {
          const recoverable = isRateLimitError(cause)
            || cause instanceof TypeError
            || /fetch|network|temporarily unavailable|timed out|timeout|service unavailable/i.test(cause instanceof Error ? cause.message : "");
          if (!recoverable || reconnectAttempts >= 8) throw cause;
          reconnectAttempts += 1;
          await wait(isRateLimitError(cause) ? RATE_LIMIT_RETRY_MS : Math.min(8_000, 750 * 2 ** reconnectAttempts));
        }
      }
      if (job.status === "cancelled") throw new DOMException("AI run cancelled.", "AbortError");
      if (job.status === "failed") throw new Error(job.error || "GlassWare AI could not finish this visual pass.");
      if (!job.plan) throw new Error("GlassWare AI finished without an edit decision.");
      return job;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "GlassWare AI could not complete this visual pass.";
      setError(message);
      throw cause instanceof Error ? cause : new Error(message);
    } finally {
      signal?.removeEventListener("abort", cancelActiveJob);
      setBusy(null);
    }
  }, [serviceClient, snapshot.account?.mode]);

  const cancelAiJob = useCallback(async (jobId: string) => {
    if (!serviceClient || snapshot.account?.mode !== "authenticated") return;
    await serviceClient.cancelAiJob(jobId);
  }, [serviceClient, snapshot.account?.mode]);

  const requestImageEdit = useCallback(async (
    connectionId: string,
    sourceDataUrl: string,
    maskDataUrl: string,
    prompt: string,
    model: AiModelId,
    reasoningEffort: AiReasoningEffort,
    agentSessionId?: string,
    signal?: AbortSignal,
    onJob?: (job: AiJob) => void,
  ): Promise<AiJob> => {
    if (!serviceClient || snapshot.account?.mode !== "authenticated") {
      throw new Error("Sign in and connect an AI provider before editing image regions.");
    }
    setBusy("ai-region-edit");
    setNotice("");
    setError("");
    let activeJobId: string | null = null;
    const cancel = () => { if (activeJobId) void serviceClient.cancelAiJob(activeJobId).catch(() => undefined); };
    const wait = (milliseconds: number) => new Promise<void>((resolve, reject) => {
      if (signal?.aborted) return reject(new DOMException("Region edit cancelled.", "AbortError"));
      const timer = window.setTimeout(() => { signal?.removeEventListener("abort", stop); resolve(); }, milliseconds);
      const stop = () => { window.clearTimeout(timer); reject(new DOMException("Region edit cancelled.", "AbortError")); };
      signal?.addEventListener("abort", stop, { once: true });
    });
    signal?.addEventListener("abort", cancel);
    try {
      let job = await serviceClient.createImageEditJob(connectionId, sourceDataUrl, maskDataUrl, prompt, model, reasoningEffort, agentSessionId);
      activeJobId = job.id;
      onJob?.(job);
      while (job.status === "queued" || job.status === "running") {
        await wait(AI_POLL_INTERVAL_MS);
        job = await serviceClient.getAiJob(job.id);
        onJob?.(job);
      }
      if (job.status === "cancelled") throw new DOMException("Region edit cancelled.", "AbortError");
      if (job.status === "failed") throw new Error(job.error || "GlassWare could not finish the region edit.");
      if (!job.imageEdit) throw new Error("GlassWare finished without an edited raster.");
      return job;
    } finally {
      signal?.removeEventListener("abort", cancel);
      setBusy(null);
    }
  }, [serviceClient, snapshot.account?.mode]);

  const setSyncEnabled = useCallback(async (enabled: boolean) => {
    const activeClient = snapshot.account?.mode === "authenticated" && serviceClient ? serviceClient : deviceClient;
    const next = await run("sync", () => activeClient.setSyncEnabled(enabled), setSnapshot);
    if (!next) return;
    setNotice(enabled ? "Project sync preference enabled." : "Project sync preference disabled. Local editing is unchanged.");
  }, [deviceClient, run, serviceClient, snapshot.account?.mode]);

  const refreshBilling = useCallback(async () => {
    if (!serviceClient || snapshot.account?.mode !== "authenticated") return;
    const billing = await run("billing-refresh", () => serviceClient.getBilling());
    if (billing) setSnapshot((current) => ({ ...current, billing }));
  }, [run, serviceClient, snapshot.account?.mode]);

  const startCheckout = useCallback(async (plan: Exclude<BillingPlan, "creator">, interval: BillingInterval) => {
    if (!serviceClient || snapshot.account?.mode !== "authenticated") {
      setError("Sign in before upgrading your GlassWare plan.");
      return false;
    }
    const idempotencyKey = `checkout-${crypto.randomUUID()}`;
    const redirect = await run("billing-checkout", () => serviceClient.createBillingCheckout(plan, interval, idempotencyKey));
    if (!redirect) return false;
    window.location.assign(redirect.url);
    return true;
  }, [run, serviceClient, snapshot.account?.mode]);

  const openBillingPortal = useCallback(async () => {
    if (!serviceClient || snapshot.account?.mode !== "authenticated") {
      setError("Sign in before opening billing settings.");
      return false;
    }
    const idempotencyKey = `portal-${crypto.randomUUID()}`;
    const redirect = await run("billing-portal", () => serviceClient.createBillingPortal(idempotencyKey));
    if (!redirect) return false;
    window.location.assign(redirect.url);
    return true;
  }, [run, serviceClient, snapshot.account?.mode]);

  const requireCloudAiHistory = useCallback(() => {
    if (!serviceClient || snapshot.account?.mode !== "authenticated") {
      throw new Error("Sign in to sync AI conversation history.");
    }
    return serviceClient;
  }, [serviceClient, snapshot.account?.mode]);

  const listCloudAiConversations = useCallback((projectId?: string) => (
    requireCloudAiHistory().listAiConversations(projectId)
  ), [requireCloudAiHistory]);

  const saveCloudAiConversation = useCallback((conversation: CloudAiConversation) => (
    requireCloudAiHistory().upsertAiConversation(conversation)
  ), [requireCloudAiHistory]);

  const deleteCloudAiConversation = useCallback((conversationId: string) => (
    requireCloudAiHistory().deleteAiConversation(conversationId)
  ), [requireCloudAiHistory]);

  const listCloudProjects = useCallback(() => requireCloudAiHistory().listProjects(), [requireCloudAiHistory]);
  const loadCloudProject = useCallback((projectId: string) => requireCloudAiHistory().getProject(projectId), [requireCloudAiHistory]);
  const saveCloudProject = useCallback((project: CloudProjectArchive) => requireCloudAiHistory().upsertProject(project), [requireCloudAiHistory]);
  const deleteCloudProject = useCallback((projectId: string) => requireCloudAiHistory().deleteProject(projectId), [requireCloudAiHistory]);

  return {
    mode: snapshot.account?.mode === "authenticated" ? "service" : "device",
    cloudStatus,
    cloudMessage,
    snapshot,
    loading,
    busy,
    notice,
    error,
    deviceAuthorization,
    signInWith,
    signOut,
    connectApiKey,
    connectChatGpt,
    disconnect,
    requestAiTurn,
    requestImageEdit,
    cancelAiJob,
    listCloudAiConversations,
    saveCloudAiConversation,
    deleteCloudAiConversation,
    listCloudProjects,
    loadCloudProject,
    saveCloudProject,
    deleteCloudProject,
    setSyncEnabled,
    refreshBilling,
    startCheckout,
    openBillingPortal,
    clearMessage() {
      setNotice("");
      setError("");
    },
  };
}
