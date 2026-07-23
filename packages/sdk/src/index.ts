import createClient from "openapi-fetch";
import { GlemoError, NetworkError, errorFromResponse } from "./errors";
import type { paths } from "./schema";

export interface GlemoConfig {
  apiKey: string;
  baseUrl?: string;
  /** ms; default 10_000 */
  timeoutMs?: number;
  /** retries on network/5xx for verify(); default 1. issue() does NOT retry by default. */
  retries?: number;
  /** injectable for tests/custom environments */
  fetch?: typeof fetch;
}

export type VerifyInput =
  | { credentialId: string }
  | { jwt: string }
  | { domain: string; proof: { engine: string; payload: unknown } };

/** One verification check and whether it passed. */
export interface VerifyCheck {
  name: string;
  ok: boolean;
}

/** Anti-fraud risk score 0-100. A signal, never a verdict override. */
export interface VerifyRisk {
  score: number;
  signals: string[];
}

/**
 * The verdict for a credential. The public shape is curated and stable: it is NOT
 * derived from the backend's full OpenAPI contract, so the internal API surface is
 * never exposed through this package's types.
 */
export interface VerifyResult {
  status: string;
  checks: VerifyCheck[];
  issuer?: string;
  claims?: Record<string, string>;
  risk?: VerifyRisk;
  /** Measured server-side verification time in milliseconds. */
  latencyMs: number;
}

export interface IssueInput {
  recipient: { email?: string; did?: string; name?: string };
  achievement: { name: string; description?: string; criteria?: string };
  validUntil?: string;
  soulbound?: boolean;
}

/** The result of issuing a credential. */
export interface IssueResult {
  credentialId: string;
  subjectId: string;
  /** Public verification URL anyone can open. */
  publicUrl: string;
  jwt: string;
  sdJwt: string;
}

export interface Glemo {
  verify(input: VerifyInput): Promise<VerifyResult>;
  /** Issues a credential (scope issue:write). Does not retry by default:
   *  issuance is not idempotent server-side; opt in with { retries }. */
  issue(input: IssueInput, opts?: { retries?: number }): Promise<IssueResult>;
}

export function createGlemo(config: GlemoConfig): Glemo {
  const baseUrl = config.baseUrl ?? "https://api.glemo.io";
  const timeoutMs = config.timeoutMs ?? 10_000;
  const fetchImpl = config.fetch ?? fetch;

  const client = createClient<paths>({
    baseUrl,
    fetch: fetchImpl,
    headers: { Authorization: `Bearer ${config.apiKey}` },
  });

  /** A single request attempt with a timeout; errors come out typed. */
  async function attempt<T>(
    run: (signal: AbortSignal) => Promise<{ data?: T; error?: unknown; response: Response }>,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const { data, error, response } = await run(controller.signal);
      if (error !== undefined || data === undefined) {
        throw errorFromResponse(
          response.status,
          (error ?? {}) as { error?: string; message?: string },
          response.headers.get("retry-after"),
        );
      }
      return data;
    } catch (err) {
      if (err instanceof GlemoError) throw err;
      throw new NetworkError(err instanceof Error ? err.message : "network failure");
    } finally {
      clearTimeout(timer);
    }
  }

  /** Retries network/5xx only; 4xx is final. */
  async function withRetries<T>(retries: number, run: () => Promise<T>): Promise<T> {
    let lastError: GlemoError | undefined;
    for (let i = 0; i <= retries; i++) {
      try {
        return await run();
      } catch (err) {
        lastError = err as GlemoError;
        const retriable =
          lastError instanceof NetworkError ||
          (lastError.status !== undefined && lastError.status >= 500);
        if (!retriable) throw lastError;
      }
    }
    throw lastError as GlemoError;
  }

  function verify(input: VerifyInput): Promise<VerifyResult> {
    const body =
      "credentialId" in input
        ? { method: "byHash" as const, credentialId: input.credentialId }
        : "jwt" in input
          ? { method: "byVC" as const, jwt: input.jwt }
          : { method: "byZkTls" as const, domain: input.domain, proof: input.proof };
    return withRetries(config.retries ?? 1, () =>
      attempt((signal) => client.POST("/verify", { body, signal })),
    );
  }

  function issue(input: IssueInput, opts?: { retries?: number }): Promise<IssueResult> {
    // Default 0: issuing twice creates two credentials.
    return withRetries(opts?.retries ?? 0, () =>
      attempt((signal) => client.POST("/issue", { body: input, signal })),
    );
  }

  return { verify, issue };
}

export * from "./errors";
