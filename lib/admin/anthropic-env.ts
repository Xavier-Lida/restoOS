import "server-only";

/** Default: Sonnet 4 for structured menu extraction (quality over cost). */
export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

export function getAnthropicApiKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

export function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
}

export function isAnthropicConfigured(): boolean {
  return getAnthropicApiKey() != null;
}
