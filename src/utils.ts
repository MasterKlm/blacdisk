import 'dotenv/config';
import * as fs from 'fs';
import Anthropic from "@anthropic-ai/sdk";
import path from "path";
import dotenv from "dotenv";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const PACKAGE_ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(PACKAGE_ROOT, ".env");

dotenv.config({ path: ENV_PATH, quiet: true });





export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


function getMediaType(filePath: string): "image/png" | "image/jpeg" | "image/gif" | "image/webp" {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".gif": return "image/gif";
    case ".webp": return "image/webp";
    default: throw new Error(`Unsupported image extension: ${ext}`);
  }
}

export async function getClaudeImageInputTokens(imagePaths: string[], model: string) {
  const anthropic_client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
  });
  const count = await anthropic_client.messages.countTokens({
    model: model,
    messages: [{
      role: "user",
      content: imagePaths.map((filePath: string) => ({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: getMediaType(filePath),
          data: fs.readFileSync(filePath).toString("base64"),
        },
      })),
    }],
  });
  return count.input_tokens;
}

export async function getClaudeTextInputTokens(prompt:string, model: string){
  const anthropic_client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
  });
  const count = await anthropic_client.messages.countTokens({
    model: model,
    messages: [{ role: "user", content: prompt }],
  });
  return count.input_tokens;
}


export async function getClaudeTextFileInputTokens(filePath: string, model: string) {
  const anthropic_client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
  });
  const fileContent = fs.readFileSync(filePath, "utf-8");

  const count = await anthropic_client.messages.countTokens({
    model: model,
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: fileContent,
        },
      ],
    }],
  });

  return count.input_tokens;
}


export function calcPercentageChanged(newValue:number, oldValue:number){
  return ((newValue - oldValue)/oldValue * 100);
}

export function getFileContent(filePath: string){
  const fileContent = fs.readFileSync(filePath, "utf-8");
  return fileContent;

}


export function getPsuedoRandomIntInclusive(min:number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
