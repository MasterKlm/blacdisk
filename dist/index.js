#!/usr/bin/env node
import readline from "readline";
import { PassThrough } from "stream";
import { Command } from 'commander';
import { checkBillingStatus, loginCommand, requestCard } from "./auth.js";
import { isLoggedIn } from "./sessions.js";
import { renderBlacdiskLogo } from "./maskot.js";
import { runBlacDiskPipeline } from "./pipe.js";
import { ensureAnthropicApiKey } from "./key.js";
import chalk from "chalk";
const program = new Command();
let startBlacdisk = false;
program
    .name("blacdisk")
    .description("description")
    .version("1.0");
function askForPrompt(status) {
    return new Promise(async (resolve, reject) => {
        // Filter out mouse/trackpad ANSI sequences before they reach readline
        const cleanInput = new PassThrough();
        const onStdinData = (chunk) => {
            const str = chunk.toString();
            const stripped = str
                .replace(/\x1B\[<[0-9;]+[mM]/g, '') // SGR (1006) mouse sequences
                .replace(/\x1B\[M[\s\S]{3}/g, ''); // X10 mouse sequences (button byte + coords)
            if (stripped.length > 0) {
                cleanInput.write(stripped);
            }
        };
        process.stdin.on('data', onStdinData);
        const rl = readline.createInterface({
            input: cleanInput,
            output: process.stdout
        });
        console.clear();
        process.stdout.write("\n\n");
        await renderBlacdiskLogo();
        const width = process.stdout.columns || 80;
        const hr = "─".repeat(width);
        console.log();
        console.log("What prompt do you have in mind?\n");
        if (status != null && status.freeTokensRemaining >= 0)
            console.log(chalk.yellow("Free Tokens Savings Remaining: ", status.freeTokensRemaining));
        console.log(hr);
        rl.question("\x1b[1m\x1b[34m> \x1b[0m", (prompt) => {
            readline.moveCursor(process.stdout, 0, -1);
            readline.clearLine(process.stdout, 0);
            console.log(hr);
            process.stdin.removeListener('data', onStdinData);
            rl.close();
            if (prompt.length > 0)
                resolve(prompt);
            else
                reject(new Error("Type a prompt before running"));
        });
    });
}
program.command("claude")
    .action(async () => {
    try {
        process.stdout.write('\x1b]0;Blacdisk\x07');
        let isSignedIn = await isLoggedIn();
        if (!isSignedIn) {
            console.log("You are currently not logged in. Please Signup/Login below...");
            await loginCommand();
            isSignedIn = true;
            startBlacdisk = true;
        }
        else {
            startBlacdisk = true;
        }
        const status = await checkBillingStatus();
        let effectiveStatus = status;
        if (status === null) {
            console.log('Not logged in, or check failed.');
        }
        else if (!status.hasPaymentMethod && status.freeTokensRemaining <= 0) {
            effectiveStatus = await requestCard(status); // now waits here instead of exiting
        }
        else {
            console.log(chalk.green(`Free tokens Savings remaining: ${status.freeTokensRemaining}`));
        }
        if (!startBlacdisk && !isSignedIn)
            process.exit(0);
        await ensureAnthropicApiKey();
        const prompt = await askForPrompt(effectiveStatus);
        await runBlacDiskPipeline(prompt);
    }
    catch (err) {
        console.error("\nblacdisk encountered an error:", err);
        process.exitCode = 1;
    }
});
program.parse();
//# sourceMappingURL=index.js.map