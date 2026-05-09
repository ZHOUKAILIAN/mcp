import { resolve } from "path";
import { config } from "dotenv";
import "dotenv/config";
import { XiaocanWorkflowMcpServer } from "./server.js";

config({ path: resolve(process.cwd(), ".env") });

export async function startServer(): Promise<void> {
  const port = parseInt(process.env.PORT || "7788", 10);
  const server = new XiaocanWorkflowMcpServer();
  try {
    console.log("启动小蚕霸王餐 MCP...");
    await server.startHttp(port);
  } catch (error) {
    console.error("启动失败:", error);
    process.exit(1);
  }
}

startServer();
