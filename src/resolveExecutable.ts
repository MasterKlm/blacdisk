
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const PLATFORM_MAP: Record<string, { pkg: string; bin: string }> = {
  'win32-x64': { pkg: '@masterklm/blacdisk-win32-x64', bin: 'blackdisk.exe' },
  'linux-x64': { pkg: '@masterklm/blacdisk-linux-x64', bin: 'blackdisk' },
  'darwin-arm64': { pkg: '@masterklm/blacdisk-darwin-arm64', bin: 'blackdisk' },
};

export function resolveExecutablePath(): string {
  const key = `${process.platform}-${process.arch}`;
  const target = PLATFORM_MAP[key];

  if (!target) {
    throw new Error(
      `blacdisk has no prebuilt binary for ${key}. ` +
        `Supported: ${Object.keys(PLATFORM_MAP).join(', ')}.`
    );
  }

  let pkgDir: string;
  try {
    const pkgJsonPath = require.resolve(`${target.pkg}/package.json`);
    pkgDir = path.dirname(pkgJsonPath);
  } catch {
    throw new Error(
      `Could not find optional dependency "${target.pkg}". ` +
        `This usually means npm skipped it during install -- try reinstalling ` +
        `with "npm install --include=optional", or check that your platform ` +
        `(${key}) is actually supported.`
    );
  }

  const exePath = path.join(pkgDir, target.bin);

  if (!fs.existsSync(exePath)) {
    throw new Error(
      `Expected binary not found at ${exePath}. The "${target.pkg}" package ` +
        `may be corrupted or built incorrectly -- check its "files" field ` +
        `actually includes bin/${target.bin}.`
    );
  }

  return exePath;
}
