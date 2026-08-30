# 天气 MCP

天气预报 MCP，用于让智能体查询城市天气和 24 小时预报。

## 配置

在仓库根目录创建 `.env`：

```bash
APPCODE=你的阿里云天气应用编码
PORT=7777
```

`APPCODE` 属于敏感配置，只能通过本地环境变量或服务器密钥注入，不能写入源代码和 Git。

## 启动

从仓库根目录启动：

```bash
pnpm start:weather
```

也可以只启动本软件包：

```bash
pnpm --filter weather-mcp start
```

当前启动命令使用开发监听模式，启动的是 HTTP SSE 服务。当前 MCP 客户端仍通过 `stdio` 方式配置和使用；后续部署到服务器后，再将客户端配置改为服务器 SSE 地址。默认本地地址：

```text
http://localhost:7777/mcp
```

消息地址：

```text
http://localhost:7777/mcp-messages
```

## 工具

### `get-weather`

根据城市名称查询天气。城市名称不传时默认查询“杭州市”。

## 服务器部署说明

当前服务代码使用 HTTP SSE 传输层，但目前主要作为本地开发服务，客户端实际仍是 `stdio` 接入。后续服务器化时，应使用固定进程管理方式，在反向代理后提供 HTTPS、身份验证和访问控制，再让 MCP 客户端通过服务器 SSE 地址连接；不要直接将 Node 端口暴露到公网。
