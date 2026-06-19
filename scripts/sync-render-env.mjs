import fs from "node:fs";
import path from "node:path";

const API_BASE = "https://api.render.com/v1";
const rootDir = path.resolve(import.meta.dirname, "..");
const envPath = path.join(rootDir, ".env");

const token = process.env.RENDER_API_KEY;
const serviceName = process.env.RENDER_SERVICE_NAME || "scanpdf-backend";
const postgresName = process.env.RENDER_POSTGRES_NAME || "scanpdf-db";
const keyValueName = process.env.RENDER_KEY_VALUE_NAME || "scanpdf-redis";
const connectionScope = process.env.RENDER_CONNECTION_SCOPE || "external";

if (!token) {
  console.error("Missing RENDER_API_KEY. Create one in Render Dashboard > Account Settings > API Keys.");
  process.exit(1);
}

async function api(pathname, params = {}) {
  const url = new URL(`${API_BASE}${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.append(key, value);
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Render API ${response.status} for ${pathname}: ${body.slice(0, 300)}`);
  }

  return response.json();
}

async function listAll(pathname, params = {}) {
  const items = [];
  let cursor;

  do {
    const page = await api(pathname, { ...params, cursor, limit: "100" });
    if (!Array.isArray(page)) throw new Error(`Unexpected response for ${pathname}`);
    items.push(...page);
    cursor = page.length === 100 ? page.at(-1)?.cursor : undefined;
  } while (cursor);

  return items;
}

function unwrap(item, property) {
  return item?.[property] || item;
}

async function findNamed(pathname, property, name) {
  const items = await listAll(pathname, { name });
  const matches = items.map((item) => unwrap(item, property)).filter((item) => item?.name === name);
  if (matches.length === 0) throw new Error(`Could not find Render resource named ${name}`);
  if (matches.length > 1) throw new Error(`Found multiple Render resources named ${name}`);
  return matches[0];
}

function parseEnv(contents) {
  const lines = contents.split(/\r?\n/);
  const values = new Map();

  for (const line of lines) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) values.set(match[1], match[2]);
  }

  return { lines, values };
}

function serializeValue(value) {
  const stringValue = String(value ?? "");
  if (stringValue === "") return "";
  if (/[\n\r]/.test(stringValue)) return JSON.stringify(stringValue);
  return stringValue;
}

function mergeEnv(contents, updates) {
  const { lines } = parseEnv(contents);
  const pending = new Map(updates);
  const output = lines.map((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (!match || !pending.has(match[1])) return line;
    const value = pending.get(match[1]);
    pending.delete(match[1]);
    return `${match[1]}=${serializeValue(value)}`;
  });

  if (pending.size > 0 && output.at(-1) !== "") output.push("");
  for (const [key, value] of pending) output.push(`${key}=${serializeValue(value)}`);

  return output.join("\n").replace(/\n*$/, "\n");
}

async function main() {
  const updates = new Map();

  const service = await findNamed("/services", "service", serviceName);
  const envVars = await listAll(`/services/${service.id}/env-vars`);
  for (const item of envVars) {
    const envVar = unwrap(item, "envVar");
    if (envVar?.key) updates.set(envVar.key, envVar.value ?? "");
  }

  const postgres = await findNamed("/postgres", "postgres", postgresName);
  const postgresInfo = await api(`/postgres/${postgres.id}/connection-info`);
  updates.set(
    "DATABASE_URL",
    connectionScope === "internal" ? postgresInfo.internalConnectionString : postgresInfo.externalConnectionString,
  );

  const keyValues = await listAll("/key-value", { name: keyValueName });
  const keyValue = keyValues.map((item) => unwrap(item, "keyValue")).find((item) => item?.name === keyValueName);
  if (keyValue) {
    const keyValueInfo = await api(`/key-value/${keyValue.id}/connection-info`);
    updates.set(
      "REDIS_URL",
      connectionScope === "internal" ? keyValueInfo.internalConnectionString : keyValueInfo.externalConnectionString,
    );
  } else {
    const redis = await findNamed("/redis", "redis", keyValueName);
    const redisInfo = await api(`/redis/${redis.id}/connection-info`);
    updates.set(
      "REDIS_URL",
      connectionScope === "internal" ? redisInfo.internalConnectionString : redisInfo.externalConnectionString,
    );
  }

  if (updates.has("API_URL") && !updates.has("NEXT_PUBLIC_API_URL")) {
    updates.set("NEXT_PUBLIC_API_URL", updates.get("API_URL"));
  }

  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const backupPath = `${envPath}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  if (existing) fs.copyFileSync(envPath, backupPath);
  fs.writeFileSync(envPath, mergeEnv(existing, updates));

  console.log(`Synced ${updates.size} Render env keys into .env.`);
  if (existing) console.log(`Backup written to ${path.relative(rootDir, backupPath)}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
