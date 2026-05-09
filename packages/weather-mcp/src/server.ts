import { WeatherClient } from "./api/weather";
import { IncomingMessage, ServerResponse } from "http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express, { Request, Response } from "express";
import { z } from "zod";
// 简单的日志记录器
export const Logger = {
  log: (...args: any[]) => console.log(...args),
  error: (...args: any[]) => console.error(...args),
};

export class WeatherMcpServer {
  private weatherClient: WeatherClient;
  private transport: Transport | null = null;
  private server: McpServer;
  constructor(appCode: string) {
    this.weatherClient = new WeatherClient(appCode);

    // 创建MCP服务器;
    this.server = new McpServer(
      {
        name: "天气MCP服务",
        version: "1.0.0",
      },
      {
        capabilities: {
          logging: {},
          tools: {},
        },
      }
    );

    // 注册工具
    this.registerTools();
  }

  private registerTools() {
    const { weatherClient } = this;
    this.server.tool(
      "get-weather",
      "获取指定城市24小时天气预报信息（默认杭州市）",
      {
        cityName: z
          .string()
          .default("杭州市")
          .describe("城市地址，不提供则返回杭州市"),
      },
      async (params = { cityName: "hangzhou" }) => {
        console.log(params, "params");
        const { cityName } = params;
        try {
          const cityIdList = await weatherClient.getCityIdByName(cityName);
          if (!cityIdList.length) {
            return {
              isError: true,
              content: [
                {
                  type: "text",
                  text: `未找到城市“${cityName}”的ID，请检查名称是否正确`,
                },
              ],
            };
          }
          const response = await weatherClient.getWeather(cityIdList[0].cityId);
          const hourly = response.hourly || [];
          console.log(hourly, "hourly");
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ hourly }),
              },
            ],
          };
        } catch (error: any) {
          Logger.error(`获取天气预报信息失败:`, error);
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `获取天气预报信息失败: ${error.message || "未知错误"}`,
              },
            ],
          };
        }
      }
    );
  }
  startHttp(port: number) {
    const app = express();

    app.get("/mcp", async (req: Request, res: Response) => {
      console.log("新的MCP SSE连接已建立");
      const transport = new SSEServerTransport(
        "/mcp-messages",
        res as unknown as ServerResponse<IncomingMessage>
      );
      this.transport = transport;
      await this.connect(transport);
    });

    app.post("/mcp-messages", async (req: Request, res: Response) => {
      if (!this.transport) {
        res.status(400).send("SSE连接尚未建立");
        return;
      }

      const sseTransport = this.transport as SSEServerTransport;
      await sseTransport.handlePostMessage(
        req as unknown as IncomingMessage,
        res as unknown as ServerResponse<IncomingMessage>
      );
    });
    // 启动HTTP服务器
    return new Promise<this>((resolve) => {
      app.listen(port, () => {
        Logger.log(`HTTP服务器已启动，监听端口: ${port}`);
        Logger.log(`SSE端点: http://localhost:${port}/mcp`);
        Logger.log(`消息端点: http://localhost:${port}/mcp-messages`);
        resolve(this);
      });
    });
  }

  /**
   * 启动标准输入输出模式
   */
  async startStdio() {
    const transport = new StdioServerTransport();
    this.transport = transport;
    await this.connect(transport);
    return this;
  }

  /**
   * 连接到传输层
   */
  private async connect(transport: Transport): Promise<void> {
    await this.server.connect(transport);

    Logger.log = (...args: any[]) => {
      this.server.server.sendLoggingMessage({
        level: "info",
        data: args,
      });
      console.log(...args);
    };

    Logger.error = (...args: any[]) => {
      this.server.server.sendLoggingMessage({
        level: "error",
        data: args,
      });
      console.error(...args);
    };

    Logger.log("服务器已连接，可以处理请求");
  }
}
