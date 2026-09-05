import { beforeAll, expect, test, vi } from "vitest";

beforeAll(async () => {
  await import("./index"); // registers <glemo-verify>
});

function mount(attrs: Record<string, string>): HTMLElement {
  const el = document.createElement("glemo-verify");
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

function stubVerify(body: object, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(body, { status })),
  );
}

async function settle() {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

test("valid verdict renders inside the shadow root", async () => {
  stubVerify({ status: "valid", checks: [] });
  const el = mount({
    "credential-id": "11111111-1111-1111-1111-111111111111",
    "publishable-key": "glemo_test_pk",
    "base-url": "https://api.glemo.test",
  });
  await settle();
  expect(el.shadowRoot).not.toBeNull();
  expect(el.shadowRoot!.textContent).toContain("Verified");
  // isolation: nothing from the verdict in the light DOM
  expect(el.textContent).not.toContain("Verified");
  el.remove();
});

test("revoked and not_found show their state", async () => {
  stubVerify({ status: "revoked", checks: [] });
  const a = mount({ "credential-id": crypto.randomUUID(), "publishable-key": "pk" });
  await settle();
  expect(a.shadowRoot!.textContent).toContain("Revoked");
  a.remove();

  stubVerify({ status: "not_found", checks: [] });
  const b = mount({ "credential-id": crypto.randomUUID(), "publishable-key": "pk" });
  await settle();
  expect(b.shadowRoot!.textContent).toContain("Not found");
  b.remove();
});

test("API error (401) shows the error state, doesn't crash", async () => {
  stubVerify({ error: "unauthorized" }, 401);
  const el = mount({ "credential-id": crypto.randomUUID(), "publishable-key": "bad" });
  await settle();
  expect(el.shadowRoot!.textContent).toContain("Unable to verify");
  el.remove();
});

test("the publishable key travels as Bearer", async () => {
  let auth: string | null = null;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      auth = input.headers.get("authorization");
      return Response.json({ status: "valid", checks: [] });
    }),
  );
  const el = mount({ "credential-id": crypto.randomUUID(), "publishable-key": "glemo_test_pk1" });
  await settle();
  expect(auth).toBe("Bearer glemo_test_pk1");
  el.remove();
});

test("every verdict renders its label and a matching tone", async () => {
  const cases: Array<[string, string, string]> = [
    ["valid", "Verified", "ok"],
    ["expired", "Expired", "warn"],
    ["revoked", "Revoked", "bad"],
    ["tampered", "Invalid", "bad"],
    ["not_found", "Not found", "muted"],
    ["not_verifiable", "Not verifiable", "muted"],
  ];
  for (const [status, label, tone] of cases) {
    stubVerify({ status, checks: [] });
    const el = mount({ "credential-id": crypto.randomUUID(), "publishable-key": "pk" });
    await settle();
    const card = el.shadowRoot!.querySelector(".card")!;
    expect(card.textContent).toContain(label);
    expect(card.classList.contains(tone)).toBe(true);
    el.remove();
  }
});

test("missing required attributes render a clear misconfigured state, not a blank widget", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const el = mount({ "credential-id": crypto.randomUUID() }); // no publishable-key
  await settle();
  expect(el.shadowRoot!.textContent).toContain("Not configured");
  expect(el.shadowRoot!.innerHTML).not.toBe(""); // never a silent blank
  expect(warn).toHaveBeenCalled(); // and the developer is told why
  warn.mockRestore();
  el.remove();
});

test("the render exposes CSS custom properties for theming", async () => {
  stubVerify({ status: "valid", checks: [] });
  const el = mount({ "credential-id": crypto.randomUUID(), "publishable-key": "pk" });
  await settle();
  const style = el.shadowRoot!.querySelector("style")!.textContent!;
  expect(style).toContain("--glemo-verify:");
  expect(style).toContain("--glemo-warn:");
  expect(style).toMatch(/\.ok \.dot\s*{\s*background:\s*var\(--glemo-verify\)/);
  expect(style).toMatch(/\.warn \.dot\s*{\s*background:\s*var\(--glemo-warn\)/);
  el.remove();
});

test("labels themeable by attribute", async () => {
  stubVerify({ status: "valid", checks: [] });
  const el = mount({
    "credential-id": crypto.randomUUID(),
    "publishable-key": "pk",
    "label-valid": "Verified",
  });
  await settle();
  expect(el.shadowRoot!.textContent).toContain("Verified");
  el.remove();
});

// The contract says, in its own words, why `subject` exists: "a genuine QR can be
// photographed off a real certificate and placed on a forged one". The widget painted
// a bare `Verified` with no subject and no distinction between a signed file and a
// scanned pointer, which is the exact confusion the backend documented and then the
// only user-facing surface of this package enabled.
// The contract says, in its own words, why `subject` exists: "a genuine QR can be
// photographed off a real certificate and placed on a forged one". The widget painted
// a bare `Verified` with no subject and no distinction between a signed file and a
// scanned pointer, which is the exact confusion the backend documented and the only
// user-facing surface of this package then enabled.
test("a QR verdict is not presented as a verified document", async () => {
  stubVerify({
    status: "valid",
    checks: [],
    imageLayer: "qr",
    imageAuthenticated: false,
    subject: { recipientName: "Ana Garcia", achievementName: "Avalanche Fundamentals" },
  });
  const el = mount({
    "credential-id": "22222222-2222-2222-2222-222222222222",
    "publishable-key": "glemo_test_pk",
  });
  await settle();
  const text = el.shadowRoot?.textContent ?? "";
  expect(text).toContain("Ana Garcia");
  expect(text).toMatch(/scanned/i);
});

test("a signed file names who it is about, without the scanned caveat", async () => {
  stubVerify({
    status: "valid",
    checks: [],
    imageLayer: "baked",
    imageAuthenticated: true,
    subject: { recipientName: "Ana Garcia", achievementName: "Avalanche Fundamentals" },
  });
  const el = mount({
    "credential-id": "33333333-3333-3333-3333-333333333333",
    "publishable-key": "glemo_test_pk",
  });
  await settle();
  const text = el.shadowRoot?.textContent ?? "";
  expect(text).toContain("Ana Garcia");
  expect(text).not.toMatch(/scanned/i);
});
