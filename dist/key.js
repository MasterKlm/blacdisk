import 'dotenv/config';
import readline from "readline";
import { Entry } from '@napi-rs/keyring';
const API_KEY_NAME = "ANTHROPIC_API_KEY";
// Same keyring service used for Clerk session tokens (see sessions.ts) --
// reusing it here keeps all per-user secrets in one consistent, writable
// location regardless of where the npm package itself got installed to.
const SERVICE = 'blacdisk';
const ACCOUNT = 'anthropic_api_key';
/**
 * Confirms a key actually authenticates against the Anthropic API.
 * Uses GET /v1/models -- it's metadata-only, so it doesn't burn any
 * token/usage billing, just like the request-a-key flow promises.
 */
async function validateApiKey(apiKey) {
    try {
        const res = await fetch("https://api.anthropic.com/v1/models", {
            method: "GET",
            headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
        });
        if (res.ok) {
            return { ok: true };
        }
        if (res.status === 401) {
            // Anthropic returns 401 for missing/invalid/expired/revoked keys.
            let message = "Your Anthropic API key is invalid or has expired.";
            try {
                const body = await res.json();
                if (body?.error?.message)
                    message = body.error.message;
            }
            catch {
                // ignore parse errors, fall back to default message
            }
            return { ok: false, reason: "invalid", message };
        }
        // Other statuses (403, 429, 5xx) aren't "expired key" -- don't treat
        // them as invalid, since that could wrongly force a re-prompt during
        // e.g. a transient outage or rate limit.
        return {
            ok: false,
            reason: "unknown",
            message: `Unexpected response validating API key (HTTP ${res.status}).`,
        };
    }
    catch (err) {
        return {
            ok: false,
            reason: "network",
            message: err instanceof Error ? err.message : "Network error while validating API key.",
        };
    }
}
async function ensureAnthropicApiKey() {
    const envKey = process.env[API_KEY_NAME];
    if (envKey) {
        const result = await validateApiKey(envKey);
        if (result.ok)
            return envKey;
        if (result.reason === "invalid") {
            console.error(`\n${result.message}`);
            console.error("The ANTHROPIC_API_KEY environment variable is set but no longer works.");
            if (!process.stdin.isTTY) {
                throw new Error("ANTHROPIC_API_KEY is invalid or expired, and no interactive terminal is available to prompt for a new one. " +
                    "Update the ANTHROPIC_API_KEY environment variable and retry.");
            }
            return promptAndSaveNewKey();
        }
        // Network/unknown errors: don't block startup on a connectivity blip,
        // just warn and proceed with the key we have.
        console.error(`\nWarning: could not verify Anthropic API key (${result.message}). Proceeding anyway.\n`);
        return envKey;
    }
    const existingFromKeyring = readKeyFromKeyring();
    if (existingFromKeyring) {
        const result = await validateApiKey(existingFromKeyring);
        if (result.ok) {
            process.env[API_KEY_NAME] = existingFromKeyring;
            return existingFromKeyring;
        }
        if (result.reason === "invalid") {
            console.error(`\n${result.message}`);
            console.error("The saved Anthropic API key no longer works it may be expired and needs to be updated.");
            if (!process.stdin.isTTY) {
                throw new Error("The saved Anthropic API key is invalid or expired, and no interactive terminal is available to prompt for a new one. " +
                    "Set the ANTHROPIC_API_KEY environment variable and retry.");
            }
            return promptAndSaveNewKey();
        }
        console.error(`\nWarning: could not verify saved Anthropic API key (${result.message}). Proceeding anyway.\n`);
        process.env[API_KEY_NAME] = existingFromKeyring;
        return existingFromKeyring;
    }
    if (!process.stdin.isTTY) {
        throw new Error("No ANTHROPIC_API_KEY is set and no interactive terminal is available to prompt for one. " +
            "Set the ANTHROPIC_API_KEY environment variable and retry.");
    }
    console.log("\nAn Anthropic API key is needed. It is stored securely locally for accurate token counting and reduction (this won't cost you anthropic api usage billing).");
    console.log("You can find/create one at https://console.anthropic.com/settings/keys\n");
    return promptAndSaveNewKey();
}
/** Prompts for a fresh key, validates it, and saves it to the keyring. Retries on invalid input. */
async function promptAndSaveNewKey() {
    if (!process.stdin.isTTY) {
        throw new Error("Cannot prompt for an Anthropic API key: no interactive terminal is available. " +
            "Set the ANTHROPIC_API_KEY environment variable and retry.");
    }
    while (true) {
        const apiKey = (await promptMasked("Enter your Anthropic API key: ")).trim();
        if (!apiKey) {
            throw new Error("No API key entered. Aborting.");
        }
        const result = await validateApiKey(apiKey);
        if (!result.ok && result.reason === "invalid") {
            console.log(`\n${result.message} Please check the key and try again.\n`);
            continue;
        }
        if (!result.ok) {
            // Network/unknown issue validating -- don't block the user forever,
            // just let them proceed and surface the warning.
            console.error(`\nWarning: could not verify the key (${result.message}). Saving it anyway.\n`);
        }
        try {
            new Entry(SERVICE, ACCOUNT).setPassword(apiKey);
            console.log(`\nSaved to your system's secure credential store.\n`);
        }
        catch (err) {
            console.error(`\nFailed to save API key to the credential store:`, err);
            console.error("Continuing with the key for this session only (not persisted).\n");
        }
        process.env[API_KEY_NAME] = apiKey;
        return apiKey;
    }
}
/** Reads ANTHROPIC_API_KEY out of the OS keychain, if previously saved there. */
function readKeyFromKeyring() {
    try {
        return new Entry(SERVICE, ACCOUNT).getPassword() ?? null;
    }
    catch {
        return null;
    }
}
function promptMasked(query) {
    return new Promise((resolve, reject) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        let writing = false; // re-entrancy guard
        // @ts-expect-error - _writeToOutput is an internal readline API
        rl._writeToOutput = (stringToWrite) => {
            if (writing)
                return;
            writing = true;
            try {
                if (stringToWrite.startsWith(query)) {
                    process.stdout.write(query); // initial prompt render
                }
                else {
                    process.stdout.write("*".repeat(stringToWrite.length));
                }
            }
            finally {
                writing = false;
            }
        };
        rl.question(query, (answer) => {
            rl.close();
            process.stdin.setRawMode?.(false);
            process.stdin.removeAllListeners("data");
            process.stdin.removeAllListeners("keypress");
            process.stdin.resume();
            process.stdout.write("\n");
            resolve(answer);
        });
        rl.on("error", reject);
    });
}
export { ensureAnthropicApiKey, validateApiKey };
//# sourceMappingURL=key.js.map