import { createHash } from "crypto";

// App-wide salt for consistent hashing of identifiers in logs
// This is not a security credential, just for consistent anonymization
const LOGGING_SALT = "forge-app-log-salt-v1";

/**
 * Create a stable, non-reversible hash of an identifier for privacy-safe logging
 * This allows correlating related log entries without exposing actual IDs
 * @param id - The identifier to hash (chatId, runId, etc.)
 * @returns A stable hex digest suitable for logs
 */
export function hashIdentifierForLogging(id: string): string {
  return createHash("sha256")
    .update(`${id}:${LOGGING_SALT}`)
    .digest("hex")
    .slice(0, 16); // Truncate to 16 chars for readability
}
