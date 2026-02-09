export type ParsedClashTag = {
  withHash: string;
  withoutHash: string;
};

const TAG_REGEX = /^[A-Z0-9]+$/;

/**
 * Parses and normalizes a Clash Royale tag.
 * - Accepts with or without leading '#'
 * - Normalizes to uppercase
 * - Validates length and allowed characters (A-Z, 0-9)
 */
export function parseClashTag(input: string | null | undefined): ParsedClashTag | null {
  if (input === null || input === undefined) return null;

  const trimmed = String(input).trim();
  if (!trimmed) return null;

  // Only allow a single leading '#'
  const withoutLeadingHash = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (withoutLeadingHash.includes("#")) return null;

  const normalized = withoutLeadingHash.toUpperCase();
  if (normalized.length < 3 || normalized.length > 16) return null;
  if (!TAG_REGEX.test(normalized)) return null;

  return {
    withoutHash: normalized,
    withHash: `#${normalized}`,
  };
}

