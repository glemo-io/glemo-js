export class GlemoError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class AuthenticationError extends GlemoError {}
export class PermissionError extends GlemoError {}
export class ValidationError extends GlemoError {}
export class ApiError extends GlemoError {}
export class NetworkError extends GlemoError {}

export class RateLimitError extends GlemoError {
  constructor(
    message: string,
    status: number,
    code: string | undefined,
    readonly retryAfter?: number,
  ) {
    super(message, status, code);
  }
}

interface ErrorBody {
  error?: string;
  message?: string;
}

/** Actionable fallbacks when the API returns no message (each names a cause and a fix). */
const DEFAULT_MESSAGE: Record<number, string> = {
  401: "Invalid or missing API key. Pass a valid apiKey (with the verify:read scope) to createGlemo().",
  403: "Your API key lacks the scope or plan for this operation. Check the key scopes (verify:read, issue:write).",
  422: "The request was invalid. Check the arguments you passed to verify() or issue().",
  429: "Rate limit exceeded. Retry after the retryAfter interval, or lower your request rate.",
};

export function errorFromResponse(
  status: number,
  body: ErrorBody,
  retryAfterHeader?: string | null,
): GlemoError {
  const code = body.error;
  const message =
    body.message ??
    body.error ??
    DEFAULT_MESSAGE[status] ??
    "The Glemo API returned an unexpected error. Retry; if it persists, contact support.";
  switch (status) {
    case 401:
      return new AuthenticationError(message, status, code);
    case 403:
      return new PermissionError(message, status, code);
    case 422:
      return new ValidationError(message, status, code);
    case 429: {
      const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;
      return new RateLimitError(message, status, code, retryAfter);
    }
    default:
      return new ApiError(message, status, code);
  }
}
