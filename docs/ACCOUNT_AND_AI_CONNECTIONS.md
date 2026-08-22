# Account and AI connection contract

## Product boundary

GlassWare remains useful without an account. Signing in does not upload a
project, enable sync, or contact an AI provider. Accounts exist for explicit
cloud features: optional sync, encrypted AI connections, isolated Codex jobs,
sharing, and future team controls.

The public client supports two adapters:

- `device` preserves readable legacy browser profiles for migration only. It
  does not create new accounts, claim cloud authentication, enable sync, or
  create pretend AI connections.
- `service` talks to the optional private account service configured by
  `VITE_GLASSWARE_ACCOUNT_API_URL`.

Cloud actions remain visibly unavailable without the service. Production
sign-in starts with one Wiplash.ai action in the GlassWare modal and redirects
to the shared Wiplash Keycloak realm through a confidential BFF. The realm page
offers Google, GitHub, and GitLab when no Wiplash session exists and otherwise
reuses the existing SSO session. GlassWare still receives its own protected
HTTP-only session cookie; no app cookie or Keycloak token is shared with the
browser client.

## Connection lanes

Connection setup lives in a dedicated modal with three tabs. The ChatGPT and API
tabs configure encrypted credentials for a private AI workspace; the `Use your
AI` tab exposes the public `glassware-create/SKILL.md` link for external agents
that create portable project bundles without any account access.

### ChatGPT/Codex subscription

The private runner starts the official Codex CLI device-authorization flow. The
creator opens OpenAI's one-time page and enters the displayed code. The runner
encrypts the resulting Codex credential cache and decrypts it only into a
short-lived per-job credential directory. GlassWare never asks for ChatGPT
passwords, browser cookies, session-token copies, or a raw `auth.json` file.

### OpenAI API key

API usage is separately billed by OpenAI. The creator enters a key into the
explicit password field; it crosses the browser once over HTTPS to the account
service, is verified with OpenAI, and is encrypted in the private runner vault.
The browser clears the field after success and receives only an opaque
connection ID and safe status metadata. The key is never returned.

### Isolated use

Both connection lanes run the Codex CLI in disposable containers. A job receives
only a bounded project manifest, the user's request, a JSON output schema,
allowlisted user attachments, and one decrypted credential. It receives no
browser database, host project mount, Docker socket, unrelated account
credential, or persistent shell workspace.

The editor owns a maximum six-step visual loop. Each step receives the current
project and a clean rendered artboard preview, and is limited to three closely
related operations. The runner resumes the same private Codex thread between
steps and subsequent messages in that saved conversation, so the model retains
its prior reasoning while the browser applies each decision to a draft, renders
it, and returns the result for critique. Runner sessions expire after ten
minutes of inactivity; if one expires or the user changes models, the runner
starts a fresh sandbox thread and reconstructs conversational context from a
bounded transcript. Only the final draft enters revision history. A failure
restores the original snapshot.
**Undo AI edits**, **Redo AI edits**, and Ctrl/Command+Shift+Z move the complete
session in either direction. When manual work follows an AI session, GlassWare
selectively changes only untouched AI output and preserves later edits. There is
no unbounded server-side agent or per-step approval queue.

Conversation messages are cached per account and project in IndexedDB and
synced to an encrypted, account-owned archive. Opaque runner-session IDs remain
only in the local cache because they are temporary execution handles, not
portable conversation data. Closing Ask AI does not delete or restart the
current conversation; reopening restores it. Minimizing keeps the mounted widget, and
closing while a request is active minimizes it until the request finishes so a
receipt cannot be lost. The history drawer opens earlier project conversations,
while **New conversation** deliberately creates a blank context. Attachments are
not copied into chat history.

The compact project context includes the complete supported command contract:
canvas sizing/backgrounds/guides/snapping, text and all shape kinds, layer
update/removal/duplication/reordering/batch state, grouping, alignment,
distribution, blend modes, transforms, attached images, reusable Openverse
search, image generation, complete non-destructive adjustments, crops, masks,
selected-image frames/shadows/radius, text and shape shadows, whole-artwork
presentation, pages/templates, components/brand kits, and non-downloading
export preflight.
The runner installs an audited GlassWare design skill into each isolated Codex
home; it contains only editor-relevant composition, typography, spacing, layer,
Studio, page, reusable-resource, and export guidance and does not expose the host Codex home. Locked layers fail
closed. Openverse imports retain their license/source receipt.

PNG, JPEG, WebP, GIF, SVG, Markdown, plain-text, JSON, and CSV attachments are
allowlisted, count- and byte-limited, decoded into the disposable workspace,
and removed with it. Raster references and rendered previews use Codex image
input; text-like files are available only inside that job workspace.

When an API-key-connected agent explicitly requests a new raster image, the
runner may call GPT Image 2 once and return the generated image for local asset
storage. A ChatGPT-connected Codex thread may instead invoke Codex's built-in
`$imagegen` capability, save the selected artifact into the isolated workspace,
and return it through the same validated operation. Built-in generation counts
toward Codex usage; it is not represented as API credit or an API-key request.

### Model settings

Every AI job carries an allowlisted model and reasoning effort through the
browser, account BFF, private runner, and Codex CLI. The current choices are
`gpt-5.6-luna`, `gpt-5.6-terra`, and `gpt-5.6-sol`; GlassWare defaults to the
latest Luna model, `gpt-5.6-luna`. Supported reasoning settings are `none`,
`low`, `medium`, `high`, `xhigh`, and `max` at the runner compatibility layer.
The chat UI intentionally offers `low` through `max` and defaults new chats to
`low`; it does not expose ambiguous None or Default choices. Creators can raise
the effort for more complex composition or copy work.
Availability still follows the connected ChatGPT account or API project.

