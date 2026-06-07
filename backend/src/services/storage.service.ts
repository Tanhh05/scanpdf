import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";

type StorageService = {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
  getDownloadUrl(key: string): Promise<string>;
};

class LocalStorageService implements StorageService {
  private root = path.resolve(process.cwd(), env.STORAGE_ROOT);

  async put(key: string, data: Buffer) {
    const target = path.join(this.root, key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data);
  }

  get(key: string) {
    return readFile(path.join(this.root, key));
  }

  async remove(key: string) {
    await unlink(path.join(this.root, key)).catch(() => undefined);
  }

  async getDownloadUrl(key: string) {
    return `/api/files/download?key=${encodeURIComponent(key)}`;
  }
}

class SupabaseStorageService implements StorageService {
  private client;

  constructor() {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Thiếu cấu hình Supabase Storage");
    }
    this.client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  async put(key: string, data: Buffer, contentType: string) {
    const { error } = await this.client.storage
      .from(env.SUPABASE_BUCKET)
      .upload(key, data, { contentType, upsert: true });
    if (error) throw error;
  }

  async get(key: string) {
    const { data, error } = await this.client.storage.from(env.SUPABASE_BUCKET).download(key);
    if (error) throw error;
    return Buffer.from(await data.arrayBuffer());
  }

  async remove(key: string) {
    const { error } = await this.client.storage.from(env.SUPABASE_BUCKET).remove([key]);
    if (error) throw error;
  }

  async getDownloadUrl(key: string) {
    const { data, error } = await this.client.storage
      .from(env.SUPABASE_BUCKET)
      .createSignedUrl(key, 60 * 10);
    if (error) throw error;
    return data.signedUrl;
  }
}

export const storage: StorageService =
  env.STORAGE_DRIVER === "supabase" ? new SupabaseStorageService() : new LocalStorageService();
