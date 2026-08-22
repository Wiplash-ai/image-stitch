# GlassWare privacy review notes

The public `privacy.html` notice is a product-specific supplement to the Wiplash.ai Privacy Policy. It reflects the implementation as of August 21, 2026 and should receive qualified legal review before a production launch.

## Data inventory

| Data | Default location | Optional recipient | User control |
| --- | --- | --- | --- |
| Projects, original images, fonts, brand kits, components, revisions | Browser IndexedDB | Wiplash account project sync | Delete locally, disable sync, delete cloud project, export portable copy |
| Account identifier, display name, email, session | Wiplash account/identity services | User-selected social identity provider | Sign out, account/privacy request |
| Plan, subscription status, renewal dates, storage use, opaque Stripe IDs | Encrypted Wiplash account billing store | Stripe | Customer portal, cancel subscription, billing/privacy request |
| Payment method, billing address, invoice and transaction data | Stripe | Stripe payment and fraud-prevention services | Stripe-hosted checkout and customer portal |
| AI authorization material | Encrypted private GlassWare AI runner | OpenAI/ChatGPT during authorization and use | Disconnect at any time |
| AI prompts, bounded project context, attachments | Active private AI job | User-selected AI provider | Cancel job, delete conversation, disconnect provider |
| Region-edit image crop and alpha mask | Active private AI job | User-selected AI provider | Cancel job; crop/mask are not conversation-sync content |
| Open-image search query and selected source URL | Browser | Openverse | Use local upload instead |
| Hosted font request | Browser | Google Fonts | Upload a local font instead |
| Operational and security events | Wiplash services | Infrastructure providers | Privacy request subject to security/legal exceptions |

## Legal review required

- Confirm the parent Wiplash.ai policy and Terms govern GlassWare accounts, cloud sync, and AI runner use.
- Confirm processor agreements and international-transfer terms for hosting, identity, OpenAI, and Stripe.
- Set documented retention windows for operational logs, deleted cloud archives, and backups before replacing the current purpose-limited language with exact periods.
- Confirm state, California, and international privacy-right wording against launch geography and actual thresholds.
- Keep the statement that GlassWare has no advertising analytics accurate; update the policy and consent controls before adding analytics.
- Verify the deletion workflow end to end before launch, including project archives, conversations, credentials, account records, and backup expiry.
- Confirm financial-record retention, tax obligations, refund terms, chargeback handling, and Stripe's processor/controller role with qualified counsel. The 30-day non-payment deletion applies to cloud artwork and conversations, not records that must be retained for billing, fraud prevention, or law.
