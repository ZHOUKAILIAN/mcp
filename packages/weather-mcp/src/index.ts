import { WeatherMcpServer } from "./server.js";
import { resolve } from "path";
import { config } from "dotenv";
import "dotenv/config";

// 加载.env文件
config({ path: resolve(process.cwd(), ".env") });

// 检查必要的环境变量
if (!process.env.APPCODE) {
  console.error("错误: 请设置环境变量 APPCODE ");
  process.exit(1);
}

export async function startServer(): Promise<void> {
  const port = parseInt(process.env.PORT || "7777", 10);

  // 创建服务器实例
  const server = new WeatherMcpServer(process.env.APPCODE as string);

  try {
    // 启动HTTP服务器
    console.log("启动天气MCP服务器...");
    await server.startHttp(port);
  } catch (error) {
    console.error("服务器启动失败:", error);
    process.exit(1);
  }
}

// 启动服务器
startServer();
