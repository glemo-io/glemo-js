import { expect, test, vi } from "vitest";
import { AuthenticationError, NetworkError, PermissionError } from "./errors";
import { createGlemo } from "./index";

const okBody = { status: "valid", checks: [{ name: "lookup", ok: true }] };

function fakeFetch(responses: Array<() => Response | Promise<Response>>): typeof fetch {
  let i = 0;
  return vi.fn(async () => {
    const r = responses[Math.min(i++, responses.length - 1)]!;
    return r();
  }) as unknown as typeof fetch;
}

test("verify byHash returns the typed verdict", async () => {
  const glemo = createGlemo({
    apiKey: "glemo_test_x",
    fetch: fakeFetch([() => Response.json(okBody)]),
  });
  const r = await glemo.verify({ credentialId: "11111111-1111-1111-1111-111111111111" });
  expect(r.status).toBe("valid");
  expect(r.checks[0]?.name).toBe("lookup");
});

test("sends the API key as Bearer and the correct method", async () => {
  let seen: { auth: string | null; body: unknown } | undefined;
  // openapi-fetch calls fetch(Request), not fetch(url, init)
  const f = (async (input: Request) => {
    seen = {
      auth: input.headers.get("authorization"),
      body: await input.clone().json(),
    };
    return Response.json(okBody);
  }) as unknown as typeof fetch;
  const glemo = createGlemo({ apiKey: "glemo_test_abc", fetch: f });
  await glemo.verify({ jwt: "a.b.c" });
  expect(seen?.auth).toBe("Bearer glemo_test_abc");
  expect(seen?.body).toEqual({ method: "byVC", jwt: "a.b.c" });
});

test("401 throws AuthenticationError", async () => {
  const glemo = createGlemo({
    apiKey: "bad",
    fetch: fakeFetch([() => Response.json({ error: "unauthorized" }, { status: 401 })]),
  });
  await expect(glemo.verify({ credentialId: crypto.randomUUID() })).rejects.toBeInstanceOf(
    AuthenticationError,
  );
});

test("retries once on network failure then throws NetworkError", async () => {
  let calls = 0;
  const f = (async () => {
    calls++;
    throw new TypeError("fetch failed");
  }) as unknown as typeof fetch;
  const glemo = createGlemo({ apiKey: "k", fetch: f });
  await expect(glemo.verify({ credentialId: crypto.randomUUID() })).rejects.toBeInstanceOf(
    NetworkError,
  );
  expect(calls).toBe(2); // attempt + 1 retry
});

test("5xx retries and, if it persists, throws ApiError with status", async () => {
  const glemo = createGlemo({
    apiKey: "k",
    fetch: fakeFetch([
      () => Response.json({ error: "boom" }, { status: 500 }),
      () => Response.json({ error: "boom" }, { status: 500 }),
    ]),
  });
  await expect(glemo.verify({ credentialId: crypto.randomUUID() })).rejects.toMatchObject({
    status: 500,
  });
});

test("verify({ domain, proof }) posts method byZkTls and returns claims", async () => {
  let seen: unknown;
  const f = (async (input: Request) => {
    seen = await input.clone().json();
    return Response.json({
      status: "valid",
      checks: [{ name: "provider_schema", ok: true }],
      issuer: "coursera.org",
      claims: { learnerName: "Ada" },
    });
  }) as unknown as typeof fetch;
  const glemo = createGlemo({ apiKey: "glemo_test_k", fetch: f });
  const r = await glemo.verify({
    domain: "coursera.org",
    proof: { engine: "mock", payload: { x: 1 } },
  });
  expect(seen).toEqual({
    method: "byZkTls",
    domain: "coursera.org",
    proof: { engine: "mock", payload: { x: 1 } },
  });
  expect(r.status).toBe("valid");
  expect(r.claims).toEqual({ learnerName: "Ada" });
});

test("issue() posts to /issue and returns the typed outcome", async () => {
  let seen: { auth: string | null; body: unknown } | undefined;
  const f = (async (input: Request) => {
    seen = { auth: input.headers.get("authorization"), body: await input.clone().json() };
    return Response.json(
      {
        credentialId: "c-1",
        subjectId: "mailto:ada@uni.edu",
        publicUrl: "https://app.glemo.io/verify/c-1",
        jwt: "a.b.c",
        sdJwt: "a.b.c~ZGlzY2xvc3VyZQ~",
      },
      { status: 201 },
    );
  }) as unknown as typeof fetch;
  const glemo = createGlemo({ apiKey: "glemo_test_k", fetch: f });
  const r = await glemo.issue({
    recipient: { email: "ada@uni.edu", name: "Ada" },
    achievement: { name: "Avalanche 101" },
  });
  expect(seen?.auth).toBe("Bearer glemo_test_k");
  expect(seen?.body).toMatchObject({
    recipient: { email: "ada@uni.edu" },
    achievement: { name: "Avalanche 101" },
  });
  expect(r.credentialId).toBe("c-1");
  expect(r.publicUrl).toContain("c-1");
});

test("issue() with 403 (scope) throws PermissionError", async () => {
  const glemo = createGlemo({
    apiKey: "k",
    fetch: fakeFetch([() => Response.json({ error: "forbidden" }, { status: 403 })]),
  });
  await expect(
    glemo.issue({ recipient: { email: "a@b.co" }, achievement: { name: "X" } }),
  ).rejects.toBeInstanceOf(PermissionError);
});

test("issue() does NOT retry by default on network failure (non-idempotent)", async () => {
  let calls = 0;
  const f = (async () => {
    calls++;
    throw new Error("network down");
  }) as unknown as typeof fetch;
  const glemo = createGlemo({ apiKey: "k", fetch: f, retries: 3 }); // global retries does NOT apply to issue
  await expect(
    glemo.issue({ recipient: { email: "a@b.co" }, achievement: { name: "X" } }),
  ).rejects.toBeInstanceOf(NetworkError);
  expect(calls).toBe(1);
});

test("issue() with explicit retries does retry", async () => {
  let calls = 0;
  const f = (async () => {
    calls++;
    if (calls === 1) throw new Error("network down");
    return Response.json(
      { credentialId: "c-2", subjectId: "s", publicUrl: "u", jwt: "j", sdJwt: "s~" },
      { status: 201 },
    );
  }) as unknown as typeof fetch;
  const glemo = createGlemo({ apiKey: "k", fetch: f });
  const r = await glemo.issue(
    { recipient: { email: "a@b.co" }, achievement: { name: "X" } },
    { retries: 1 },
  );
  expect(r.credentialId).toBe("c-2");
  expect(calls).toBe(2);
});
