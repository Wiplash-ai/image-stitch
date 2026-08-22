import { describe, expect, it } from "vitest";
import {
  ACCOUNT_DEVICE_STORAGE_KEY,
  createAccountServiceClient,
  createDeviceAccountClient,
  DEFAULT_BILLING_SNAPSHOT,
  parseAccountSnapshot,
  validateAuthorizationUrl,
  validateServiceBaseUrl,
  type StorageLike,
} from "../src/lib/account-connections";

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const authenticatedSnapshot = {
  account: {
    id: "account-1",
    email: "mom@example.com",
    displayName: "Mom",
    expiresAt: "2026-09-01T00:00:00.000Z",
    mode: "authenticated",
  },
  connections: [],
  syncEnabled: false,
  csrfToken: "csrf-only",
} as const;

describe("account and AI connection clients", () => {
  it("preserves a legacy device profile without offering new email sign-in", async () => {
    const storage = new MemoryStorage();
    storage.setItem(ACCOUNT_DEVICE_STORAGE_KEY, JSON.stringify({
      account: {
        id: "device-legacy",
        email: "mom.example@example.com",
        displayName: "Mom Example",
        expiresAt: "2026-09-01T00:00:00.000Z",
        mode: "device",
      },
      connections: [],
      syncEnabled: false,
    }));
    const client = createDeviceAccountClient(storage);
    expect((await client.getSnapshot()).account).toMatchObject({ email: "mom.example@example.com", mode: "device" });

    await expect(client.startChatGptConnection("project-1")).rejects.toThrow("account service");
    await expect(client.connectApiKey("sk-example-1234567890", "project-1")).rejects.toThrow("account service");
    await expect(client.startSignIn("wiplash", "http://localhost:4173")).rejects.toThrow("account service");
    await expect(client.setSyncEnabled(true)).rejects.toThrow("account service");
    await expect(client.listAiConversations()).rejects.toThrow("account service");
    await expect(client.listProjects()).rejects.toThrow("account service");

    const restored = await createDeviceAccountClient(storage).getSnapshot();
    expect(restored.connections).toEqual([]);
    expect(restored.syncEnabled).toBe(false);
    const stored = storage.getItem(ACCOUNT_DEVICE_STORAGE_KEY) ?? "";
    expect(stored).not.toMatch(/apiKey|accessToken|refreshToken|password|secret|authJson/i);

    await client.signOut();
    expect(await client.getSnapshot()).toEqual({
      account: null,
      connections: [],
      syncEnabled: false,
      aiRuntime: { available: false, message: "AI workspace is unavailable" },
      billing: DEFAULT_BILLING_SNAPSHOT,
    });
    expect(storage.getItem(ACCOUNT_DEVICE_STORAGE_KEY)).toBeNull();
  });

  it("uses secure cookies, CSRF-bound mutations, and redirect receipts with the service client", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const cloudConversation = {
      id: "8f054ccc-7d7e-4fc5-bf3d-d1e56912ef55",
      projectId: "47473a61-1237-474a-bb84-1b6a64241cb3",
      projectName: "Launch card",
      title: "Make it joyful",
      createdAt: "2026-08-14T00:00:00.000Z",
      updatedAt: "2026-08-14T00:01:00.000Z",
      messages: [{ id: "ad52c39e-13b7-44aa-a33c-8aa76d8ecaa4", role: "user" as const, content: "Make it joyful", status: "sent" as const, createdAt: "2026-08-14T00:00:00.000Z" }],
      model: "gpt-5.6-luna",
      reasoningEffort: "low",
    };
    const cloudProject = {
      id: "47473a61-1237-474a-bb84-1b6a64241cb3",
      name: "Launch card",
      createdAt: "2026-08-14T00:00:00.000Z",
      updatedAt: "2026-08-14T00:01:00.000Z",
      currentRevisionId: "edb9e69a-b4e0-4639-8664-9f315aa9c5d9",
      bundle: {
        schemaVersion: "glassware.bundle.v1" as const,
        exportedAt: "2026-08-14T00:01:00.000Z",
        project: {} as never,
        assets: [],
        fonts: [],
      },
    };
    const cloudProjectMetadata = { ...cloudProject, bundle: undefined, size: 2048 };
    delete (cloudProjectMetadata as { bundle?: unknown }).bundle;
    const fetcher: typeof fetch = async (input, init) => {
      requests.push({ url: String(input), init });
      if (String(input).endsWith("/v1/account")) return Response.json(authenticatedSnapshot);
      if (String(input).endsWith("/v1/auth/authorizations")) {
        return Response.json({ status: "redirect", authorizationUrl: "https://auth.glassware.dev/sign-in/request-1" });
      }
      if (String(input).endsWith("/v1/connections/chatgpt_codex_plugin/authorizations")) {
        return Response.json({ status: "device", authorization: {
          id: "authorization-1",
          status: "waiting",
          createdAt: "2026-08-14T00:00:00.000Z",
          expiresAt: "2026-08-14T00:15:00.000Z",
          verificationUrl: "https://auth.openai.com/activate",
          userCode: "ABCD-EFGH",
        } });
      }
      if (String(input).endsWith("/v1/connections/openai_api")) {
        return Response.json({ status: "connected", snapshot: {
          ...authenticatedSnapshot,
          connections: [{ id: "connection-1", kind: "openai_api", status: "connected", label: "OpenAI API ••••7890", createdAt: "2026-08-14T00:00:00.000Z" }],
        } });
      }
      if (String(input).endsWith("/v1/ai/jobs")) {
        return Response.json({ job: {
          id: "job-1",
          status: "completed",
          connectionId: "connection-1",
          model: "gpt-5.6-luna",
          reasoningEffort: "medium",
          createdAt: "2026-08-14T00:00:00.000Z",
          plan: {
            summary: "Rename the page",
            rationale: "The requested page name is exact.",
            assessment: "The current page still has its default name.",
            done: false,
            operations: [{ action: "rename_page", label: "Rename the active page", pageId: "page-1", name: "Agent parity proof", targetId: null, text: null, color: null, shape: null, align: null, x: null, y: null, width: null, height: null, fontSize: null, imagePrompt: null }],
          },
        } });
      }
      if (String(input).endsWith("/v1/ai/conversations") && (!init?.method || init.method === "GET")) {
        return Response.json({ conversations: [cloudConversation] });
      }
      if (String(input).endsWith(`/v1/ai/conversations/${cloudConversation.id}`) && init?.method === "PUT") {
        return Response.json({ status: "created", conversation: cloudConversation }, { status: 201 });
      }
      if (String(input).endsWith(`/v1/ai/conversations/${cloudConversation.id}`) && init?.method === "DELETE") {
        return new Response(null, { status: 204 });
      }
      if (String(input).endsWith("/v1/projects") && (!init?.method || init.method === "GET")) {
        return Response.json({ projects: [cloudProjectMetadata] });
      }
      if (String(input).endsWith(`/v1/projects/${cloudProject.id}`) && (!init?.method || init.method === "GET")) {
        return Response.json({ project: cloudProject });
      }
      if (String(input).endsWith(`/v1/projects/${cloudProject.id}`) && init?.method === "PUT") {
        return Response.json({ status: "created", project: cloudProjectMetadata }, { status: 201 });
      }
      if (String(input).endsWith(`/v1/projects/${cloudProject.id}`) && init?.method === "DELETE") {
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected request: ${input}`);
    };
    const client = createAccountServiceClient({ baseUrl: "https://account.glassware.dev/", fetch: fetcher });
    await client.getSnapshot();
    const providerSignIn = await client.startSignIn("wiplash", "https://app.glassware.dev");
    const authorization = await client.startChatGptConnection("project-1");
    const apiSnapshot = await client.connectApiKey("sk-example-1234567890", "project-1");
    const agentContext = {
      pass: 1,
      maxPasses: 6,
      baseRevisionId: "11111111-1111-4111-8111-111111111111",
      runId: "22222222-2222-4222-8222-222222222222",
    };
    const job = await client.createAiJob("connection-1", "Make it joyful", { id: "project-1" }, "gpt-5.6-luna", "medium", [], agentContext);
    const conversations = await client.listAiConversations();
    const cloudReceipt = await client.upsertAiConversation(cloudConversation);
    await client.deleteAiConversation(cloudConversation.id);
    const cloudProjects = await client.listProjects();
    const restoredProject = await client.getProject(cloudProject.id);
    const projectReceipt = await client.upsertProject(cloudProject);
    await client.deleteProject(cloudProject.id);

    expect(providerSignIn).toEqual({ status: "redirect", authorizationUrl: "https://auth.glassware.dev/sign-in/request-1" });
    expect(authorization).toMatchObject({ status: "device", authorization: { userCode: "ABCD-EFGH" } });
    expect(apiSnapshot.connections[0]).toMatchObject({ kind: "openai_api", label: "OpenAI API ••••7890" });
    expect(job).toMatchObject({ model: "gpt-5.6-luna", reasoningEffort: "medium" });
    expect(job.plan?.operations[0]).toMatchObject({ action: "rename_page", pageId: "page-1", name: "Agent parity proof" });
    expect(conversations[0]).toMatchObject({ title: "Make it joyful", projectName: "Launch card" });
    expect(cloudReceipt.status).toBe("created");
    expect(cloudProjects[0]).toMatchObject({ name: "Launch card", size: 2048 });
    expect(restoredProject.bundle.schemaVersion).toBe("glassware.bundle.v1");
    expect(projectReceipt.status).toBe("created");
    expect(requests[0].init?.credentials).toBe("include");
    expect(requests[1].url).toBe("https://account.glassware.dev/v1/auth/authorizations");
    expect(requests[1].init?.body).toBe(JSON.stringify({ provider: "wiplash", returnUrl: "https://app.glassware.dev" }));
    expect(requests[2].url).toBe("https://account.glassware.dev/v1/connections/chatgpt_codex_plugin/authorizations");
    expect(new Headers(requests[2].init?.headers).get("x-glassware-csrf")).toBe("csrf-only");
    expect(requests[2].init?.body).toBe(JSON.stringify({ projectId: "project-1" }));
    expect(requests[3].url).toBe("https://account.glassware.dev/v1/connections/openai_api");
    expect(requests[3].init?.body).toBe(JSON.stringify({ apiKey: "sk-example-1234567890", projectId: "project-1" }));
    expect(requests[4].url).toBe("https://account.glassware.dev/v1/ai/jobs");
    expect(requests[4].init?.body).toBe(JSON.stringify({ connectionId: "connection-1", prompt: "Make it joyful", project: { id: "project-1" }, model: "gpt-5.6-luna", reasoningEffort: "medium", attachments: [], agentContext }));
    expect(requests[5].url).toBe("https://account.glassware.dev/v1/ai/conversations");
    expect(requests[6].init?.method).toBe("PUT");
    expect(new Headers(requests[6].init?.headers).get("x-glassware-csrf")).toBe("csrf-only");
    expect(requests[7].init?.method).toBe("DELETE");
    expect(requests[8].url).toBe("https://account.glassware.dev/v1/projects");
    expect(requests[10].init?.method).toBe("PUT");
    expect(new Headers(requests[10].init?.headers).get("x-glassware-csrf")).toBe("csrf-only");
    expect(requests[11].init?.method).toBe("DELETE");
  });

  it("rejects unsafe service and authorization URLs", () => {
    expect(() => validateServiceBaseUrl("http://account.glassware.dev")).toThrow("HTTPS");
    expect(validateServiceBaseUrl("http://127.0.0.1:8789/")).toBe("http://127.0.0.1:8789");
    expect(() => validateAuthorizationUrl("javascript:alert(1)")).toThrow("unsafe");
  });

  it("parses subscription status and sends idempotent Stripe redirect requests", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const billing = {
      plan: "designer",
      planName: "Designer",
      status: "active",
      cloudAccess: "read_write",
      storageLimitBytes: 100 * 1024 ** 3,
      storageUsedBytes: 4096,
      checkoutAvailable: true,
      portalAvailable: true,
      currentPeriodEnd: "2026-10-01T00:00:00.000Z",
      cancelAt: null,
      downloadUntil: null,
      paymentFailureCount: 0,
      billingConfigured: true,
    } as const;
    const fetcher: typeof fetch = async (input, init) => {
      requests.push({ url: String(input), init });
      if (String(input).endsWith("/v1/account")) return Response.json({ ...authenticatedSnapshot, billing });
      if (String(input).endsWith("/v1/billing") && (!init?.method || init.method === "GET")) return Response.json(billing);
      if (String(input).endsWith("/v1/billing/checkout")) return Response.json({ status: "redirect", url: "https://checkout.stripe.com/c/pay/cs_test_glassware" });
      if (String(input).endsWith("/v1/billing/portal")) return Response.json({ status: "redirect", url: "https://billing.stripe.com/p/session/test_glassware" });
      throw new Error(`Unexpected request: ${input}`);
    };
    const client = createAccountServiceClient({ baseUrl: "https://account.glassware.dev", fetch: fetcher });
    expect((await client.getSnapshot()).billing.planName).toBe("Designer");
    expect((await client.getBilling()).storageLimitBytes).toBe(100 * 1024 ** 3);
    expect((await client.createBillingCheckout("designer", "annual", "checkout-request-1234")).url).toContain("checkout.stripe.com");
    expect((await client.createBillingPortal("portal-request-1234")).url).toContain("billing.stripe.com");
    expect(new Headers(requests[2].init?.headers).get("idempotency-key")).toBe("checkout-request-1234");
    expect(new Headers(requests[2].init?.headers).get("x-glassware-csrf")).toBe("csrf-only");
    expect(requests[2].init?.body).toBe(JSON.stringify({ plan: "designer", interval: "annual" }));
  });

  it("rejects non-Stripe billing redirects and surfaces structured billing errors", async () => {
    let unsafe = true;
    const fetcher: typeof fetch = async (input) => {
      if (String(input).endsWith("/v1/account")) return Response.json(authenticatedSnapshot);
      if (unsafe) return Response.json({ status: "redirect", url: "https://evil.example/checkout" });
      return Response.json({ error: { code: "billing_unavailable", message: "Checkout is unavailable for this account." } }, { status: 503 });
    };
    const client = createAccountServiceClient({ baseUrl: "https://account.glassware.dev", fetch: fetcher });
    await client.getSnapshot();
    await expect(client.createBillingCheckout("designer", "monthly", "checkout-request-1234")).rejects.toThrow("unsafe billing redirect");
    unsafe = false;
    await expect(client.createBillingCheckout("designer", "monthly", "checkout-request-5678")).rejects.toThrow("Checkout is unavailable");
  });

  it("parses opaque region-edit jobs without returning source pixels or prompts", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher: typeof fetch = async (input, init) => {
      requests.push({ url: String(input), init });
      if (String(input).endsWith("/v1/account")) return Response.json(authenticatedSnapshot);
      return Response.json({ job: {
        id: "region-job-1",
        status: "completed",
        connectionId: "connection-1",
        model: "gpt-5.6-luna",
        reasoningEffort: "low",
        createdAt: "2026-08-21T00:00:00.000Z",
        imageEdit: {
          imageDataUrl: "data:image/png;base64,iVBORw0KGgo=",
          provider: "openai_api",
          model: "gpt-image-2",
        },
      } });
    };
    const client = createAccountServiceClient({ baseUrl: "https://account.glassware.dev", fetch: fetcher });
    await client.getSnapshot();
    const job = await client.createImageEditJob(
      "connection-1",
      "data:image/png;base64,AAAA",
      "data:image/png;base64,BBBB",
      "Remove the selected object",
      "gpt-5.6-luna",
      "low",
    );
    expect(job.imageEdit).toMatchObject({ provider: "openai_api", model: "gpt-image-2" });
    expect(requests[1].url).toBe("https://account.glassware.dev/v1/ai/image-edits");
    expect(new Headers(requests[1].init?.headers).get("x-glassware-csrf")).toBe("csrf-only");
  });

  it("fails closed if an account response contains provider credentials", () => {
    expect(() => parseAccountSnapshot({ ...authenticatedSnapshot, connections: [{
      id: "connection-1",
      kind: "openai_api",
      status: "connected",
      label: "Personal API",
      createdAt: "2026-08-12T00:00:00.000Z",
      apiKey: "sk-do-not-return",
    }] })).toThrow("opaque connection identifiers");
  });
});
