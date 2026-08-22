# GlassWare pricing benchmark

Research date: August 21, 2026

Currency: USD, before tax
Scope: Public self-serve pricing shown by official vendor sources. Temporary promotions are called out and are not used as the primary GlassWare anchor.

## Competitor snapshot

| Product | Free entry | Individual paid plan | Higher tier | AI pricing pattern | Official source |
| --- | ---: | ---: | ---: | --- | --- |
| Canva | $0 | Pro: $180/year for one person ($15/month effective) | Business: $250/year/person ($20.83/month effective); Enterprise: contact sales | Plan allowances plus a separately sold AI Pass | [Canva pricing](https://www.canva.com/pricing/) |
| Adobe Express | $0 | Premium: $9.99/month | Teams: $7.99/license/month regular price, two-seat minimum; first-year promotions may be lower | Generative credits are bundled by plan | [Adobe Express pricing](https://www.adobe.com/express/pricing?locale=en-US) |
| PicMonkey | Trial, not a durable free editor tier | Basic: $7.99/month; Pro: $12.99/month | Business: $23/month | Paid editor tiers rather than a bring-your-own-AI model | [PicMonkey offer page](https://www.picmonkey.com/edit-photos-sem-stand-out), [PicMonkey pricing](https://www.picmonkey.com/pricing) |
| Pixlr | Limited free use | Plus: $2.49/month; Premium: $9.99/month | Ultra: $24.99/month; Ultra Max: $49.99/month | Each paid tier includes a defined monthly AI-credit allowance | [Pixlr pricing](https://pixlr.com/pricing/) |

Annual Pixlr billing lowers the displayed effective monthly rates to $1.99 for Plus, $7.99 for Premium, $19.99 for Ultra, and $39.99 for Ultra Max. PicMonkey also publishes older annual figures of $72 for Basic and $120 for Pro, but its [annual-price article](https://www.picmonkey.com/blog/how-much-is-picmonkey) is older than its current campaign page, so the current monthly offer is the safer comparison.

PicMonkey remains available, but Shutterstock says it is maintaining PicMonkey while development focuses on Creative Flow. That makes its current price useful as a benchmark, but its product trajectory a weaker model for GlassWare’s roadmap. See the [official Creative Flow FAQ](https://cdn-qa.picmonkey.com/help/accounts-and-billing/creative-flow-faqs/what-is-creative-flow-and-how-does-it-relate-to-picmonkey-users/index.html).

### Storage comparison

| Product | Entry storage | Individual paid storage | Higher-tier storage | Official source |
| --- | ---: | ---: | ---: | --- |
| Canva | Free: 5 GB | Pro: 100 GB | Business: 500 GB; Enterprise: 1 TB | [Canva pricing](https://www.canva.com/en_gb/pricing/) |
| Adobe Express | Free: 5 GB | Premium: 10 GB; Firefly Pro: 100 GB | Teams: 1 TB per user | [Adobe Express pricing](https://www.adobe.com/express/pricing) |
| PicMonkey | Basic: 1 GB | Pro: unlimited | Business: unlimited | [PicMonkey pricing](https://www.picmonkey.com/pricing) |

The market does not have one standard storage allowance at roughly $8/month. However, 100 GB for Designer at $7.99/month is competitive and generous: it matches Canva Pro’s published storage, exceeds Adobe Express Premium and PicMonkey Basic, and remains below the unlimited-storage promises attached to higher PicMonkey tiers. GlassWare should preserve the quota as a clear product boundary and watch actual image, font, revision, and conversation usage before changing it.

## What the market says

- A capable free tier is now the expected entry point for browser-first design products.
- Mainstream individual paid plans cluster around $8–$15 per month. Canva’s broader suite reaches above that range; lighter editors can price below it.
- Competitors commonly monetize storage, premium assets, collaboration, brand controls, and bundled AI credits together. This makes their headline prices imperfect comparisons for GlassWare.
- GlassWare has a credible wedge if the local editor and standard exports stay free while users pay only for Wiplash-operated cloud and collaboration. Bring-your-own AI access should not be represented as included model usage.

## Current pricing direction

### Creator — $0.00 forever

Keep local projects, normal editing, project bundles, and standard exports free, without a watermark or required account. This is both the product’s trust promise and the acquisition surface.

### Designer — $7.99 monthly or $5.99/month billed as $71.99 annually

Designer includes 100 GB of private storage for complete project sync, original assets, revision recovery, encrypted conversation sync, and account recovery. At the quota, existing work stays available but new uploads pause until the user removes content or changes plans.

### Director — $14.99/seat monthly or $11.99/seat/month billed as $143.99/seat annually

Director includes unlimited cloud storage plus shared workspaces, roles, brand-kit administration, comments, and approval flows.

## Billing and retention policy

The pricing page is final product copy and presents subscriptions as available today. The subscription workflow must enforce these policies:

1. Retry a failed subscription payment up to three times.
2. After the third failed attempt, make cloud work download-only for 30 calendar days.
3. Restore normal access when billing is resolved during that period.
4. Permanently delete cloud-hosted copies after 30 days of unresolved non-payment; on-device copies are unaffected.
5. Let account users export and delete cloud projects without support intervention.
6. Clearly distinguish OpenAI provider charges from GlassWare subscription charges.

Stripe Checkout, the customer portal, and signature-verified webhooks implement the payment boundary. The browser never chooses a Stripe Price ID and never grants itself an entitlement; the account service maps Designer and Director to server-owned prices and changes cloud access only after a verified subscription event.
