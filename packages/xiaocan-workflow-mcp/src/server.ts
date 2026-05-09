import { IncomingMessage, ServerResponse } from "http";
import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { z } from "zod";
import { WorkflowStore } from "./storage.js";
import {
  getNextAction,
  workflowPlatformSchema,
  workflowStatusSchema,
  WorkflowItem,
} from "./types.js";
import { AuthStore } from "./auth.js";
import {
  searchStores,
  searchByKeyword,
  getPromotionDetail,
  grabOrder,
  getPromotionOrders,
  searchAddress,
} from "./api-client.js";
import { PlatformType, RebateCondition } from "./api-types.js";

export const Logger = {
  log: (...args: unknown[]) => console.log(...args),
  error: (...args: unknown[]) => console.error(...args),
};

// ---- Schemas ----

const dateStringSchema = z.string().trim().refine(
  (v) => v.length === 0 || !Number.isNaN(Date.parse(v)), "日期必须可解析"
);

const createWorkflowSchema = z.object({
  merchantName: z.string().trim().min(1, "商家名不能为空"),
  platform: workflowPlatformSchema.default("other"),
  xiaocanOrderId: z.string().optional(),
  takeawayOrderId: z.string().optional(),
  expectedCashbackAmount: z.number().nonnegative().optional(),
  orderAmount: z.number().nonnegative().optional(),
  deadlineAt: dateStringSchema.optional(),
  screenshots: z.array(z.string().trim().min(1)).default([]),
  notes: z.string().optional(),
});

const listWorkflowsSchema = z.object({ status: workflowStatusSchema.optional() });
const idSchema = z.object({ id: z.string().trim().min(1) });

const updateWorkflowSchema = idSchema.extend({
  merchantName: z.string().trim().min(1).optional(),
  platform: workflowPlatformSchema.optional(),
  xiaocanOrderId: z.string().optional(),
  takeawayOrderId: z.string().optional(),
  expectedCashbackAmount: z.number().nonnegative().optional(),
  orderAmount: z.number().nonnegative().optional(),
  deadlineAt: dateStringSchema.optional(),
  screenshots: z.array(z.string().trim().min(1)).optional(),
  notes: z.string().optional(),
});

const advanceWorkflowSchema = idSchema.extend({
  targetStatus: workflowStatusSchema.optional(),
});

const reviewNotesDraftSchema = z.object({
  workflowId: z.string().trim().min(1).optional(),
  experienceNotes: z.string().trim().min(4, "请提供真实体验内容"),
  positivePoints: z.string().trim().optional(),
  issues: z.string().trim().optional(),
  tone: z.enum(["neutral", "concise", "detailed"]).default("neutral"),
});

// Xiaocan API schemas

const xiaocanLoginSchema = z.object({
  token: z.string().trim().min(1, "X-Sivir token 不能为空"),
  userId: z.number().int().min(1, "userId (X-Vayne) 必填"),
  silkId: z.number().int().min(1, "silkId (x-Teemo) 必填"),
  cityCode: z.number().int().default(310100),
});

