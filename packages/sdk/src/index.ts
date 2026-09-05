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
  | { domain: string; proof: { engine: string; payload: unknown } }
  // byImage. Absent until now, which meant the four image fields below described a
  // method this package could not invoke.
  | { imageBase64: string };

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
/** RFC 9457 problem details, as W3C VCDM 2.0 section 7.2 requires. `type` is a URL. */
export interface VerifyProblem {
  type: string;
  title?: string;
  detail?: string;
}

/** A fact and whether it held. `value: null` means the fact could not be computed,
 *  which is NOT the same as false and must not be rendered as one. */
export interface VerifyFact<T> {
  verified: boolean;
  value: T | null;
}

/** The verification in the shape W3C VCDM 2.0 section 7.1 mandates.
 *
 *  `status` here is a boolean, per that section. The verdict word stays at the root
 *  of VerifyResult, where it always was. */
export interface VerifyReport {
  status: boolean;
  mediaType: string;
  controller: string | null;
  /** Unrecoverable: cryptography and data model. */
  errors: VerifyProblem[];
  /** Recoverable, or yours to weigh: status and validity periods. */
  warnings: VerifyProblem[];
  validFrom: VerifyFact<string>;
  validUntil: VerifyFact<string>;
  credentialStatus: { purpose: string; status: number }[];
  proof: VerifyFact<string>[];
  /** How the credential reached the verifier. Glemo's own field: no published
   *  vocabulary defines this. */
  provenance: "wallet" | "zktls" | "artifact" | "registry";
  observations: {
    issuerTrusted: VerifyFact<boolean>;
    subjectBound: VerifyFact<boolean>;
  };
}

export interface VerifyResult {
  status: string;
  checks: VerifyCheck[];
  issuer?: string;
  claims?: Record<string, string>;
  risk?: VerifyRisk;
  /** Who and what the credential names. Show it NEXT TO the verdict: a bare `valid`
   *  is not actionable for someone holding a document, because a genuine QR can be
   *  photographed off a real certificate and placed on a forged one, and the mismatch
   *  is only visible if you can read who the credential is actually about. */
  subject?: { recipientName: string | null; achievementName: string | null };
  /** byImage only: which layer produced the verdict. `baked` verified a signed
   *  credential inside the file; `qr` resolved the credential the certificate points
   *  at, which survives a screenshot and says nothing about the file. */
  imageLayer?: "baked" | "qr";
  /** byImage only. Whether the IMAGE was cryptographically checked, as opposed to the
   *  credential it refers to. False for `qr`. */
  imageAuthenticated?: boolean;
  /** Signed C2PA provenance the IMAGE carries about itself. Absent when the file has
   *  no manifest, which is the common case and is NOT evidence of anything. */
  imageProvenance?: { producer: string | null; edited: boolean };
  /** The separated facts. Added in 0.3.0; absent from older deployments. */
  report?: VerifyReport;
  /** A signed record of this verification: what you checked, what came back, and
   *  when. A Security Event Token (RFC 8417), typed secevent+jwt, with no expiry
   *  because it describes something that already happened.
   *
   *  Verify it against the issuer's JWKS with any JWT library. It needs no API key
   *  and no call to us, which is the point: it stays checkable if we are not here.
   *  Present on every terminal verdict, including the ones that failed. We keep no
   *  copy, so if you need it later, keep it. */
  signedEvidence?: string;
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
          : "imageBase64" in input
            ? { method: "byImage" as const, imageBase64: input.imageBase64 }
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
