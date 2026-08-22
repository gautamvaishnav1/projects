export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = "Bad request", details?: unknown) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = "Unauthorized", details?: unknown) {
    return new ApiError(401, message, details);
  }
  static forbidden(message = "Forbidden", details?: unknown) {
    return new ApiError(403, message, details);
  }
  static notFound(message = "Not found", details?: unknown) {
    return new ApiError(404, message, details);
  }
  static conflict(message = "Conflict", details?: unknown) {
    return new ApiError(409, message, details);
  }
  static unprocessable(message = "Unprocessable entity", details?: unknown) {
    return new ApiError(422, message, details);
  }
  static tooManyRequests(message = "Too many requests", details?: unknown) {
    return new ApiError(429, message, details);
  }
  static badGateway(message = "Upstream service failed", details?: unknown) {
    return new ApiError(502, message, details);
  }
  static internal(message = "Internal server error", details?: unknown) {
    return new ApiError(500, message, details);
  }
}
