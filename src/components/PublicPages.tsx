import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  Image as ImageIcon,
  Layers3,
  LockKeyhole,
  MousePointer2,
  ScanSearch,
  Sparkles,
  WandSparkles,
} from "lucide-react";

const EDITOR_HREF = "./app.html";
const HOME_HREF = "./index.html";
const PRICING_HREF = "./pricing.html";
const PRIVACY_HREF = "./privacy.html";

function usePageMetadata(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]') ?? document.head.appendChild(document.createElement("meta"));
    meta.name = "description";
    meta.content = description;
  }, [description, title]);
}

function PublicNav() {
  return (
    <header className="public-nav">
      <a className="public-brand" href={HOME_HREF} aria-label="GlassWare home">
        <img src="./glassware-mark.svg" alt="" />
        <span><strong>GlassWare</strong><small>BY WIPLASH LABS</small></span>
      </a>
      <nav aria-label="GlassWare navigation">
        <a href={`${HOME_HREF}#features`}>Features</a>
        <a href={PRICING_HREF}>Pricing</a>
        <a href={PRIVACY_HREF}>Privacy</a>
        <a href="https://labs.wiplash.ai/" target="_blank" rel="noreferrer">Wiplash Labs</a>
      </nav>
      <a className="public-button primary public-nav-cta" href={EDITOR_HREF}>Open image editor <ArrowRight size={15} /></a>
    </header>
  );
}

function EditorPreview() {
  return (
    <div className="landing-editor-preview" aria-label="GlassWare editor preview">
      <div className="preview-topbar"><span /><span>Summer launch artwork</span><strong>EXPORT</strong></div>
      <div className="preview-tools" aria-hidden="true">
        <MousePointer2 /><ImageIcon /><Sparkles /><Layers3 />
      </div>
      <div className="preview-stage">
        <div className="preview-artboard">
          <span className="preview-kicker">NEW FROM WIPLASH LABS</span>
          <strong>MAKE<br />THE IMAGE.</strong>
          <div className="preview-glass-shape" />
          <small>One canvas. Every layer. Your AI.</small>
        </div>
      </div>
      <div className="preview-layers">
        <span>LAYERS</span>
        <div><i className="rainbow" /><b>Glass mark</b></div>
        <div><i /><b>Headline</b></div>
        <div><i /><b>Backdrop</b></div>
      </div>
    </div>
  );
}

