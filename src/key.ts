import 'dotenv/config';
import readline from "readline";
import { Entry } from '@napi-rs/keyring';

const API_KEY_NAME = "ANTHROPIC_API_KEY";

// Same keyring service used for Clerk session tokens (see sessions.ts) --
// reusing it here keeps all per-user secrets in one consistent, writable
// location regardless of where the npm package itself got installed to.
const SERVICE = 'blacdisk';
const ACCOUNT = 'anthropic_api_key';

async function ensureAnthropicApiKey(): Promise<string> {
  
  if (process.env[API_KEY_NAME]) {
    return process.env[API_KEY_NAME]!;
  }

  const existingFromKeyring = readKeyFromKeyring();
  if (existingFromKeyring) {
    process.env[API_KEY_NAME] = existingFromKeyring;
    return existingFromKeyring;
  }

  console.log("\nAn Anthropic API key is needed. It is stored securely locally for accurate token counting and reduction (this won't cost you anthropic api usage billing).");
  console.log("You can find/create one at https://console.anthropic.com/settings/keys\n");

  const apiKey = (await promptMasked("Enter your Anthropic API key: ")).trim();

  if (!apiKey) {
    throw new Error("No API key entered. Aborting.");
  }

  try {
    new Entry(SERVICE, ACCOUNT).setPassword(apiKey);
    console.log(`\nSaved to your system's secure credential store.\n`);
  } catch (err) {
    console.error(`\nFailed to save API key to the credential store:`, err);
    console.error("Continuing with the key for this session only (not persisted).\n");
  }

  process.env[API_KEY_NAME] = apiKey;
  return apiKey;
}

/** Reads ANTHROPIC_API_KEY out of the OS keychain, if previously saved there. */
function readKeyFromKeyring(): string | null {
  try {
    return new Entry(SERVICE, ACCOUNT).getPassword() ?? null;
  } catch {
    return null;
  }
}

function promptMasked(query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    let writing = false; // re-entrancy guard

    // @ts-expect-error - _writeToOutput is an internal readline API
    rl._writeToOutput = (stringToWrite: string) => {
      if (writing) return;
      writing = true;
      try {
        if (stringToWrite.startsWith(query)) {
          process.stdout.write(query); // initial prompt render
        } else {
          process.stdout.write("*".repeat(stringToWrite.length));
        }
      } finally {
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

export { ensureAnthropicApiKey };