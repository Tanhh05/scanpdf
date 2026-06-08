import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_BUCKET || "documents";
const backupDir = path.resolve(process.env.BACKUP_DIR || "backups/storage");

if (!url || !serviceRoleKey) {
  throw new Error("SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY là bắt buộc");
}

const client = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const tempDir = await mkdtemp(path.join(os.tmpdir(), "scanpdf-storage-"));
let fileCount = 0;

async function listFolder(prefix = "") {
  let offset = 0;

  while (true) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    if (!data?.length) return;

    for (const item of data) {
      const objectPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        await listFolder(objectPath);
        continue;
      }

      const { data: blob, error: downloadError } = await client.storage
        .from(bucket)
        .download(objectPath);
      if (downloadError) throw downloadError;

      const destination = path.join(tempDir, objectPath);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, Buffer.from(await blob.arrayBuffer()));
      fileCount += 1;
    }

    if (data.length < 1000) return;
    offset += data.length;
  }
}

try {
  await listFolder();
  await mkdir(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
  const archive = path.join(backupDir, `${bucket}-${stamp}.tar.gz`);
  await execFileAsync("tar", ["-czf", archive, "-C", tempDir, "."]);
  console.log(`Đã sao lưu ${fileCount} file Supabase Storage: ${archive}`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
