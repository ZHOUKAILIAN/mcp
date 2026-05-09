import { z } from "zod";

export const workflowStatuses = [
  "candidate", "claimed", "takeaway_ordered", "received",
  "reviewed", "ready_to_submit", "submitted", "cashback_received", "cancelled",
] as const;

export const platformValues = ["meituan", "eleme", "other"] as const;

export type WorkflowStatus = (typeof workflowStatuses)[number];
export type WorkflowPlatform = (typeof platformValues)[number];

export const workflowStatusSchema = z.enum(workflowStatuses);
export const workflowPlatformSchema = z.enum(platformValues);

export interface WorkflowItem {
  id: string;
  merchantName: string;
  platform: WorkflowPlatform;
  status: WorkflowStatus;
  xiaocanOrderId?: string;
  takeawayOrderId?: string;
  expectedCashbackAmount?: number;
  orderAmount?: number;
  deadlineAt?: string;
  screenshots: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowDatabase {
  workflows: WorkflowItem[];
}

export type CreateWorkflowInput = {
  merchantName: string;
  platform?: WorkflowPlatform;
  xiaocanOrderId?: string;
  takeawayOrderId?: string;
  expectedCashbackAmount?: number;
  orderAmount?: number;
  deadlineAt?: string;
  screenshots?: string[];
  notes?: string;
};

export type UpdateWorkflowInput = Partial<
  Pick<WorkflowItem, "merchantName" | "platform" | "xiaocanOrderId" | "takeawayOrderId"
    | "expectedCashbackAmount" | "orderAmount" | "deadlineAt" | "screenshots" | "notes">
>;

const linearStatuses: WorkflowStatus[] = [
  "candidate", "claimed", "takeaway_ordered", "received",
  "reviewed", "ready_to_submit", "submitted", "cashback_received",
];

const finalStatuses = new Set<WorkflowStatus>(["cashback_received", "cancelled"]);

export function getAllowedNextStatuses(currentStatus: WorkflowStatus): WorkflowStatus[] {
  if (finalStatuses.has(currentStatus)) return [];
  const idx = linearStatuses.indexOf(currentStatus);
  const next = idx >= 0 ? linearStatuses[idx + 1] : undefined;
  return next ? [next, "cancelled"] : ["cancelled"];
}

export function getAutomaticNextStatus(currentStatus: WorkflowStatus): WorkflowStatus | null {
  if (finalStatuses.has(currentStatus)) return null;
  const idx = linearStatuses.indexOf(currentStatus);
  return idx >= 0 ? (linearStatuses[idx + 1] ?? null) : null;
}

export function canTransition(currentStatus: WorkflowStatus, targetStatus: WorkflowStatus): boolean {
  return getAllowedNextStatuses(currentStatus).includes(targetStatus);
}

export function getNextAction(item: WorkflowItem): string {
  switch (item.status) {
    case "candidate": return "手动在小蚕 App 查看订单详情，确认是否抢单；抢到后把状态推进到 claimed。";
    case "claimed": return "手动在对应外卖平台下单，记录外卖订单号、金额和必要截图，然后推进到 takeaway_ordered。";
    case "takeaway_ordered": return "等待并确认收货。实际收到餐品后把状态推进到 received。";
    case "received": return "基于真实体验手动完成评价，并记录评价截图或备注，然后推进到 reviewed。";
    case "reviewed": return "核对小蚕订单、外卖订单号、评价截图和备注是否齐全，齐全后推进到 ready_to_submit。";
    case "ready_to_submit": return "手动打开小蚕 App 提交返现材料。提交后把状态推进到 submitted。";
    case "submitted": return "等待返现到账。到账后把状态推进到 cashback_received。";
    case "cashback_received": return "流程已完成，无需下一步操作。";
    case "cancelled": return "流程已取消，无需下一步操作。";
    default: return "未知状态，请检查本地工作流记录。";
  }
}

export function normalizeOptionalString(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}
