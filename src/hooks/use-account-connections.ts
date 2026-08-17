import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAccountServiceClient,
  createDeviceAccountClient,
  type AccountSnapshot,
  type AiDeviceAuthorization,
  type AiJob,
  type AiModelId,
  type AiReasoningEffort,
  type SignInProvider,
} from "../lib/account-connections";

const EMPTY_SNAPSHOT: AccountSnapshot = {
  account: null,
  connections: [],
  syncEnabled: false,
  aiRuntime: { available: false, message: "AI workspace is unavailable" },
};
const PRODUCTION_ACCOUNT_API_URL = "https://auth.wiplash.ai/glassware";
const LOCAL_ACCOUNT_API_URL = "http://127.0.0.1:3010";

function currentReturnUrl(): string {
  const url = new URL(window.location.href);
  url.search = "";
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
  aiJob: AiJob | null;
  signInWith(provider: SignInProvider): Promise<void>;
  signOut(): Promise<void>;
  connectApiKey(apiKey: string, projectId: string): Promise<boolean>;
  connectChatGpt(projectId: string): Promise<void>;
  disconnect(connectionId: string): Promise<void>;
  runAi(connectionId: string, prompt: string, project: unknown, model: AiModelId, reasoningEffort: AiReasoningEffort): Promise<void>;
  clearAiJob(): void;
  setSyncEnabled(enabled: boolean): Promise<void>;
  clearMessage(): void;
}

export function useAccountConnections(): AccountConnectionsModel {
  const configuredBaseUrl = import.meta.env.VITE_GLASSWARE_ACCOUNT_API_URL?.trim()
    ?? import.meta.env.VITE_IMAGESTITCH_ACCOUNT_API_URL?.trim()
    ?? defaultAccountServiceUrl();
  const serviceSetup = useMemo(() => {
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
  }, [configuredBaseUrl]);
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
  const [aiJob, setAiJob] = useState<AiJob | null>(null);

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
        timer = window.setTimeout(poll, 1_500);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not check ChatGPT authorization.");
      }
    };
    timer = window.setTimeout(poll, 750);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [deviceAuthorization?.id, deviceAuthorization?.status, serviceClient]);

  useEffect(() => {
    if (!serviceClient || !aiJob || !["queued", "running"].includes(aiJob.status)) return;
    let cancelled = false;
    let timer = 0;
    const poll = async () => {
      try {
        const next = await serviceClient.getAiJob(aiJob.id);
        if (cancelled) return;
        setAiJob(next);
        if (next.status === "completed") {
          setNotice("Codex returned a reviewable design plan.");
          return;
        }
        if (next.status === "failed") {
          setError(next.error || "Codex could not finish this plan.");
          return;
        }
        timer = window.setTimeout(poll, 1_500);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not check the AI job.");
      }
    };
    timer = window.setTimeout(poll, 1_000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [aiJob?.id, aiJob?.status, serviceClient]);

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

  const runAi = useCallback(async (connectionId: string, prompt: string, project: unknown, model: AiModelId, reasoningEffort: AiReasoningEffort) => {
    if (!serviceClient || snapshot.account?.mode !== "authenticated") {
      setError("Sign in and connect an AI provider before asking Codex.");
      return;
    }
    const next = await run("ai-job", () => serviceClient.createAiJob(connectionId, prompt, project, model, reasoningEffort));
    if (!next) return;
    setAiJob(next);
    setNotice("Codex job queued. Your canvas remains unchanged while the plan runs.");
  }, [run, serviceClient, snapshot.account?.mode]);

  const setSyncEnabled = useCallback(async (enabled: boolean) => {
    const activeClient = snapshot.account?.mode === "authenticated" && serviceClient ? serviceClient : deviceClient;
    const next = await run("sync", () => activeClient.setSyncEnabled(enabled), setSnapshot);
    if (!next) return;
    setNotice(enabled ? "Project sync preference enabled." : "Project sync preference disabled. Local editing is unchanged.");
  }, [deviceClient, run, serviceClient, snapshot.account?.mode]);

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
    aiJob,
    signInWith,
    signOut,
    connectApiKey,
    connectChatGpt,
    disconnect,
    runAi,
    clearAiJob() {
      setAiJob(null);
    },
    setSyncEnabled,
    clearMessage() {
      setNotice("");
      setError("");
    },
  };
}
