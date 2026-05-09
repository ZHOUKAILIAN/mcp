# MCP Monorepo

个人 MCP monorepo，基于 pnpm workspace。

## Packages

- `packages/weather-mcp`: 天气预报 MCP
- `packages/xiaocan-workflow-mcp`: 小蚕霸王餐 MCP — 搜索店铺、抢单、订单管理、本地流程跟踪

## 快速开始

```bash
pnpm install
cp .env.example .env   # 编辑 .env 填入你的凭据
```

## Weather MCP

```bash
pnpm start:weather
# SSE: http://localhost:7777/mcp
```

## XiaoCan MCP

```bash
pnpm start:xiaocan
# SSE: http://localhost:7788/mcp
```

### 环境变量

在项目根目录 `.env` 中配置：

| 变量 | 必填 | 说明 |
|------|------|------|
| `XIAOCAN_TOKEN` | 是 | 小蚕 JWT token（X-Sivir），抓包获取 |
| `XIAOCAN_USER_ID` | 是 | 用户 ID（X-Vayne） |
| `XIAOCAN_SILK_ID` | 是 | 设备标识（x-Teemo） |
| `XIAOCAN_CITY_CODE` | 否 | 默认城市代码，默认 310100（上海） |
| `XIAOCAN_LAT` | 否 | 默认纬度 |
| `XIAOCAN_LNG` | 否 | 默认经度 |

不填 env 也可以通过 `xiaocan-login` 工具在会话中设置，持久化到 `~/.xiaocan-mcp/auth.json`。

### 工具列表

**小蚕 API 工具（调用真实 RPC 接口）：**

| 工具 | 说明 |
|------|------|
| `xiaocan-search-stores` | 搜索附近可抢单店铺，返回距离/返现/名额/评价要求 |
| `xiaocan-get-promotion-detail` | 查看活动详情（美团/饿了么/京东各平台） |
| `xiaocan-grab-order` | 抢单 |
| `xiaocan-get-orders` | 已抢订单列表 |
| `xiaocan-search-address` | 搜索地址获取坐标和 cityCode |
| `xiaocan-login` | 设置/持久化登录凭据 |
| `xiaocan-login-status` | 查看登录状态 |

**本地流程跟踪工具：**

| 工具 | 说明 |
|------|------|
| `create-workflow` | 创建流程记录 |
| `list-workflows` | 列出所有流程 |
| `get-workflow` | 查看流程详情 |
| `update-workflow` | 更新流程字段 |
| `advance-workflow` | 推进状态 |
| `next-action` | 下一步建议 |
| `review-notes-draft` | 评价草稿 |

### 数据存储

- 工作流记录：`./data/workflows.json`（gitignore）
- 登录凭据：`~/.xiaocan-mcp/auth.json`（仅 `xiaocan-login` 工具写入）

### 抓包获取凭据

用 Proxyman/Charles 抓小蚕 App 请求，从任意一个 `/rpc` 请求的 header 中复制：
- `X-Sivir` → `XIAOCAN_TOKEN`
- `X-Vayne` → `XIAOCAN_USER_ID`
- `x-Teemo` → `XIAOCAN_SILK_ID`
