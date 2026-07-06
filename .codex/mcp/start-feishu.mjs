#!/usr/bin/env node
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";

const feishuMcpDir = "D:/NDC_project/scripts/feishu-mcp";
const envPath = join(feishuMcpDir, ".env");
const entryPath = join(feishuMcpDir, "dist", "index.js");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Feishu MCP env file not found: ${filePath}`);
  }

  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

if (!existsSync(entryPath)) {
  throw new Error(`Feishu MCP entry file not found: ${entryPath}`);
}

loadEnvFile(envPath);

process.env.NODE_ENV ??= "cli";
process.env.FEISHU_BASE_URL ??= "https://open.feishu.cn/open-apis";
process.env.FEISHU_AUTH_TYPE ??= "tenant";
process.env.PORT ??= "3335";

const { startServer } = await import(pathToFileURL(entryPath).href);
await startServer();