export function LandingPage() {
  usePageMetadata(
    "GlassWare — the image editor that works with your AI",
    "Create layered artwork, edit images, and work with your own ChatGPT subscription or OpenAI API key in GlassWare by Wiplash Labs.",
  );
  return (
    <div className="public-shell landing-page">
      <PublicNav />
      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <p className="public-eyebrow"><span /> LOCAL-FIRST CREATIVE WORKBENCH</p>
            <h1>Your ideas.<br /><em>Your AI.</em><br />One canvas.</h1>
            <p className="hero-lede">Build layered graphics, polish screenshots, remove distractions, and ask an AI agent to edit beside you—not behind a paywall you cannot control.</p>
            <div className="hero-actions">
              <a className="public-button primary" href={EDITOR_HREF}>Open the image editor <ArrowRight size={17} /></a>
              <a className="public-button secondary" href="#demo">See the workbench</a>
            </div>
            <ul className="hero-proof" aria-label="GlassWare product principles">
              <li><Check size={14} /> No account required for local editing</li>
              <li><Check size={14} /> Original image assets stay editable</li>
              <li><Check size={14} /> Connect AI only when you choose</li>
            </ul>
          </div>
          <EditorPreview />
        </section>

        <section className="landing-principles" aria-label="GlassWare highlights">
          <p><span>01</span><strong>Layered, not flattened</strong><small>Text, shapes, images, masks, and effects remain editable.</small></p>
          <p><span>02</span><strong>Private by default</strong><small>Projects begin in your browser, with cloud saving as an account choice.</small></p>
          <p><span>03</span><strong>Bring the AI</strong><small>Use a ChatGPT subscription or your own OpenAI API key.</small></p>
        </section>

        <section className="landing-demo" id="demo">
          <div className="demo-heading">
            <p className="public-eyebrow">THE REAL PRODUCT</p>
            <h2>A creative workbench,<br />not a prompt box.</h2>
            <p>Use the editor yourself, hand a focused task to Luna, undo the result, compare it, and keep working. GlassWare treats AI edits like real revisions—not magic that replaces your canvas.</p>
            <a className="text-link" href={EDITOR_HREF}>Try the live editor <ArrowRight size={15} /></a>
          </div>
          <div className="demo-sequence" aria-label="GlassWare editing sequence">
            <article><span>SELECT</span><MousePointer2 /><strong>Work directly</strong><p>Move, group, mask, crop, recolor, annotate, and arrange every layer.</p></article>
            <article><span>ASK</span><Sparkles /><strong>Give the agent a goal</strong><p>Luna can inspect the artboard and use the same editing vocabulary you can.</p></article>
            <article><span>REVIEW</span><ScanSearch /><strong>Keep control</strong><p>See provenance, undo or redo an AI session, and preserve the original artwork.</p></article>
          </div>
        </section>

        <section className="landing-features" id="features">
          <div className="features-intro">
            <p className="public-eyebrow">WHAT IS INSIDE</p>
            <h2>The parts you expect.<br />The control you usually do not get.</h2>
          </div>
          <div className="feature-ledger">
            <article><span>01</span><h3>Image editing</h3><p>Crop, rotate, flip, mask, blur, adjust color and detail, apply frames, or paint a region for generative editing.</p></article>
            <article><span>02</span><h3>Design system</h3><p>Editable typography, custom fonts, shapes, markup, guides, snapping, groups, reusable components, and brand kits.</p></article>
            <article><span>03</span><h3>Presentation Studio</h3><p>Turn an image or full artwork into a polished screenshot with framing, shadows, corners, spacing, and backdrops.</p></article>
            <article><span>04</span><h3>Portable work</h3><p>Save locally, export PNG, JPG, WebP, or PDF, and carry complete GlassWare project bundles between machines.</p></article>
          </div>
        </section>

        <section className="landing-ai">
          <div className="ai-rainbow-line" aria-hidden="true" />
          <div>
            <p className="public-eyebrow">CONNECT YOUR AI</p>
            <h2>Use the intelligence<br />you already chose.</h2>
          </div>
          <div className="ai-copy">
            <p>ChatGPT connections and API keys stay outside project files. Disconnect and remove them whenever you want. GlassWare sends a provider only the prompt and creative context needed for the task you start.</p>
            <ul><li><LockKeyhole size={16} /> Encrypted private runner storage</li><li><WandSparkles size={16} /> Iterative artboard review</li><li><Layers3 size={16} /> Reversible AI revisions</li></ul>
          </div>
        </section>

        <section className="labs-demo-section">
          <div className="labs-mark"><img src="./wiplash-labs-logo.svg" alt="Wiplash Labs" /></div>
          <div><p className="public-eyebrow">A WIPLASH LABS PRODUCT</p><h2>Small tools.<br />Real leverage.</h2></div>
          <div><p>GlassWare is built at Wiplash Labs: practical software where people and capable agents can make useful work together.</p><a className="text-link" href="https://labs.wiplash.ai/" target="_blank" rel="noreferrer">Explore Wiplash Labs <ArrowRight size={15} /></a></div>
        </section>

        <section className="landing-final-cta">
          <div className="final-glass-grid" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
          <p className="public-eyebrow">OPEN THE WORKBENCH</p>
          <h2>Make something<br />worth keeping.</h2>
          <a className="public-button primary inverse" href={EDITOR_HREF}>Open GlassWare <ArrowRight size={17} /></a>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

const freeFeatures = [
  "Complete local editor and Studio tools",
  "On-device projects, assets, fonts, and revisions",
  "PNG, JPG, WebP, PDF, and project-bundle exports",
  "Free BYOAI connection with a GlassWare account",
];

const cloudFeatures = [
  "Everything in Creator",
  "Projects, original assets, fonts, and revisions across devices",
  "Encrypted AI conversation sync",
  "Account recovery and protected cloud storage",
];

const directorFeatures = [
  "Everything in Designer",
  "Shared workspaces and project handoff",
  "Team brand kits, roles, and permissions",
  "Comments, review, and approval workflows",
];

function PricingFeatures({ items }: { items: string[] }) {
  return <ul className="pricing-features">{items.map((item) => <li key={item}><Check size={16} />{item}</li>)}</ul>;
}

export function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const annual = billing === "annual";
  usePageMetadata(
    "GlassWare Pricing — create for free, add cloud when you need it",
    "GlassWare editing and BYOAI access are free. Compare the Creator, Designer, and Director plans with monthly or annual billing.",
  );

  return (
    <div className="public-shell pricing-page">
      <PublicNav />
      <main>
        <section className="pricing-hero">
          <div>
            <p className="public-eyebrow"><span /> TRANSPARENT PRICING</p>
            <h1>The editor is free.<br /><em>Cloud is the service.</em></h1>
          </div>
          <div className="pricing-hero-copy">
            <p>Create and export on your device without a watermark or account. BYOAI is free for Creators; sign in only when you are ready to connect supported AI access or save work in the cloud.</p>
            <div className="pricing-preview-note"><strong>AVAILABLE TODAY</strong><span>Creator stays $0.00. Designer and Director add the storage you need.</span></div>
          </div>
        </section>

        <section className="pricing-plans" aria-labelledby="pricing-plans-heading">
          <div className="pricing-plans-heading">
            <div><p className="public-eyebrow">PLANS</p><h2 id="pricing-plans-heading">Start creating.<br />Add the storage you need.</h2></div>
            <div className="billing-toggle" role="group" aria-label="Billing period">
              <button type="button" aria-pressed={!annual} onClick={() => setBilling("monthly")}>Monthly</button>
              <button type="button" aria-pressed={annual} onClick={() => setBilling("annual")}>Annual <small>best value</small></button>
            </div>
          </div>

          <div className="pricing-grid">
            <article className="pricing-card active-plan">
              <header><span>FREE FOREVER</span><h3>Creator</h3><p>For making and exporting artwork on your own device.</p></header>
              <div className="price-lockup"><strong>$0.00</strong><span>forever</span></div>
              <p className="pricing-storage"><strong>On-device</strong> storage</p>
              <PricingFeatures items={freeFeatures} />
              <a className="public-button primary" href={EDITOR_HREF}>Open the editor <ArrowRight size={16} /></a>
            </article>

            <article className="pricing-card featured-plan">
              <header><span>100 GB INCLUDED</span><h3>Designer</h3><p>For keeping complete personal work available across devices.</p></header>
              <div className="price-lockup"><strong>${annual ? "5.99" : "7.99"}</strong><span>/ month</span></div>
              <p className="price-note">{annual ? "$71.99 billed annually" : "$7.99 billed monthly"}</p>
              <p className="pricing-storage"><strong>100 GB</strong> private cloud storage</p>
              <PricingFeatures items={cloudFeatures} />
              <a className="public-button primary" href={`${EDITOR_HREF}?subscribe=designer&billing=${billing}`} aria-label="Upgrade to Designer">Upgrade <ArrowRight size={16} /></a>
            </article>

            <article className="pricing-card future-plan">
              <header><span>UNLIMITED STORAGE</span><h3>Director</h3><p>For shared creative work, brand control, and no storage ceiling.</p></header>
              <div className="price-lockup"><strong>${annual ? "11.99" : "14.99"}</strong><span>/ seat / month</span></div>
              <p className="price-note">{annual ? "$143.99 per seat billed annually" : "$14.99 per seat billed monthly"}</p>
              <p className="pricing-storage"><strong>Unlimited</strong> team cloud storage</p>
              <PricingFeatures items={directorFeatures} />
              <a className="public-button primary" href={`${EDITOR_HREF}?subscribe=director&billing=${billing}`} aria-label="Upgrade to Director">Upgrade <ArrowRight size={16} /></a>
            </article>
          </div>
        </section>

        <section className="pricing-promise">
          <p className="public-eyebrow">THE GLASSWARE PROMISE</p>
          <h2>Your files stay portable.<br />Your AI stays yours.</h2>
          <div>
            <p><strong>No export trap.</strong> On-device creation and standard exports stay available for Creators.</p>
            <p><strong>BYOAI stays free.</strong> Sign in to connect supported AI access as a Creator; provider charges and limits remain between you and that provider.</p>
            <p><strong>Pay for the cloud.</strong> Paid GlassWare plans cover hosted storage, recovery, and collaboration—not a second charge for AI access you already have.</p>
          </div>
        </section>

        <section className="pricing-faq">
          <div><p className="public-eyebrow">QUESTIONS</p><h2>Things worth knowing.</h2></div>
          <div>
            <article><h3>Can I use GlassWare without paying?</h3><p>Yes. Creator includes the complete editor, Studio tools, on-device project storage, standard exports, and BYOAI connection for $0.00. Editing and exporting do not require an account.</p></article>
            <article><h3>What is BYOAI?</h3><p>BYOAI means Bring Your Own AI. Sign in to GlassWare, then connect supported ChatGPT access or an OpenAI API key you control. GlassWare does not add an AI usage fee; your provider’s charges and limits still apply.</p></article>
            <article><h3>Why does BYOAI require an account?</h3><p>Your account protects the AI authorization, keeps it out of artwork files and browser storage, and lets you disconnect it from GlassWare whenever you want.</p></article>
            <article><h3>Which paid plan should I choose?</h3><p>Upgrade to Designer for one person and up to 100 GB of private storage. Choose Director when you need shared workspaces, brand controls, review tools, and unlimited team storage.</p></article>
            <article><h3>What counts toward cloud storage?</h3><p>Cloud storage includes project files, original images, uploaded fonts, thumbnails, revisions, and synced AI conversations. If a Designer account reaches 100 GB, existing work stays available while new uploads pause until you free space or upgrade to Director.</p></article>
            <article><h3>Can I subscribe today?</h3><p>Yes. Upgrade to Designer or Director above, sign in with your Wiplash.ai account, and complete the secure Stripe checkout. The annual prices are displayed as a monthly equivalent, with the full annual charge shown beneath.</p></article>
            <article><h3>What happens if a payment fails?</h3><p>We retry the payment up to three times. After the third unsuccessful attempt, cloud access becomes download-only for 30 calendar days so you can restore billing or download your work. If payment is still unresolved after 30 days, cloud-hosted copies are permanently deleted. Files already saved on your device are not affected.</p></article>
            <article><h3>Can I take my projects somewhere else?</h3><p>Yes. Export standard images and PDFs or download a portable GlassWare project bundle. Free exports do not include a GlassWare watermark.</p></article>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

function PolicySection({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <section className="policy-section" id={`policy-${number}`}><span>{number}</span><div><h2>{title}</h2>{children}</div></section>;
}

export function PrivacyPage() {
  usePageMetadata(
    "GlassWare Privacy Policy",
    "How GlassWare stores local artwork, handles optional account sync, and processes user-directed AI requests.",
  );
  return (
    <div className="public-shell privacy-page">
      <PublicNav />
      <main className="policy-layout">
        <aside className="policy-index">
          <p>GLASSWARE PRIVACY</p>
          <a href="#policy-01">At a glance</a><a href="#policy-02">Information</a><a href="#policy-03">Storage</a><a href="#policy-04">AI</a><a href="#policy-05">Services</a><a href="#policy-06">Uses</a><a href="#policy-07">Retention</a><a href="#policy-08">Choices</a><a href="#policy-09">Security</a><a href="#policy-10">Children</a><a href="#policy-11">Changes</a><a href="#policy-12">Contact</a>
        </aside>
        <article className="policy-document">
          <header>
            <p className="public-eyebrow">PRODUCT-SPECIFIC PRIVACY NOTICE</p>
            <h1>Privacy,<br />without the fog.</h1>
            <p>This notice explains how GlassWare handles artwork, account information, connected AI credentials, and creative requests. It supplements the <a href="https://wiplash.ai/legal/privacy" target="_blank" rel="noreferrer">Wiplash.ai Privacy Policy</a>.</p>
            <dl><div><dt>Last updated</dt><dd>August 21, 2026</dd></div><div><dt>Company</dt><dd>Westward Envoy Technologies LLC d/b/a Wiplash.ai</dd></div><div><dt>Service</dt><dd>GlassWare by Wiplash Labs</dd></div></dl>
          </header>

          <PolicySection number="01" title="At a glance">
            <ul><li>Local editing does not require an account.</li><li>Projects and original image assets begin in your browser’s private storage.</li><li>Cloud saving and AI conversation sync are optional account features.</li><li>AI credentials are encrypted outside browser storage and project files.</li><li>GlassWare does not sell personal information or use artwork for advertising.</li></ul>
          </PolicySection>
          <PolicySection number="02" title="Information we handle">
            <p><strong>Information you provide.</strong> Artwork, uploaded images, project names, text, fonts, brand assets, AI prompts, chat attachments, support messages, and settings you choose.</p>
            <p><strong>Account information.</strong> If you sign in, we receive your Wiplash account identifier, display name, email address, and session information. A social sign-in provider may also provide the profile information you authorize.</p>
            <p><strong>Subscription information.</strong> If you upgrade, Stripe collects your payment method and billing details on Stripe-hosted pages. GlassWare receives your plan, subscription and payment status, renewal dates, storage use, and opaque Stripe customer/subscription identifiers. GlassWare does not receive or store your full card number or card security code.</p>
            <p><strong>Technical information.</strong> Our servers can receive IP address, browser and device details, requested URLs, timestamps, authentication events, rate-limit events, and security logs needed to operate and protect the service.</p>
          </PolicySection>
          <PolicySection number="03" title="Local and cloud storage">
            <p>GlassWare stores local projects, original assets, fonts, components, brand kits, and revision history in browser storage on your device. Clearing site data or removing the extension can delete that local copy.</p>
            <p>If you enable account sync, GlassWare sends protected project archives and AI conversation archives to Wiplash account services. Account-scoped cloud records are encrypted at rest and are not public. Provider credentials are excluded from project and conversation archives.</p>
          </PolicySection>
          <PolicySection number="04" title="AI connections and creative requests">
            <p>You can connect a ChatGPT subscription or provide an OpenAI API key. GlassWare stores the resulting authorization material in encrypted private runner storage—not in the browser, artwork bundle, or conversation archive. You can disconnect it from AI settings.</p>
            <p>When you start an AI task, GlassWare sends the chosen provider the prompt and bounded creative context needed for that task. That can include an artboard preview, project structure, selected attachments, or—for region editing—only the selected image crop and its mask. Your provider’s terms, privacy policy, plan settings, and model-training controls also apply.</p>
            <p>GlassWare does not convert ChatGPT credentials into OpenAI API usage and does not use your artwork or prompts to train a Wiplash-controlled model.</p>
          </PolicySection>
          <PolicySection number="05" title="Other services">
            <p>GlassWare can contact the following services when you choose the related feature:</p>
            <ul><li><strong>Wiplash.ai and its identity service</strong> for accounts, sessions, encrypted cloud records, and AI-runner access.</li><li><strong>Stripe</strong> for hosted checkout, payment processing, invoices, subscription management, and fraud prevention.</li><li><strong>Google, GitHub, or GitLab</strong> if you choose that sign-in method.</li><li><strong>OpenAI or ChatGPT/Codex</strong> for user-directed AI requests.</li><li><strong>Openverse</strong> for reusable-image searches and source receipts.</li><li><strong>Google Fonts</strong> when you browse or load a hosted font.</li></ul>
            <p>Links and imported resources from third parties are governed by their own privacy practices.</p>
          </PolicySection>
          <PolicySection number="06" title="How we use information">
            <p>We use information to provide editing, saving, export, sign-in, sync, subscription billing, and AI features; respond to support; diagnose failures; prevent abuse; enforce service rules; protect accounts and infrastructure; and comply with law.</p>
            <p>GlassWare currently uses only essential session and security cookies. It does not include advertising trackers or optional product analytics.</p>
          </PolicySection>
          <PolicySection number="07" title="Retention and deletion">
            <p>Local content remains until you delete it in GlassWare, clear browser data, or remove the application. Cloud projects and conversations remain until you delete them or close the associated account. After a third failed subscription payment, cloud copies become download-only for 30 calendar days and are deleted if payment remains unresolved at the end of that period. Files already saved on your device are unaffected.</p>
            <p>We retain limited subscription, payment-status, invoice, fraud-prevention, tax, security, and transaction records as needed to provide billing, resolve disputes, meet financial recordkeeping duties, and comply with law. Stripe retains payment information under its own privacy and retention terms.</p>
            <p>Connected AI authorization remains until you disconnect it, the provider revokes it, or its refreshable authorization expires. Operational and security logs are kept only as long as reasonably needed for reliability, abuse prevention, dispute resolution, and legal obligations.</p>
          </PolicySection>
          <PolicySection number="08" title="Your choices and rights">
            <p>You can edit without an account, turn cloud sync on or off, export portable project copies, delete local or cloud records, disconnect AI providers, and sign out. Paid users can update payment details, change or cancel a subscription, and view invoices through the Stripe customer portal. Depending on where you live, you may also request access, correction, deletion, restriction, or portability of personal information.</p>
            <p>Email <a href="mailto:support@wiplash.ai?subject=GlassWare%20Privacy%20Request">support@wiplash.ai</a> with the subject “GlassWare Privacy Request.” We may verify your identity before completing a request.</p>
          </PolicySection>
          <PolicySection number="09" title="Security and transfers">
            <p>We use encryption in transit, encrypted credential, cloud-record, and billing-mapping storage, account isolation, CSRF protection, signed Stripe webhooks, access controls, bounded provider requests, and private service boundaries. No system can guarantee perfect security.</p>
            <p>Wiplash is based in the United States. If you use GlassWare elsewhere, information used for account, cloud, support, or AI features may be processed in the United States or another location used by the provider you choose.</p>
          </PolicySection>
          <PolicySection number="10" title="Children">
            <p>GlassWare is intended for people age 16 and older. We do not knowingly collect personal information from children under 16. Contact support if you believe a child provided personal information.</p>
          </PolicySection>
          <PolicySection number="11" title="Changes to this notice">
            <p>We will update this page when GlassWare’s data practices materially change. Where required, we will provide additional notice through the application, website, or account email. The date at the top shows the latest revision.</p>
          </PolicySection>
          <PolicySection number="12" title="Contact">
            <p>Privacy questions and requests: <a href="mailto:support@wiplash.ai">support@wiplash.ai</a><br />Legal notices: <a href="mailto:legal@wiplash.ai">legal@wiplash.ai</a></p>
            <a className="public-button primary" href={EDITOR_HREF}>Open the image editor <ArrowRight size={16} /></a>
          </PolicySection>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}

function PublicFooter() {
  return (
    <footer className="public-footer">
      <a className="public-brand" href={HOME_HREF}><img src="./glassware-mark.svg" alt="" /><span><strong>GlassWare</strong><small>BY WIPLASH LABS</small></span></a>
      <nav><a href={EDITOR_HREF}>Editor</a><a href={PRICING_HREF}>Pricing</a><a href={PRIVACY_HREF}>Privacy</a><a href="https://wiplash.ai/" target="_blank" rel="noreferrer">Wiplash.ai</a><a href="mailto:support@wiplash.ai">Support</a></nav>
      <small>© 2026 Westward Envoy Technologies LLC. All rights reserved.</small>
    </footer>
  );
}
