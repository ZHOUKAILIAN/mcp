import fs from "fs-extra";
import { homedir } from "os";
import { resolve } from "path";
import { setAuth } from "./api-client.js";
import type { AuthData } from "./api-types.js";

const AUTH_DIR = resolve(homedir(), ".xiaocan-mcp");
const AUTH_FILE = resolve(AUTH_DIR, "auth.json");

export class AuthStore {
  private cache: AuthData | null = null;
  private loaded = false;

  async load(): Promise<AuthData | null> {
    if (this.loaded) return this.cache;

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
    try {
      await fs.remove(AUTH_FILE);
    } catch { /* ignore */ }
  }

  async isLoggedIn(): Promise<boolean> {
    const auth = await this.load();
    return !!(auth?.token && auth?.silkId);
  }
}
