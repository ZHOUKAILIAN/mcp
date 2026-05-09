import fs from "fs-extra";
import { homedir } from "os";
import { resolve } from "path";
import { setAuth } from "./api-client.js";
import type { AuthData } from "./api-types.js";

const AUTH_DIR = resolve(homedir(), ".xiaocan-mcp");
const AUTH_FILE = resolve(AUTH_DIR, "auth.json");

function fromEnv(): Partial<AuthData> {
  const token = process.env.XIAOCAN_TOKEN?.trim();
  const userId = parseInt(process.env.XIAOCAN_USER_ID || "0", 10);
  const silkId = parseInt(process.env.XIAOCAN_SILK_ID || "0", 10);
  const cityCode = parseInt(process.env.XIAOCAN_CITY_CODE || "310100", 10);

  if (token && userId && silkId) {
    return { token, userId, silkId, cityCode, updatedAt: new Date().toISOString() };
  }
  return {};
}

export class AuthStore {
  private cache: AuthData | null = null;
  private loaded = false;

  async load(): Promise<AuthData | null> {
    if (this.loaded) return this.cache;

    // 1. env vars take priority
    const env = fromEnv();
    if (env.token) {
      this.cache = env as AuthData;
      setAuth(this.cache);
      this.loaded = true;
      return this.cache;
    }

    // 2. fallback to auth.json
    try {
      if (await fs.pathExists(AUTH_FILE)) {
        this.cache = await fs.readJson(AUTH_FILE);
        if (this.cache) setAuth(this.cache);
      }
    } catch {
      this.cache = null;
    }
    this.loaded = true;
    return this.cache;
  }

  async save(data: AuthData): Promise<void> {
    await fs.ensureDir(AUTH_DIR);
    await fs.writeJson(AUTH_FILE, data, { spaces: 2 });
    this.cache = data;
    this.loaded = true;
    setAuth(data);
  }

  async clear(): Promise<void> {
    this.cache = null;
    this.loaded = true;
    try { await fs.remove(AUTH_FILE); } catch { /* ignore */ }
  }

  async isLoggedIn(): Promise<boolean> {
    const auth = await this.load();
    return !!(auth?.token && auth?.silkId);
  }
}
