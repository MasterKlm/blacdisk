import * as pty from 'node-pty';
//import { render } from 'ink';
import { calcPercentageChanged, getClaudeImageInputTokens, getClaudeTextFileInputTokens, getClaudeTextInputTokens, getFileContent, getPsuedoRandomIntInclusive, sleep } from "./utils.js";
import { MODELS } from "./configureClaudeSession.js";
import chalk from 'chalk';
import inquirer from 'inquirer';
import { createSpinner } from "nanospinner";
import { model } from "./base.js";
import * as child_process from "child_process";
import { spawn } from 'cross-spawn';
import { fileURLToPath } from "url";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { resolveExecutablePath } from "./resolveExecutable.js";
import { STRICT_SYSTEM_PROMPT } from "./sys.js";
import { configureClaudeSession } from "./configureClaudeSession.js";
import { getCurrentUserId } from "./auth.js";
import { getValidAccessToken } from "./sessions.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const curretOSPlatformName = os.platform() == 'win32' ? 'windows' : os.platform() == 'darwin' ? 'macos' : 'linux';
const currentWorkingDir = process.cwd();
let isClaudeCodeAvailable = false;
const spinner = createSpinner();
function getPlatformTag() {
    const platform = os.platform(); // 'win32' | 'linux' | 'darwin' | ...
    const arch = os.arch(); // 'x64' | 'arm64' | ...
    if (platform === "win32" && arch === "x64")
        return "win32-x64";
    if (platform === "linux" && arch === "x64")
        return "linux-x64";
    if (platform === "darwin" && arch === "arm64")
        return "darwin-arm64";
    throw new Error(`blackdisk has no prebuilt executable for ${platform}/${arch}. ` +
        `Supported: win32-x64, linux-x64, darwin-arm64.`);
}
function getExecutableName() {
    return os.platform() === "win32" ? "blackdisk.exe" : "blackdisk";
}
const executablePath = resolveExecutablePath();
async function selectContextWithGemini(prompt, allPaths) {
    const systemPrompt = "Based on this prompt and these files which are in the current directory, please provide only the file paths of files that are relevant to the prompt. Keep it short only the paths in the form of a list seperated by commas. Do not provide any other text or explanation. If no files are relevant, return an empty string.";
    const fullPrompt = systemPrompt + "Prompt: " + prompt + " Files/Folder Paths: " + allPaths.join(', ');
    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();
    const arr = text.split(',').map(item => item.trim()).filter(item => item.length > 0);
    return arr;
}
const DEFAULT_IGNORED_DIRS = new Set([
    // VCS
    '.git', '.svn', '.hg',
    // Editors / IDEs
    '.vscode', '.idea', '.vs',
    // JS/TS / Node
    'node_modules', 'dist', 'build', '.next', '.nuxt', '.turbo',
    '.cache', 'coverage', '.parcel-cache', '.svelte-kit',
    // Python
    '__pycache__', '.venv', 'venv', 'env', '.tox', '.pytest_cache',
    '.mypy_cache', 'site-packages', 'egg-info',
    // C/C++
    'cmake-build-debug', 'cmake-build-release', 'build', 'out',
    'third_party', 'thirdparty', 'external', 'vendor',
    'include', 'Debug', 'Release', 'x64', 'x86', 'CMakeFiles',
    // Java / JVM
    'target', '.gradle', '.mvn', 'bin', 'obj',
    // Rust
    'target',
    // Go
    'vendor',
    // .NET
    'bin', 'obj', 'packages',
    // Package managers / lockfile dirs
    '.pnpm-store', '.yarn', 'bower_components',
    // Misc project-specific
    'blackdisk',
    // OS
    '.DS_Store', 'Thumbs.db',
]);
function getAllPaths(maxDepth = Infinity, currentDir = process.cwd(), currentDepth = 1, ignoredDirs = DEFAULT_IGNORED_DIRS) {
    let paths = [];
    const entries = fs.readdirSync(currentDir, { withFileTypes: true }).filter(entry => !ignoredDirs.has(entry.name));
    for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        paths.push(fullPath);
        if (entry.isDirectory() && currentDepth < maxDepth) {
            const subPaths = getAllPaths(maxDepth, fullPath, currentDepth + 1, ignoredDirs);
            paths = paths.concat(subPaths);
        }
    }
    return paths;
}
async function askToInstallClaudeCodeCli() {
    process.stdin.resume();
    console.log(chalk.yellow(`\nClaude Code CLI is not installed.`));
    const shouldInstallCliAnswer = await inquirer.prompt({
        name: 'confirm_cli_install',
        type: 'input',
        message: `Would you like to install claude code cli for ${curretOSPlatformName}? [y/n]`,
        default() {
            return 'y';
        }
    });
    const shouldInstallCli = shouldInstallCliAnswer.confirm_cli_install.toLowerCase() === 'y';
    if (!shouldInstallCli) {
        isClaudeCodeAvailable = false;
    }
    return new Promise((resolve) => {
        const installProcess = spawn('npm', ['install', '-g', '@anthropic-ai/claude-code'], {
            stdio: 'ignore',
        });
        //@ts-ignore
        spinner.start({ text: 'Installing Claude Code CLI...', color: 'blue' });
        installProcess.on('close', (installExitCode) => {
            if (installExitCode === 0) {
                //@ts-ignore
                spinner.success({ text: 'Claude Code CLI installed successfully.', color: 'green' });
                isClaudeCodeAvailable = true;
                console.log(chalk.blue(`\nOpening Claude Code. Log in to Claude Code. Cancel and try Blacdisk again...`));
                spinner.stop();
                resolve(true);
            }
            else {
                //@ts-ignore
                spinner.error({ text: `Failed to install Claude Code CLI. Exit code: ${installExitCode}`, color: 'red' });
                isClaudeCodeAvailable = false;
                process.exit(1);
            }
        });
        installProcess.on('error', (err) => {
            //@ts-ignore
            spinner.error({ text: `Failed to launch npm: ${err.message}`, color: 'red' });
            isClaudeCodeAvailable = false;
            process.exit(1);
        });
    });
}
function openClaudeCodeCli() {
    return new Promise((resolve, reject) => {
        const claudeProcess = spawn('claude', [], {
            stdio: 'inherit',
        });
        claudeProcess.on('error', (err) => {
            reject(err);
        });
        claudeProcess.on('close', (code) => {
            resolve(code);
        });
    });
}
function runSession(ptyProcess, fullPrompt) {
    return new Promise((resolve, reject) => {
        let outputBuffer = '';
        let isShuttingDown = false;
        let promptSent = false;
        let idleTimer = null;
        let cancelled = false;
        const IDLE_MS = 1200;
        const PROMPT_SEND_DELAY_MS = 300;
        const stripAnsi = (str) => str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        process.stdin.resume();
        const cleanupTerminal = () => {
            process.stdin.removeListener('data', onUserInput);
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(false);
            }
            process.stdin.pause();
            console.clear();
        };
        const onUserInput = (data) => {
            const inputStr = data.toString();
            // Handle Ctrl+C manually — kill the spawned CLI, return control to
            if (inputStr === '\x03') {
                cancelled = true;
                if (idleTimer)
                    clearTimeout(idleTimer);
                try {
                    ptyProcess.kill();
                }
                catch {
                }
                return;
            }
            if (/\x1B\[<[0-9;]+[mM]/.test(inputStr) || /\x1B\[M/.test(inputStr)) {
                return;
            }
            ptyProcess.write(inputStr);
        };
        process.stdin.on('data', onUserInput);
        const scheduleIdleCheck = () => {
            if (idleTimer)
                clearTimeout(idleTimer);
            if (!promptSent || isShuttingDown)
                return;
            idleTimer = setTimeout(() => {
                const cleanBuffer = stripAnsi(outputBuffer).trimEnd();
                if (!cleanBuffer.endsWith('>'))
                    return;
                isShuttingDown = true;
                console.log('\n[System]: Task complete. Closing session...');
                ptyProcess.write('/exit\r');
            }, IDLE_MS);
        };
        ptyProcess.onData((data) => {
            outputBuffer += data;
            process.stdout.write(data);
            if (isShuttingDown || cancelled)
                return;
            scheduleIdleCheck();
        });
        ptyProcess.onExit(({ exitCode }) => {
            if (idleTimer)
                clearTimeout(idleTimer);
            cleanupTerminal();
            if (cancelled) {
                console.log('Cancelled. Returned to main terminal.\n');
                resolve(outputBuffer);
                return;
            }
            if (exitCode !== 0) {
                reject(new Error(`Claude Code CLI exited with code ${exitCode}`));
            }
            else {
                resolve(outputBuffer);
            }
        });
        setTimeout(() => {
            ptyProcess.write(fullPrompt + "\r");
            promptSent = true;
            scheduleIdleCheck();
        }, PROMPT_SEND_DELAY_MS);
    });
}
export async function runBlacDiskPipeline(prompt) {
    try {
        spinner.start("Collecting Context...");
        const allPaths = getAllPaths();
        let selectedPaths = [];
        if (allPaths.length > 0) {
            selectedPaths = await selectContextWithGemini(prompt, allPaths);
        }
        spinner.stop();
        const { selectedModel, effort } = await configureClaudeSession();
        const promptTokenCount = await getClaudeTextInputTokens(prompt, selectedModel);
        const originalTokenCounts = await Promise.all(selectedPaths.map(path => getClaudeTextFileInputTokens(path, selectedModel)));
        let originalFileInputTokens = 0;
        originalFileInputTokens = originalTokenCounts.reduce((sum, count) => sum + count, 0);
        const child = child_process.spawn(executablePath, [], {
            cwd: process.cwd(),
            env: process.env,
            stdio: ["pipe", "pipe", "pipe"],
        });
        let pathSent = false;
        let promptSent = false;
        let clerkUserIdSent = false;
        let accessTokenSent = false;
        let claudeModelTagSent = false;
        let tokenTagSent = false;
        const clerkUserId = await getCurrentUserId();
        const access_token = await getValidAccessToken();
        spinner.stop();
        let outputBuffer = "";
        child.stdout.on("data", (output) => {
            process.stdout.write(output);
            outputBuffer += output.toString();
            if (!clerkUserIdSent && clerkUserId && !promptSent) {
                child.stdin.write(`${clerkUserId}\n`);
                clerkUserIdSent = true;
                return;
            }
            if (!accessTokenSent && access_token && clerkUserIdSent && !claudeModelTagSent) {
                child.stdin.write(`${access_token}\n`);
                accessTokenSent = true;
                return;
            }
            if (!claudeModelTagSent && clerkUserIdSent && accessTokenSent) {
                child.stdin.write(`${selectedModel}\n`);
                claudeModelTagSent = true;
                return;
            }
            if (!promptSent && !tokenTagSent && clerkUserIdSent && accessTokenSent && claudeModelTagSent && outputBuffer.includes("Calculating Tokens...")) {
                child.stdin.write(`${originalFileInputTokens + promptTokenCount}\n`);
                tokenTagSent = true;
                return;
            }
            if (!promptSent && tokenTagSent && clerkUserIdSent && accessTokenSent && claudeModelTagSent && outputBuffer.includes("Analysing Context")) {
                child.stdin.write(`${prompt}\n`);
                promptSent = true;
                return;
            }
            if (promptSent && tokenTagSent && !pathSent) {
                child.stdin.write(`${(selectedPaths.length > 0 && selectedPaths.length < 2) ? selectedPaths[0] : selectedPaths.join(', ')}\n`);
                pathSent = true;
                return;
            }
        });
        child.stderr.on("data", (chunk) => {
            process.stderr.write("\n" + chunk);
        });
        child.on("error", (err) => {
            console.log(chalk.red(err));
            process.exitCode = 1;
        });
        const tokenReductionMessages = ["Banishing Tokens...", "Reducing Tokens...", "Shrinking Tokens...", "Blacdisk Compressing Tokens...", "Tokens are crossing the event horizon...", "Swallowing Tokens..."];
        let tokenReductionMessage = tokenReductionMessages[getPsuedoRandomIntInclusive(0, tokenReductionMessages.length - 1)] + "\n";
        spinner.start(tokenReductionMessage);
        child.on("close", async (code, signal) => {
            if (code !== 0) {
                console.error(chalk.red(`\nBlackdisk exited with error code ${code ?? `killed by signal ${signal}`}`));
                process.exitCode = code ?? 1;
                return;
            }
            let isLingFileContent = "0";
            try {
                if (fs.existsSync("./blackdisk/build/isLing.txt"))
                    isLingFileContent = getFileContent("./blackdisk/build/isLing.txt");
            }
            catch (err) {
                console.log(chalk.red(err.message));
            }
            //const isLing = isLingFileContent == "1";
            const useOriginal = isLingFileContent == "2";
            let postProcessPrompt = "";
            if (fs.existsSync("./blackdisk/build/isLing.txt"))
                postProcessPrompt = getFileContent(currentWorkingDir + "/blackdisk/build/prompt_message.txt");
            let fileContextDirectives = "";
            let selectedFilePathsDirectives = "";
            let fileContexts = [];
            if (!useOriginal) {
                fileContexts = getAllPaths(1, process.cwd() + "\\blackdisk\\ctx\\");
            }
            else {
                fileContexts = selectedPaths;
            }
            fileContexts.map((filePath) => fileContextDirectives += `@${filePath} `);
            selectedPaths.map((filePath) => selectedFilePathsDirectives += `#${filePath} `);
            let isPrompting = false;
            // Passing Prompt to claude
            spinner.stop();
            let claudeProcess;
            spinner.stop();
            // 2. Build your dynamic arguments array based on the choices
            const claudeArgs = ['--model', selectedModel, '--effort', effort];
            const isWindows = process.platform === 'win32';
            const claudeCommand = isWindows ? 'claude.cmd' : 'claude';
            try {
                claudeProcess = pty.spawn(claudeCommand, [...claudeArgs, '--permission-mode', 'acceptEdits'], {
                    name: 'xterm-color',
                    cols: process.stdout.columns || 80,
                    rows: process.stdout.rows || 30,
                    cwd: process.cwd(),
                    env: process.env
                });
            }
            catch (err) {
                // Check for both ENOENT (Mac/Linux) and "File not found" (Windows node-pty specific)
                if (err.message.includes("ENOENT") || err.message.includes("File not found")) {
                    isPrompting = true;
                    isClaudeCodeAvailable = false;
                    await askToInstallClaudeCodeCli();
                    await sleep(3400);
                    await openClaudeCodeCli();
                    isClaudeCodeAvailable = true;
                    return;
                }
                else {
                    console.error(chalk.red('\nError starting Claude CLI:'), err.message);
                    return;
                }
            }
            isClaudeCodeAvailable = true;
            if (isClaudeCodeAvailable) {
                const fullPrompt = `${STRICT_SYSTEM_PROMPT}${postProcessPrompt}.  NB! Strictly use these files as context as specified in the system instructions: ${fileContextDirectives} ${selectedFilePathsDirectives}`;
                const fullPromptWithYapperSkill = `/yapper ${STRICT_SYSTEM_PROMPT}${postProcessPrompt}.  NB! Strictly use these files as context as specified in the system instructions: ${fileContextDirectives} ${selectedFilePathsDirectives}`;
                const useOriginalProptStr = `/yapper ${prompt}`;
                const fullTextPromptTokens = await getClaudeTextInputTokens(fullPromptWithYapperSkill, selectedModel);
                const postProcessFileInputTokens = useOriginal ? originalFileInputTokens : await getClaudeImageInputTokens(fileContexts, selectedModel);
                let claudeInputPrompt;
                console.clear();
                const beforeTokens = originalFileInputTokens + promptTokenCount;
                const afterTokens = postProcessFileInputTokens + fullTextPromptTokens;
                console.log("Before: ", beforeTokens, " tokens | ", "After: ", afterTokens, " tokens");
                const percentageChanged = calcPercentageChanged(postProcessFileInputTokens + (useOriginal ? promptTokenCount : fullTextPromptTokens), originalFileInputTokens + promptTokenCount);
                console.log(chalk.greenBright("Claude Token Percentage Saved: ", Math.round(percentageChanged) + "%"));
                if (beforeTokens < afterTokens) {
                    claudeInputPrompt = useOriginalProptStr;
                    console.log(chalk.yellow("Unable to save you input tokens, only output tokens can be saved. Using claude code normally."));
                }
                else {
                    claudeInputPrompt = fullPromptWithYapperSkill;
                }
                spinner.start("Opening Cluade Code...");
                await sleep(3000);
                spinner.stop();
                console.clear();
                await runSession(claudeProcess, claudeInputPrompt);
            }
            claudeProcess.onExit(({ exitCode }) => {
                if (!isPrompting) {
                    process.exit(exitCode ?? 0);
                }
            });
        });
    }
    catch (err) {
        console.error(chalk.red('\nUnexpected error:'), err?.message ?? err);
        process.exit(1);
    }
}
//# sourceMappingURL=pipe.js.map