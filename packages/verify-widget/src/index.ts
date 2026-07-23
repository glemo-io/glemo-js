import { createGlemo } from "@glemo/sdk";

type WidgetState =
  | { kind: "idle" }
  | { kind: "misconfigured" }
  | { kind: "loading" }
  | { kind: "done"; status: string }
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
`;

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
      this.#state = { kind: "done", status: result.status };
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
    this.#root.innerHTML = `
      <style>${STYLES}</style>
      <span class="card ${tone}" role="status">
        <span class="dot"></span>
        <span>${this.#label(status)}</span>
        <span class="brand">glemo</span>
      </span>`;
  }
}

if (!customElements.get("glemo-verify")) {
  customElements.define("glemo-verify", GlemoVerifyElement);
}