const xiaocanSearchStoresSchema = z.object({
  keyword: z.string().trim().optional(),
  lat: z.number().default(() => Number(process.env.XIAOCAN_LAT || 31.2286)),
  lng: z.number().default(() => Number(process.env.XIAOCAN_LNG || 121.4584)),
  pageNum: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

const xiaocanPromotionDetailSchema = z.object({
  promotionId: z.number().int().min(1),
});

const xiaocanGrabOrderSchema = z.object({
  promotionId: z.number().int().min(1),
  lat: z.number().default(() => Number(process.env.XIAOCAN_LAT || 31.2286)),
  lng: z.number().default(() => Number(process.env.XIAOCAN_LNG || 121.4584)),
  storePlatform: z.number().int().min(1).max(3).default(1),
});

const xiaocanSearchAddressSchema = z.object({
  keyword: z.string().trim().min(1),
  region: z.string().default("上海市"),
});

const xiaocanGetOrdersSchema = z.object({
  orderStatus: z.number().int().default(99),
});

// ---- Server class ----

export class XiaocanWorkflowMcpServer {
  private readonly server: McpServer;
  private transport: Transport | null = null;

  constructor(
    private readonly store = new WorkflowStore(),
    private readonly auth = new AuthStore()
  ) {
    this.server = new McpServer(
      { name: "小蚕霸王餐 MCP", version: "2.0.0" },
      { capabilities: { logging: {}, tools: {} } }
    );
    this.registerWorkflowTools();
    this.registerApiTools();
    // Load saved auth
    this.auth.load();
  }

  startHttp(port: number) {
    const app = express();
    app.get("/mcp", async (_req: Request, res: Response) => {
      const t = new SSEServerTransport("/mcp-messages", res as unknown as ServerResponse<IncomingMessage>);
      this.transport = t;
      await this.connect(t);
    });
    app.post("/mcp-messages", async (req: Request, res: Response) => {
      if (!this.transport) { res.status(400).send("SSE未建立"); return; }
      await (this.transport as SSEServerTransport).handlePostMessage(
        req as unknown as IncomingMessage,
        res as unknown as ServerResponse<IncomingMessage>
      );
    });
    return new Promise<this>((resolve) => {
      app.listen(port, () => {
        Logger.log(`小蚕 MCP 已启动 :${port}`);
        resolve(this);
      });
    });
  }

  // ---- Workflow tools ----

  private registerWorkflowTools() {
    this.server.tool("create-workflow", "创建本地流程记录", createWorkflowSchema.shape, async (params) => {
      try { return jsonContent(await this.store.create(createWorkflowSchema.parse(params))); }
      catch (e) { return errorContent(e); }
    });

    this.server.tool("list-workflows", "列出本地流程记录", listWorkflowsSchema.shape, async (params) => {
      try { return jsonContent({ workflows: await this.store.list(listWorkflowsSchema.parse(params ?? {}).status) }); }
      catch (e) { return errorContent(e); }
    });

    this.server.tool("get-workflow", "按id查看流程记录", idSchema.shape, async (params) => {
      try {
        const item = await this.store.get(idSchema.parse(params).id);
        return item ? jsonContent(item) : errorContent("未找到");
      } catch (e) { return errorContent(e); }
    });

    this.server.tool("update-workflow", "更新流程字段", updateWorkflowSchema.shape, async (params) => {
      try {
        const { id, ...updates } = updateWorkflowSchema.parse(params);
        if (Object.keys(updates).length === 0) return errorContent("至少提供一个字段");
        const item = await this.store.update(id, updates);
        return item ? jsonContent(item) : errorContent("未找到: " + id);
      } catch (e) { return errorContent(e); }
    });

    this.server.tool("advance-workflow", "推进流程状态", advanceWorkflowSchema.shape, async (params) => {
      try {
        const { id, targetStatus } = advanceWorkflowSchema.parse(params);
        const item = await this.store.advance(id, targetStatus);
        return item ? jsonContent({ workflow: item, nextAction: getNextAction(item) }) : errorContent("未找到: " + id);
      } catch (e) { return errorContent(e); }
    });

    this.server.tool("next-action", "查看下一步建议", idSchema.shape, async (params) => {
      try {
        const item = await this.store.get(idSchema.parse(params).id);
        return item ? jsonContent({ id: item.id, status: item.status, nextAction: getNextAction(item) }) : errorContent("未找到");
      } catch (e) { return errorContent(e); }
    });

    this.server.tool("review-notes-draft", "生成评价草稿", reviewNotesDraftSchema.shape, async (params) => {
      try {
        const input = reviewNotesDraftSchema.parse(params);
        const wf = input.workflowId ? await this.store.get(input.workflowId) : null;
        if (input.workflowId && !wf) return errorContent("未找到: " + input.workflowId);
        return jsonContent(buildReviewDraft(input, wf));
      } catch (e) { return errorContent(e); }
    });
  }

  // ---- Xiaocan API tools ----

  private registerApiTools() {
    this.server.tool(
      "xiaocan-login",
      "设置小蚕登录凭据。需要从抓包数据中获取 token(X-Sivir)、userId(X-Vayne)、silkId(x-Teemo)",
      xiaocanLoginSchema.shape,
      async (params) => {
        try {
          const input = xiaocanLoginSchema.parse(params);
          await this.auth.save({
            token: input.token,
            userId: input.userId,
            silkId: input.silkId,
            cityCode: input.cityCode,
            updatedAt: new Date().toISOString(),
          });
          return jsonContent({ message: "登录凭据已保存", silkId: input.silkId });
        } catch (e) { return errorContent(e); }
      }
    );

    this.server.tool(
      "xiaocan-login-status",
      "查看当前小蚕登录状态",
      {} as z.ZodRawShape,
      async () => {
        try {
          const loggedIn = await this.auth.isLoggedIn();
          if (!loggedIn) return jsonContent({ loggedIn: false, message: "未登录，请用 xiaocan-login 设置凭据" });
          const auth = await this.auth.load();
          return jsonContent({
            loggedIn: true,
            userId: auth?.userId,
            silkId: auth?.silkId,
            cityCode: auth?.cityCode,
          });
        } catch (e) { return errorContent(e); }
      }
    );

    this.server.tool(
      "xiaocan-search-stores",
      "搜索小蚕可抢单店铺。可传关键词搜索，或按坐标浏览附近店铺。返回店名/距离/返现金额/名额/评价要求/活动时间",
      xiaocanSearchStoresSchema.shape,
      async (params) => {
        try {
          const input = xiaocanSearchStoresSchema.parse(params);

          let stores;
          if (input.keyword) {
            stores = await searchByKeyword(input.keyword, input.lat, input.lng);
          } else {
            stores = await searchStores({ lat: input.lat, lng: input.lng, pageNum: input.pageNum, pageSize: input.pageSize });
          }

          const formatted = stores.map((s) => ({
            name: s.name,
            storeId: s.storeId,
            promotionId: s.promotionId,
            platform: PlatformType[s.type] ?? `未知(${s.type})`,
            distance: s.distance < 1000 ? `${s.distance}m` : `${(s.distance / 1000).toFixed(1)}km`,
            minOrder: `${s.price}元`,
            cashback: `${s.rebatePrice}元`,
            remaining: s.leftNumber,
            review: RebateCondition[s.rebateCondition] ?? `条件${s.rebateCondition}`,
            time: `${s.startTime}-${s.endTime}`,
            hours: s.openHours,
            address: s.address ?? "",
            icon: s.icon,
          }));

          return jsonContent({
            total: stores.length,
            stores: formatted,
            tip: "记下 promotionId，用 xiaocan-get-promotion-detail 查看详情，确认后用 xiaocan-grab-order 抢单",
          });
        } catch (e) { return errorContent(e); }
      }
    );

    this.server.tool(
      "xiaocan-get-promotion-detail",
      "查看活动详情",
      xiaocanPromotionDetailSchema.shape,
      async (params) => {
        try {
          const { promotionId } = xiaocanPromotionDetailSchema.parse(params);
          const details = await getPromotionDetail(promotionId);
          if (details.length === 0) return errorContent(`未找到: ${promotionId}`);

          const formatted = details.map((d) => ({
            name: d.name,
            storeId: d.storeId,
            promotionId: d.promotionId,
            platform: PlatformType[d.type] ?? `未知(${d.type})`,
            distance: d.distance < 1000 ? `${d.distance}m` : `${(d.distance / 1000).toFixed(1)}km`,
            minOrder: `${d.price}元`,
            cashback: `${d.rebatePrice}元`,
            remaining: d.leftNumber,
            review: RebateCondition[d.rebateCondition] ?? `条件${d.rebateCondition}`,
            time: `${d.startTime}-${d.endTime}`,
            hours: d.openHours,
            icon: d.icon,
          }));

          return jsonContent({ promotion: formatted, tip: "确认后使用 xiaocan-grab-order 抢单" });
        } catch (e) { return errorContent(e); }
      }
    );

    this.server.tool(
      "xiaocan-grab-order",
      "在小蚕霸王餐抢单。传入 promotionId 即可抢单",
      xiaocanGrabOrderSchema.shape,
      async (params) => {
        try {
          const input = xiaocanGrabOrderSchema.parse(params);
          const result = await grabOrder(input.promotionId, input.lat, input.lng, input.storePlatform);

          if (!result.success) return errorContent(result.message);

          return jsonContent({
            ...result,
            tip: "抢单成功！请尽快在外卖平台下单，然后用 create-workflow 创建本地跟踪记录",
          });
        } catch (e) { return errorContent(e); }
      }
    );

    this.server.tool(
      "xiaocan-get-orders",
      "获取已抢到的返现订单列表",
      xiaocanGetOrdersSchema.shape,
      async (params) => {
        try {
          const { orderStatus } = xiaocanGetOrdersSchema.parse(params);
          const orders = await getPromotionOrders(orderStatus);

          const formatted = orders.map((o) => ({
            orderId: o.promotion_order_id,
            orderIdStr: o.order_id_str,
            storeName: o.store_promotion?.store?.name ?? "未知",
            status: o.status,
            createTime: o.create_time ? new Date(o.create_time * 1000).toISOString() : "",
          }));

          return jsonContent({ total: orders.length, orders: formatted });
        } catch (e) { return errorContent(e); }
      }
    );

    this.server.tool(
      "xiaocan-search-address",
      "搜索地址获取坐标和城市代码",
      xiaocanSearchAddressSchema.shape,
      async (params) => {
        try {
          const { keyword, region } = xiaocanSearchAddressSchema.parse(params);
          const addrs = await searchAddress(keyword, region);

          return jsonContent({
            keyword,
            addresses: addrs.map((a) => ({
              title: a.title,
              address: a.address,
              lat: a.latitude,
              lng: a.longitude,
              cityCode: a.adcode,
              district: a.district,
            })),
          });
        } catch (e) { return errorContent(e); }
      }
    );
  }

  private async connect(transport: Transport): Promise<void> {
    await this.server.connect(transport);
    Logger.log = (...args: unknown[]) => {
      this.server.server.sendLoggingMessage({ level: "info", data: args });
      console.log(...args);
    };
    Logger.error = (...args: unknown[]) => {
      this.server.server.sendLoggingMessage({ level: "error", data: args });
      console.error(...args);
    };
    Logger.log("小蚕 MCP 已连接");
  }
}

function jsonContent(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorContent(error: unknown) {
  const msg = formatError(error);
  Logger.error(msg);
  return { isError: true, content: [{ type: "text" as const, text: msg }] };
}

function formatError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  }
  return error instanceof Error ? error.message : String(error);
}

function buildReviewDraft(
  input: z.infer<typeof reviewNotesDraftSchema>,
  workflow: WorkflowItem | null
) {
  const toneLabel = { neutral: "中性", concise: "简洁", detailed: "详细" }[input.tone];
  const draftLines = [
    workflow ? `这次在 ${workflow.merchantName} 的实际体验如下。` : "这次用餐的实际体验如下。",
    `体验记录：${input.experienceNotes}`,
    input.positivePoints ? `优点：${input.positivePoints}` : undefined,
    input.issues ? `问题：${input.issues}` : undefined,
  ].filter(Boolean);

  return {
    context: workflow ? `商家：${workflow.merchantName}；平台：${workflow.platform}` : "未关联",
    tone: toneLabel,
    reminder: "请基于真实体验修改，本工具不自动发布评价。",
    draft: draftLines.join("\n"),
  };
}
