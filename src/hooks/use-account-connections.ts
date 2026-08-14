import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAccountServiceClient,
  createDeviceAccountClient,
  type MagicLinkReceipt,
  type AccountSnapshot,
  type AiConnectionKind,
  type SignInProvider,
} from "../lib/account-connections";

const EMPTY_SNAPSHOT: AccountSnapshot = { account: null, connections: [], syncEnabled: false };
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
  signIn(email: string): Promise<MagicLinkReceipt["status"] | null>;
  signInWith(provider: SignInProvider): Promise<void>;
  signOut(): Promise<void>;
  connect(kind: AiConnectionKind, projectId: string): Promise<void>;
  disconnect(connectionId: string): Promise<void>;
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
  const [cloudMessage, setCloudMessage] = useState("Checking Wiplash sign-in…");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCloudStatus("checking");
    setCloudMessage("Checking Wiplash sign-in…");
    void (async () => {
      const deviceSnapshot = await deviceClient.getSnapshot();
      if (!serviceClient) {
        if (!cancelled) {
          setSnapshot(deviceSnapshot);
          setCloudStatus("unavailable");
          setCloudMessage(serviceSetup.configurationError || "Wiplash sign-in is not configured.");
        }
        return;
      }
      try {
        const serviceSnapshot = await serviceClient.getSnapshot();
        if (!cancelled) {
          setSnapshot(serviceSnapshot.account ? serviceSnapshot : deviceSnapshot);
          setCloudStatus("available");
          setCloudMessage("Wiplash sign-in is ready");
        }
      } catch {
        if (!cancelled) {
          setSnapshot(deviceSnapshot);
          setCloudStatus("unavailable");
          setCloudMessage("Wiplash sign-in service is not reachable yet.");
        }
      }
    })().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [deviceClient, serviceClient, serviceSetup.configurationError]);

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

  const signIn = useCallback(async (email: string) => {
    const receipt = await run("sign-in", () => deviceClient.requestMagicLink(email, currentReturnUrl()));
    if (!receipt) return null;
    if (receipt.snapshot) setSnapshot(receipt.snapshot);
    setNotice(receipt.status === "email-sent"
      ? `Sign-in link sent to ${receipt.email}.`
      : `GlassWare is ready for ${receipt.email} on this device.`);
    return receipt.status;
  }, [deviceClient, run]);

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
      setError(serviceSetup.configurationError || "Wiplash sign-in is not configured.");
      return;
    }
    const authorization = await run(`sign-in-${provider}`, () => serviceClient.startSignIn(provider, currentReturnUrl()));
    if (!authorization) {
      setCloudStatus("unavailable");
      setCloudMessage("Wiplash sign-in service is not reachable yet.");
      return;
    }
    setCloudStatus("available");
    window.location.assign(authorization.authorizationUrl);
  }, [run, serviceClient, serviceSetup.configurationError]);

  const connect = useCallback(async (kind: AiConnectionKind, projectId: string) => {
    const activeClient = snapshot.account?.mode === "authenticated" && serviceClient ? serviceClient : deviceClient;
    const authorization = await run(`connect-${kind}`, () => activeClient.startConnection(kind, currentReturnUrl(), projectId));
    if (!authorization) return;
    if (authorization.status === "redirect" && authorization.authorizationUrl) {
      window.location.assign(authorization.authorizationUrl);
      return;
    }
    if (authorization.snapshot) setSnapshot(authorization.snapshot);
    setNotice("AI connection established.");
  }, [deviceClient, run, serviceClient, snapshot.account?.mode]);

  const disconnect = useCallback(async (connectionId: string) => {
    const activeClient = snapshot.account?.mode === "authenticated" && serviceClient ? serviceClient : deviceClient;
    const next = await run(`disconnect-${connectionId}`, () => activeClient.disconnectConnection(connectionId), setSnapshot);
    if (!next) return;
    setNotice("AI connection disconnected.");
  }, [deviceClient, run, serviceClient, snapshot.account?.mode]);

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
    signIn,
    signInWith,
    signOut,
    connect,
    disconnect,
    setSyncEnabled,
    clearMessage() {
      setNotice("");
      setError("");
    },
  };
}
