/**
 * Structured logging utilities for debugging and monitoring
 *
 * Provides JSON-formatted logs with request context, error stack traces,
 * and structured metadata for easy parsing and analysis.
 */

import { getClientIp } from "../security/rate-limit.ts";
import { getSessionFromRequest } from "../auth/middleware.ts";

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

/**
 * Request context extracted from HTTP request
 */
export interface RequestContext {
  method: string;
  url: string;
  pathname: string;
  ip: string;
  userAgent?: string;
  userId?: string;
  email?: string;
}

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: RequestContext;
  metadata?: Record<string, unknown>;
}

/**
 * Extract request context from a Request object
 */
export async function extractRequestContext(
  req: Request,
): Promise<RequestContext> {
  const url = new URL(req.url);
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || undefined;

  // Try to extract user session if available
  let userId: string | undefined;
  let email: string | undefined;
  try {
    const session = await getSessionFromRequest(req);
    if (session) {
      userId = session.userId;
      email = session.email;
    }
  } catch {
    // Session extraction failed, continue without user context
  }

  return {
    method: req.method,
    url: req.url,
    pathname: url.pathname,
    ip,
    userAgent,
    userId,
    email,
  };
}

/**
 * Format log entry as JSON string
 */
function formatLogEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Write log entry to console (or other output in production)
 */
function writeLog(entry: LogEntry): void {
  const jsonLog = formatLogEntry(entry);

  // Use appropriate console method based on level
  switch (entry.level) {
    case LogLevel.DEBUG:
      console.debug(jsonLog);
      break;
    case LogLevel.INFO:
      console.info(jsonLog);
      break;
    case LogLevel.WARN:
      console.warn(jsonLog);
      break;
    case LogLevel.ERROR:
      console.error(jsonLog);
      break;
  }
}

/**
 * Create a log entry with optional request context
 */
async function createLogEntry(
  level: LogLevel,
  message: string,
  req?: Request,
  error?: Error | unknown,
  metadata?: Record<string, unknown>,
): Promise<LogEntry> {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(metadata && { metadata }),
  };

  // Extract error details if provided
  if (error) {
    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else {
      entry.error = {
        name: "UnknownError",
        message: String(error),
      };
    }
  }

  // Extract request context if provided
  if (req) {
    try {
      entry.context = await extractRequestContext(req);
    } catch (err) {
      // If context extraction fails, log without context
      entry.metadata = {
        ...entry.metadata,
        contextExtractionError: String(err),
      };
    }
  }

  return entry;
}

/**
 * Log a debug message
 */
export async function logDebug(
  message: string,
  req?: Request,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const entry = await createLogEntry(
    LogLevel.DEBUG,
    message,
    req,
    undefined,
    metadata,
  );
  writeLog(entry);
}

/**
 * Log an info message
 */
export async function logInfo(
  message: string,
  req?: Request,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const entry = await createLogEntry(
    LogLevel.INFO,
    message,
    req,
    undefined,
    metadata,
  );
  writeLog(entry);
}

/**
 * Log a warning message
 */
export async function logWarn(
  message: string,
  req?: Request,
  error?: Error | unknown,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const entry = await createLogEntry(
    LogLevel.WARN,
    message,
    req,
    error,
    metadata,
  );
  writeLog(entry);
}

/**
 * Log an error message with stack trace
 */
export async function logError(
  message: string,
  req?: Request,
  error?: Error | unknown,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const entry = await createLogEntry(
    LogLevel.ERROR,
    message,
    req,
    error,
    metadata,
  );
  writeLog(entry);
}

/**
 * Log an error from a route handler with full context
 * Convenience function for error handling in routes
 */
export async function logRouteError(
  req: Request,
  error: Error | unknown,
  message?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const errorMessage = message || "Route handler error";
  await logError(errorMessage, req, error, metadata);
}
