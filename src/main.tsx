import { createRoot } from "react-dom/client";
import App from "./App";
import { LandingPage, PricingPage, PrivacyPage } from "./components/PublicPages";
import "./styles.css";

const entry = window.location.pathname.split("/").pop()?.toLowerCase() || "index.html";
const extensionEditor = window.location.protocol === "chrome-extension:";
const surface = extensionEditor || entry === "app.html"
  ? "editor"
  : entry === "pricing.html"
    ? "pricing"
  : entry === "privacy.html"
    ? "privacy"
    : "landing";

document.body.classList.toggle("editor-surface", surface === "editor");
document.body.classList.toggle("public-surface", surface !== "editor");
document.documentElement.classList.toggle("public-document", surface !== "editor");

createRoot(document.getElementById("root")!).render(
  surface === "editor" ? <App /> : surface === "pricing" ? <PricingPage /> : surface === "privacy" ? <PrivacyPage /> : <LandingPage />,
);