Official product references:

- [OpenAI Codex authentication](https://developers.openai.com/codex/auth)
- [OpenAI API authentication](https://platform.openai.com/docs/api-reference/authentication)

## Public client contract

The service base URL must use HTTPS, except for loopback development. Requests
use `credentials: include`; the session credential belongs in a secure,
HTTP-only, SameSite cookie. Every authenticated mutation includes the CSRF value
returned by `GET /v1/account` as `X-GlassWare-CSRF`.

```text
GET    /v1/account
POST   /v1/auth/authorizations
POST   /v1/auth/logout
PATCH  /v1/account/preferences
POST   /v1/connections/openai_api
POST   /v1/connections/chatgpt_codex_plugin/authorizations
GET    /v1/connections/chatgpt_codex_plugin/authorizations/{authorization_id}
DELETE /v1/connections/{connection_id}
POST   /v1/ai/jobs
POST   /v1/ai/image-edits
GET    /v1/ai/jobs/{job_id}
DELETE /v1/ai/jobs/{job_id}
GET    /v1/ai/conversations
PUT    /v1/ai/conversations/{conversation_id}
DELETE /v1/ai/conversations/{conversation_id}
```

An AI job request includes `connectionId`, `prompt`, the bounded project
manifest, `model`, `reasoningEffort`, up to five bounded `attachments`, and an
`agentContext` containing the pass, run ID, and exact base revision ID. The
runner rejects stale or mismatched revisions plus model, effort, attachment,
MIME, size, or pass values outside fixed allowlists before launching a
container. Cancellation is an authenticated, CSRF-bound mutation and aborts the
active disposable container. Job receipts may contain bounded input, cached
input, and output token counts, but never credentials.

A region-edit request contains one freshly rendered selected-image crop, one
same-sized PNG alpha mask, a bounded prompt, and the selected opaque connection
ID. It never contains the project bundle or unrelated layers/assets. The job
receipt returns provider/model provenance and one bounded raster, but not the
source, mask, or prompt.

`GET /v1/account` returns:

```json
{
  "account": {
    "id": "account_123",
    "email": "creator@example.com",
    "displayName": "Creator",
    "expiresAt": "2026-09-01T00:00:00Z",
    "mode": "authenticated"
  },
  "connections": [
    {
      "id": "connection_123",
      "kind": "chatgpt_codex_plugin",
      "status": "connected",
      "label": "Personal ChatGPT",
      "createdAt": "2026-08-12T00:00:00Z"
    }
  ],
  "syncEnabled": false,
  "aiRuntime": {
    "available": true,
    "message": "Private AI workspace is ready"
  },
  "csrfToken": "request-bound-csrf-value"
}
```

The account service must never serialize provider secrets. The public client
fails closed if a snapshot contains fields named `apiKey`, `accessToken`,
`refreshToken`, `password`, `secret`, `clientSecret`, or `authJson`.

ChatGPT connection starts return a short-lived device authorization containing
only an OpenAI URL, one-time code, status, and expiry. API-key connections return
an updated account snapshot after verification and encryption. Tokens, keys,
one-time codes, and credential caches must not enter application logs, URLs,
analytics, project state, or browser storage.

The public external-agent skill is bundled at
`/skills/glassware-create/SKILL.md` and published from the public repository at
`https://github.com/Wiplash-ai/glassware/blob/main/public/skills/glassware-create/SKILL.md`.
The raw GitHub URL is suitable for copy/paste into agents. The skill links to the
public project and bundle schemas and instructs an agent to return an importable
`.glassware.json` file. It contains no private endpoints or credentials.

## Sync and project residency

`syncEnabled` is an account preference, not proof that a project has uploaded.
AI conversation history is the one implemented automatic sync surface: it uses
the authenticated Keycloak subject as its owner, AES-256-GCM encryption at
rest, deterministic `updatedAt` conflict resolution, and idempotent deletion.
Each record is bounded to 60 messages and excludes attachments, provider
credentials, project manifests, image assets, font files, and runner-session
IDs. IndexedDB remains the offline cache; a newer cloud record restores on the
next signed-in Ask AI mount, while a newer local record is retried if the BFF is
temporarily unavailable.

The future sync workflow must separately disclose which project metadata and
assets will leave the device, bind consent to a project revision, and expose
retention and deletion controls. Extension builds need a deliberate device-link
or web-app handoff rather than broad cross-origin host permissions.

The project-level cloud action will use the visible label **Save** and the
tooltip **Save to cloud**. It must not appear as successful until a project
manifest, its referenced assets, and a revision receipt have reached the cloud
project API. The existing sync preference cannot substitute for that upload
receipt.

## Required private-service controls

- External-identity-only login with secure session cookies.
- Exact-origin CORS, CSRF enforcement, rate limits, and abuse controls.
- Tenant- and project-scoped authorization grants.
- Authenticated private-runner calls with an independently rotated service token.
- AES-256-GCM credential storage with account- and provider-bound authenticated data.
- Disposable non-root containers, dropped capabilities, bounded CPU/memory/PIDs,
  read-only roots, strict workspace mounts, timeouts, and bounded logs.
- Immediate revocation, safe status receipts, and credential-redacted audit logs.
- No pooled ChatGPT accounts and no conversion of subscription access into API
  credits.
