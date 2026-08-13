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

function currentReturnUrl(): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

export interface AccountConnectionsModel {
  mode: "service" | "device";
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
    ?? "";
  const clientSetup = useMemo(() => {
    try {
      return {
        client: configuredBaseUrl
          ? createAccountServiceClient({ baseUrl: configuredBaseUrl })
          : createDeviceAccountClient(),
        configurationError: "",
      };
    } catch (cause) {
      return {
        client: createDeviceAccountClient(),
        configurationError: cause instanceof Error ? cause.message : "The account service configuration is invalid.",
      };
    }
  }, [configuredBaseUrl]);
  const client = clientSetup.client;
  const [snapshot, setSnapshot] = useState<AccountSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(clientSetup.configurationError);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(clientSetup.configurationError);
    void client.getSnapshot()
      .then((next) => {
        if (!cancelled) setSnapshot(next);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "The account service could not be reached.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, clientSetup.configurationError]);

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
    const receipt = await run("sign-in", () => client.requestMagicLink(email, currentReturnUrl()));
    if (!receipt) return null;
    if (receipt.snapshot) setSnapshot(receipt.snapshot);
    setNotice(receipt.status === "email-sent"
      ? `Sign-in link sent to ${receipt.email}.`
      : `GlassWare is ready for ${receipt.email} on this device.`);
    return receipt.status;
  }, [client, run]);

  const signOut = useCallback(async () => {
    const next = await run("sign-out", () => client.signOut(), setSnapshot);
    if (!next) return;
    setNotice("Signed out. Your local projects are still on this device.");
  }, [client, run]);

  const signInWith = useCallback(async (provider: SignInProvider) => {
    const authorization = await run(`sign-in-${provider}`, () => client.startSignIn(provider, currentReturnUrl()));
    if (authorization) window.location.assign(authorization.authorizationUrl);
  }, [client, run]);

  const connect = useCallback(async (kind: AiConnectionKind, projectId: string) => {
    const authorization = await run(`connect-${kind}`, () => client.startConnection(kind, currentReturnUrl(), projectId));
    if (!authorization) return;
    if (authorization.status === "redirect" && authorization.authorizationUrl) {
      window.location.assign(authorization.authorizationUrl);
      return;
    }
    if (authorization.snapshot) setSnapshot(authorization.snapshot);
    setNotice("AI connection established.");
  }, [client, run]);

  const disconnect = useCallback(async (connectionId: string) => {
    const next = await run(`disconnect-${connectionId}`, () => client.disconnectConnection(connectionId), setSnapshot);
    if (!next) return;
    setNotice("AI connection disconnected.");
  }, [client, run]);

  const setSyncEnabled = useCallback(async (enabled: boolean) => {
    const next = await run("sync", () => client.setSyncEnabled(enabled), setSnapshot);
    if (!next) return;
    setNotice(enabled ? "Project sync preference enabled." : "Project sync preference disabled. Local editing is unchanged.");
  }, [client, run]);

  return {
    mode: client.mode,
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
