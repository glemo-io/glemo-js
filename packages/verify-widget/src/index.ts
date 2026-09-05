import { createGlemo } from "@glemo/sdk";

type WidgetState =
  | { kind: "idle" }
  | { kind: "misconfigured" }
  | { kind: "loading" }
  | {
      kind: "done";
      status: string;
      /** Who the credential is about. A bare verdict cannot be checked against a
       *  document in someone's hand. */
      subject?: { recipientName: string | null; achievementName: string | null } | null;
      /** Which layer answered an image verification. `qr` means the credential was
       *  resolved from a code on the page, which says nothing about the page. */
      imageLayer?: "baked" | "qr";
    }
  | { kind: "error" };

/** Brand defaults (same OKLCH values as @glemo/ui). Overridable via CSS vars. */
const STYLES = `
:host {
  --glemo-bg: oklch(0.19 0.014 170);
  --glemo-ink: oklch(0.96 0.005 165);
  --glemo-muted: oklch(0.75 0.015 168);
  --glemo-verify: oklch(0.82 0.155 165);
  --glemo-warn: oklch(0.78 0.14 75);
  --glemo-danger: oklch(0.68 0.19 25);
  --glemo-radius: 12px;
  display: inline-block;
  font-family: system-ui, sans-serif;
}
.card {
  background: var(--glemo-bg);
  color: var(--glemo-ink);
  border-radius: var(--glemo-radius);
  padding: 14px 18px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  line-height: 1.4;
}
.dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.ok .dot { background: var(--glemo-verify); }
.warn .dot { background: var(--glemo-warn); }
.bad .dot { background: var(--glemo-danger); }
.muted .dot { background: var(--glemo-muted); }
.brand { color: var(--glemo-muted); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; }
.who { font-weight: 600; }
.what { color: var(--glemo-muted); }
/* The caveat is deliberately not styled as an error: a QR verdict is a real verdict
   about a real credential. What it is not is a statement about the piece of paper. */
.caveat { color: var(--glemo-muted); font-size: 11px; font-style: italic; }
`;

/** Everything interpolated into the shadow root comes from the API, and the API
 *  carries names people typed. Escaped rather than trusted. */
function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

const DEFAULT_LABELS: Record<string, string> = {
  loading: "Verifying…",
  valid: "Verified",
  revoked: "Revoked",
  expired: "Expired",
  not_found: "Not found",
  not_verifiable: "Not verifiable",
  tampered: "Invalid",
  error: "Unable to verify",
  misconfigured: "Not configured",
};

/** The dot tone per status: green for valid, amber for expired, red for the hard
 *  failures, neutral for the informational ones. */
const TONE: Record<string, "ok" | "warn" | "bad" | "muted"> = {
  valid: "ok",
  expired: "warn",
  revoked: "bad",
  tampered: "bad",
  error: "bad",
  not_found: "muted",
  not_verifiable: "muted",
  loading: "muted",
  misconfigured: "muted",
};

export class GlemoVerifyElement extends HTMLElement {
  static observedAttributes = ["credential-id", "publishable-key", "base-url"];

  #state: WidgetState = { kind: "idle" };
  #root: ShadowRoot;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
  }

  connectedCallback(): void {
    void this.#run();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) void this.#run();
  }

  #label(status: string): string {
    return (
      this.getAttribute(`label-${status.replace("_", "-")}`) ?? DEFAULT_LABELS[status] ?? status
    );
  }

  async #run(): Promise<void> {
    const credentialId = this.getAttribute("credential-id");
    const apiKey = this.getAttribute("publishable-key");
    if (!credentialId || !apiKey) {
      const missing = [!credentialId && "credential-id", !apiKey && "publishable-key"]
        .filter(Boolean)
        .join(" and ");
      console.warn(`<glemo-verify> is missing the ${missing} attribute; nothing to verify.`);
      this.#state = { kind: "misconfigured" };
      this.#render();
      return;
    }

    this.#state = { kind: "loading" };
    this.#render();
    try {
      const glemo = createGlemo({
        apiKey,
        baseUrl: this.getAttribute("base-url") ?? undefined,
        retries: 0,
      });
      const result = await glemo.verify({ credentialId });
      this.#state = {
        kind: "done",
        status: result.status,
        subject: result.subject,
        imageLayer: result.imageLayer,
      };
    } catch {
      this.#state = { kind: "error" };
    }
    this.#render();
  }

  #render(): void {
    const s = this.#state;
    if (s.kind === "idle") {
      this.#root.innerHTML = "";
      return;
    }
    const status =
      s.kind === "done"
        ? s.status
        : s.kind === "error"
          ? "error"
          : s.kind === "misconfigured"
            ? "misconfigured"
            : "loading";
    const tone = TONE[status] ?? "bad";
    const done = s.kind === "done" ? s : null;
    // The name, next to the verdict. The backend's own contract says why: a genuine
    // QR can be photographed off a real certificate and placed on a forged one, and
    // the mismatch is only visible if the reader can see who the credential is about.
    const name = done?.subject?.recipientName;
    const what = done?.subject?.achievementName;
    // And the caveat, only for the layer that earns it. `baked` verified the file
    // itself; `qr` only resolved the credential the page points at.
    const scanned = done?.imageLayer === "qr";
    this.#root.innerHTML = `
      <style>${STYLES}</style>
      <span class="card ${tone}" role="status">
        <span class="dot"></span>
        <span>${this.#label(status)}</span>
        ${name ? `<span class="who">${escapeHtml(name)}</span>` : ""}
        ${what ? `<span class="what">${escapeHtml(what)}</span>` : ""}
        ${scanned ? `<span class="caveat">scanned from the page, not the file</span>` : ""}
        <span class="brand">glemo</span>
      </span>`;
  }
}

if (!customElements.get("glemo-verify")) {
  customElements.define("glemo-verify", GlemoVerifyElement);
}
