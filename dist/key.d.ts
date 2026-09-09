import 'dotenv/config';
type KeyValidation = {
    ok: true;
} | {
    ok: false;
    reason: "invalid" | "network" | "unknown";
    message: string;
};
/**
 * Confirms a key actually authenticates against the Anthropic API.
 * Uses GET /v1/models -- it's metadata-only, so it doesn't burn any
 * token/usage billing, just like the request-a-key flow promises.
 */
declare function validateApiKey(apiKey: string): Promise<KeyValidation>;
declare function ensureAnthropicApiKey(): Promise<string>;
export { ensureAnthropicApiKey, validateApiKey };
//# sourceMappingURL=key.d.ts.map