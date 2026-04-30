import { createHash } from "crypto";

// App-wide salt for consistent hashing of identifiers in logs
// This is not a security credential, just for consistent anonymization
const LOGGING_SALT = "forge-app-log-salt-v1";

/**
 * Create a stable, non-reversible hash of an identifier for privacy-safe logging.
 * This allows correlating related log entries without exposing actual IDs.
 *
 * Defaults to 32 hex chars (128 bits) to reduce collision risk while keeping
 * log output readable. The length can be overridden by callers if needed.
 *
 * @param id - The identifier to hash (chatId, runId, etc.)
 * @param length - Number of hex characters to keep from the digest
 * @returns A stable hex digest suitable for logs
 */
export function hashIdentifierForLogging(id: string, length = 32): string {
  return createHash("sha256")
    .update(`${id}:${LOGGING_SALT}`)
    .digest("hex")
    .slice(0, length);
}
