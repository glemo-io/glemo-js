import { expect, test } from "vitest";
import {
  AuthenticationError,
  GlemoError,
  NetworkError,
  PermissionError,
  RateLimitError,
  ValidationError,
  errorFromResponse,
} from "./errors";

test("maps API statuses to typed errors", () => {
  expect(errorFromResponse(401, { error: "unauthorized" })).toBeInstanceOf(AuthenticationError);
  expect(errorFromResponse(403, { error: "forbidden" })).toBeInstanceOf(PermissionError);
  expect(errorFromResponse(422, { error: "validation" })).toBeInstanceOf(ValidationError);
  const rl = errorFromResponse(429, { error: "rate_limited" }, "17");
  expect(rl).toBeInstanceOf(RateLimitError);
  expect((rl as RateLimitError).retryAfter).toBe(17);
});

test("all extend GlemoError with actionable status and code", () => {
  const e = errorFromResponse(500, { error: "boom" });
  expect(e).toBeInstanceOf(GlemoError);
  expect(e.status).toBe(500);
  expect(e.code).toBe("boom");
});

test("NetworkError has no status (failure before response)", () => {
  const e = new NetworkError("timeout");
  expect(e).toBeInstanceOf(GlemoError);
  expect(e.status).toBeUndefined();
});

test("an empty body still yields an actionable message per status", () => {
  expect(errorFromResponse(401, {}).message).toMatch(/api key/i);
  expect(errorFromResponse(403, {}).message).toMatch(/scope|permission|plan/i);
  expect(errorFromResponse(422, {}).message).toMatch(/invalid|check/i);
  expect(errorFromResponse(429, {}).message).toMatch(/rate limit|retry/i);
  expect(errorFromResponse(500, {}).message).toMatch(/unexpected|retry/i);
  // never a bare "HTTP 401"
  expect(errorFromResponse(401, {}).message).not.toMatch(/^HTTP \d+$/);
});

test("an API-provided message wins over the default", () => {
  expect(errorFromResponse(401, { message: "token expired" }).message).toBe("token expired");
  expect(errorFromResponse(403, { error: "plan_required" }).message).toBe("plan_required");
});
