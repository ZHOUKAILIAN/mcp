# MCP 仓库

个人 MCP 仓库，基于 pnpm 工作区。

## 软件包

- `packages/weather-mcp`：天气预报 MCP
- `packages/xiaocan-workflow-mcp`：小蚕 API + 本地流程跟踪 MCP

当前 MCP 客户端仍可使用 `stdio` 方式；服务器端已完成小蚕 SSE 部署，天气服务因缺少真实 `APPCODE` 暂未启动。两个服务的 HTTPS 入口、Nginx SSE 代理和 Bearer 鉴权已配置；访问令牌仅保存在服务器 `/etc/mcp/access-token`，不写入仓库。

## 五层文档

本仓库统一使用五层文档体系：

- [第一层：产品定义](docs/第一层-产品定义/MCP产品定义.md)
- [第二层：产品实现基线](docs/第二层-产品实现/当前实现基线.md)
- [第三层：项目落地与部署](docs/第三层-项目落地/项目落地与部署.md)
- [服务器 SSE 改造对齐](docs/第三层-项目落地/服务器SSE改造对齐.md)
- [第四层：仓库治理](docs/第四层-仓库治理/仓库治理.md)
- [第五层：本地开发现场](docs/第五层-本地开发/本地开发现场.md)

历史设计和实施计划已删除，不再作为当前真理源。

## 服务器 SSE 部署状态

- 小蚕：`https://xiaocan.zhoukailian.wiki/mcp`，需携带服务器本地 Bearer 令牌，当前已通过 SSE 和 MCP `initialize` 验证。
- 天气：目标地址为 `https://weather.zhoukailian.wiki/mcp`，Nginx、证书和鉴权已配置；因缺少真实 `APPCODE`，服务进程暂未启动，不能宣称已可用。
- 两个服务均由独立 systemd 单元管理，Node 端口只监听服务器本机；Cloudflare DNS 未修改。
- 服务器部署详情和剩余问题见 [服务器 SSE 改造对齐](docs/第三层-项目落地/服务器SSE改造对齐.md)。


```bash
pnpm install
```

## 类型检查

```bash
pnpm typecheck
```

## 天气 MCP

```bash
pnpm start:weather
# SSE 地址：http://localhost:7777/mcp
```

## 小蚕 MCP

```bash
pnpm start:xiaocan
# SSE 地址：http://localhost:7788/mcp
```

### 环境变量

在仓库根目录的 `.env` 中配置：

| 变量 | 必填 | 说明 |
|---|---|---|
| `APPCODE` | 是 | 阿里云天气应用编码 |
| `XIAOCAN_TOKEN` | 是 | 小蚕登录令牌 |
| `XIAOCAN_USER_ID` | 是 | 用户 ID |
| `XIAOCAN_SILK_ID` | 是 | 设备标识 |
| `XIAOCAN_CITY_CODE` | 否 | 默认城市代码，默认 `310100`（上海） |
| `XIAOCAN_LAT` | 否 | 默认纬度 |
| `XIAOCAN_LNG` | 否 | 默认经度 |

也可以通过 `xiaocan-login` 工具在会话中设置小蚕凭据，凭据会持久化到：

```text
~/.xiaocan-mcp/auth.json
```

真实凭据不能提交到仓库，也不能写入日志或公开文档。

### 小蚕 API 工具

| 工具 | 说明 |
|---|---|
| `xiaocan-search-stores` | 搜索附近可抢单的店铺 |
| `xiaocan-get-promotion-detail` | 查看活动详情 |
| `xiaocan-grab-order` | 抢单 |
| `xiaocan-get-orders` | 查看已抢订单 |
| `xiaocan-search-address` | 搜索地址并获取坐标和城市代码 |
| `xiaocan-submit-order` | 提交返现或评价材料 |
| `xiaocan-login` | 设置并持久化登录凭据 |
| `xiaocan-login-status` | 查看登录状态 |

### 本地流程工具

| 工具 | 说明 |
|---|---|
| `create-workflow` | 创建流程记录 |
| `list-workflows` | 列出流程 |
| `get-workflow` | 查看流程详情 |
| `update-workflow` | 更新流程字段 |
| `advance-workflow` | 推进流程状态 |
| `next-action` | 获取下一步建议 |
| `review-notes-draft` | 生成评价草稿 |

### 数据存储

- 流程记录：`./data/workflows.json`，属于运行时数据，不提交到 Git。
- 登录凭据：`~/.xiaocan-mcp/auth.json`，只允许登录工具写入。

## 服务器部署提醒

仓库代码当前可以分别监听 `7777` 和 `7788`，提供开发版 HTTP SSE 服务；但实际客户端接入仍是 `stdio`。后续改为服务器 SSE 接入前，需要补充 HTTPS、访问鉴权、会话隔离、持久化存储和操作审计，不能直接裸露到公网。
