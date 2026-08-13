# Account and AI connection contract

## Product boundary

GlassWare remains useful without an account. Signing in does not upload a
project, enable sync, or contact an AI provider. Accounts exist for explicit
cloud features: optional sync, project-scoped plugin authorization, encrypted
provider connections, sharing, and future team controls.

The public client supports two adapters:

- `device` stores a browser-bound profile for personalization when the account
  service is not configured. It never claims cloud authentication, enables
  sync, or creates pretend AI connections.
- `service` talks to the optional private account service configured by
  `VITE_GLASSWARE_ACCOUNT_API_URL`.

The device adapter stores only a display profile. Cloud actions remain visibly
unavailable. Production sign-in starts in the GlassWare modal and redirects to
the shared Wiplash Keycloak realm through a confidential BFF. Google and GitHub
are selected directly; GitLab is not offered for the GlassWare client. Sessions
return through protected HTTP-only cookies, and Keycloak tokens never enter the
browser app.

## Connection lanes

### ChatGPT/Codex plugin

The subscribed OpenAI client performs reasoning and calls narrow GlassWare MCP
tools. The OpenAI host acts as the OAuth client, while GlassWare's identity
provider authorizes access to the user's GlassWare account and project. The
editor never receives ChatGPT passwords, cookies, refresh tokens, or subscription
credentials.

### OpenAI API key

API usage is separately billed by OpenAI. A production key is entered only into
an encrypted server-side vault or future local companion. Browser and extension
code receive an opaque connection ID and safe status metadata; they never receive
the raw key back.

### Future local Codex companion

A local companion may use official `codex login` and the operating-system
credential store. The browser talks to that companion through a narrow localhost
protocol. This is separate from the plugin and API-key connections and is not
implemented by the current public client.

Official product references:

- [OpenAI Codex authentication](https://developers.openai.com/codex/auth)
- [OpenAI plugin OAuth authentication](https://developers.openai.com/plugins/build/auth)

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
POST   /v1/connections/{kind}/authorizations
DELETE /v1/connections/{connection_id}
```

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
  "csrfToken": "request-bound-csrf-value"
}
```

The account service must never serialize provider secrets. The public client
fails closed if a snapshot contains fields named `apiKey`, `accessToken`,
`refreshToken`, `password`, `secret`, `clientSecret`, or `authJson`.

Starting a connection returns either an HTTPS authorization redirect or an
updated account snapshot. Redirects are navigated as top-level browser flows;
tokens and one-time codes must not be placed in application logs or retained in
project state.

## Sync and project residency

`syncEnabled` is an account preference, not proof that a project has uploaded.
The future sync workflow must separately disclose which project metadata and
assets will leave the device, bind consent to a project revision, and expose
retention and deletion controls. Extension builds need a deliberate device-link
or web-app handoff rather than broad cross-origin host permissions.

## Required private-service controls

- Passwordless, passkey, or external identity login with secure session cookies.
- Exact-origin CORS, CSRF enforcement, rate limits, and abuse controls.
- Hashed one-time magic-link tokens with short expiry and one-time use.
- Tenant- and project-scoped authorization grants.
- Encrypted credential storage outside the application database.
- Immediate revocation, safe status receipts, and credential-redacted audit logs.
- No pooled ChatGPT accounts and no conversion of subscription access into API
  credits.
