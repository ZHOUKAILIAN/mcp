import { randomUUID } from "crypto";
import { dirname, resolve } from "path";
import fs from "fs-extra";
import {
  canTransition, CreateWorkflowInput, getAutomaticNextStatus,
  normalizeOptionalString, UpdateWorkflowInput,
  WorkflowDatabase, WorkflowItem, WorkflowStatus,
} from "./types.js";

export class WorkflowStore {
  constructor(
    private readonly filePath = resolve(process.cwd(), "data", "workflows.json")
  ) {}

  async list(status?: WorkflowStatus): Promise<WorkflowItem[]> {
    const db = await this.read();
    return status ? db.workflows.filter((i) => i.status === status) : db.workflows;
  }

  async get(id: string): Promise<WorkflowItem | null> {
    return (await this.read()).workflows.find((i) => i.id === id) ?? null;
  }

  async create(input: CreateWorkflowInput): Promise<WorkflowItem> {
    const db = await this.read();
    const now = new Date().toISOString();
    const item: WorkflowItem = {
      id: randomUUID(),
      merchantName: input.merchantName.trim(),
      platform: input.platform ?? "other",
      status: "candidate",
      xiaocanOrderId: normalizeOptionalString(input.xiaocanOrderId),
      takeawayOrderId: normalizeOptionalString(input.takeawayOrderId),
      expectedCashbackAmount: input.expectedCashbackAmount,
      orderAmount: input.orderAmount,
      deadlineAt: normalizeOptionalString(input.deadlineAt),
      screenshots: input.screenshots ?? [],
      notes: normalizeOptionalString(input.notes),
      createdAt: now,
      updatedAt: now,
    };
    db.workflows.push(item);
    await this.write(db);
    return item;
  }

  async update(id: string, updates: UpdateWorkflowInput): Promise<WorkflowItem | null> {
    const db = await this.read();
    const idx = db.workflows.findIndex((i) => i.id === id);
    if (idx < 0) return null;

    const current = db.workflows[idx];
    const updated: WorkflowItem = {
      ...current,
      ...this.cleanUpdates(updates),
      updatedAt: new Date().toISOString(),
    };
    db.workflows[idx] = updated;
    await this.write(db);
    return updated;
  }

  async advance(id: string, targetStatus?: WorkflowStatus): Promise<WorkflowItem | null> {
    const db = await this.read();
    const idx = db.workflows.findIndex((i) => i.id === id);
    if (idx < 0) return null;

    const current = db.workflows[idx];
    const next = targetStatus ?? getAutomaticNextStatus(current.status);
    if (!next) throw new Error(`状态 ${current.status} 已经是终态`);
    if (!canTransition(current.status, next)) {
      throw new Error(`不能从 ${current.status} 跳转到 ${next}`);
    }

    const updated: WorkflowItem = { ...current, status: next, updatedAt: new Date().toISOString() };
    db.workflows[idx] = updated;
    await this.write(db);
    return updated;
  }

  private cleanUpdates(updates: UpdateWorkflowInput): UpdateWorkflowInput {
    const c: UpdateWorkflowInput = {};
    if (typeof updates.merchantName === "string") c.merchantName = updates.merchantName.trim();
    if (updates.platform) c.platform = updates.platform;
    if ("xiaocanOrderId" in updates) c.xiaocanOrderId = normalizeOptionalString(updates.xiaocanOrderId);
    if ("takeawayOrderId" in updates) c.takeawayOrderId = normalizeOptionalString(updates.takeawayOrderId);
    if ("expectedCashbackAmount" in updates) c.expectedCashbackAmount = updates.expectedCashbackAmount;
    if ("orderAmount" in updates) c.orderAmount = updates.orderAmount;
    if ("deadlineAt" in updates) c.deadlineAt = normalizeOptionalString(updates.deadlineAt);
    if ("screenshots" in updates) c.screenshots = updates.screenshots;
    if ("notes" in updates) c.notes = normalizeOptionalString(updates.notes);
    return c;
  }

  private async read(): Promise<WorkflowDatabase> {
    await this.ensureFile();
    const data = await fs.readJson(this.filePath);
    if (!data?.workflows) throw new Error(`工作流存储格式不正确: ${this.filePath}`);
    return data;
  }

  private async write(db: WorkflowDatabase): Promise<void> {
    await fs.writeJson(this.filePath, db, { spaces: 2 });
  }

  private async ensureFile(): Promise<void> {
    await fs.ensureDir(dirname(this.filePath));
    if (!(await fs.pathExists(this.filePath))) {
      await fs.writeJson(this.filePath, { workflows: [] }, { spaces: 2 });
    }
  }
}
