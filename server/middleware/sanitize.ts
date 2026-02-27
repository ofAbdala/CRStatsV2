/**
 * Text sanitization utilities for user-submitted content.
 *
 * Strips HTML tags and normalizes whitespace to prevent XSS on fields
 * that are stored and later rendered (coach messages, goal descriptions,
 * display names, etc.).
 *
 * Story 1.10, TD-059: XSS protection for user-submitted text fields.
 */

/**
 * Strip all HTML tags from a string and collapse whitespace.
 * Returns an empty string for null/undefined input.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (input == null) return "";

  return input
    // Remove all HTML tags (including self-closing and with attributes)
    .replace(/<[^>]*>/g, "")
    // Decode common HTML entities that might bypass tag stripping
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    // After decoding, strip any tags that were previously encoded
    .replace(/<[^>]*>/g, "")
    // Collapse multiple whitespace/newlines into single space
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sanitize an object's string fields in-place (shallow, one level).
 * Only processes keys listed in `fields`. Non-string or missing keys are skipped.
 */
export function sanitizeFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
): T {
  for (const key of fields) {
    const value = obj[key];
    if (typeof value === "string") {
      (obj as Record<string, unknown>)[key as string] = sanitizeText(value);
    }
  }
  return obj;
}

/**
 * Express middleware that sanitizes common user-submitted text fields
 * in the request body before they reach route handlers.
 *
 * Applies to POST/PATCH/PUT requests with JSON bodies.
 */
export function sanitizeBodyMiddleware(
  req: { method: string; body?: Record<string, unknown> },
  _res: unknown,
  next: () => void,
): void {
  if (
    req.body &&
    typeof req.body === "object" &&
    (req.method === "POST" || req.method === "PATCH" || req.method === "PUT")
  ) {
    // Sanitize common text fields that accept user content
    const textFields = [
      "displayName",
      "title",
      "description",
      "content",
      "name",
    ];

    for (const field of textFields) {
      if (typeof req.body[field] === "string") {
        req.body[field] = sanitizeText(req.body[field] as string);
      }
    }

    // Also sanitize nested messages array (coach chat)
    if (Array.isArray(req.body.messages)) {
      for (const msg of req.body.messages) {
        if (msg && typeof msg === "object" && typeof msg.content === "string") {
          msg.content = sanitizeText(msg.content);
        }
      }
    }
  }

  next();
}
