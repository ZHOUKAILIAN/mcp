# MCP Monorepo and Xiaocan Workflow MCP Design

Date: 2026-05-08

## Scope

This change converts the current single weather MCP repository into a monorepo named `mcp`.

It also adds a new Xiaocan workflow MCP that helps the user manually track and complete the Xiaocan takeaway cashback workflow. The Xiaocan MCP is a workflow assistant only. It does not call Xiaocan, Meituan, Ele.me, or any other third-party private app interface.

## Safety Boundary

The referenced repository at `https://github.com/lyrric/xiaochan` appears to document or reproduce private Xiaocan app request behavior, including anti-abuse and encrypted request details. This project will not use those endpoints, headers, signing logic, device identifiers, or request replay logic.

The Xiaocan workflow MCP must not:

- Capture traffic from a phone or app.
- Reverse engineer private app APIs.
- Bypass WAF, IP checks, rate limits, device checks, login checks, or platform risk controls.
- Automatically grab Xiaocan orders.
- Automatically place Meituan or Ele.me orders.
- Generate fake reviews or automatically publish reviews.
- Automatically submit Xiaocan cashback claims.

If Xiaocan later provides official API documentation or written authorization, a separate design can define an official API integration.

## Repository Layout

Target root folder name:

```text
mcp/
```

Target monorepo layout:

```text
mcp/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  README.md
  packages/
    weather-mcp/
      package.json
      tsconfig.json
      src/
      README.md
    xiaocan-workflow-mcp/
      package.json
      tsconfig.json
      src/
      README.md
```

The current weather MCP source moves from root `src/` into `packages/weather-mcp/src/`.

The repository can keep the existing package manager lockfile that matches the chosen workspace manager. Because the repo already has both `package-lock.json` and `pnpm-lock.yaml`, the implementation should prefer `pnpm` for monorepo workspace support unless local install constraints require npm workspaces.

## Weather MCP

The weather MCP keeps its existing behavior:

- Reads `APPCODE` from the environment.
- Starts an HTTP SSE MCP server.
- Provides `get-weather` for 24-hour city weather lookup.

Package name:

```text
weather-mcp
```

Expected root commands:

```text
pnpm --filter weather-mcp start
pnpm start:weather
```

## Xiaocan Workflow MCP

Package name:

```text
xiaocan-workflow-mcp
```

The Xiaocan workflow MCP provides local tools for a manually operated process.

### Data Model

Each workflow item stores:

- `id`: local workflow id.
- `merchantName`: merchant name from Xiaocan.
- `platform`: `meituan`, `eleme`, or `other`.
- `xiaocanOrderId`: optional user-entered Xiaocan order id.
- `takeawayOrderId`: optional user-entered Meituan or Ele.me order id.
- `expectedCashbackAmount`: optional amount.
- `orderAmount`: optional takeaway order amount.
- `deadlineAt`: optional deadline.
- `status`: one of the workflow states.
- `screenshots`: optional local screenshot paths entered by the user.
- `notes`: free-form user notes.
- `createdAt` and `updatedAt`.

Workflow states:

```text
candidate
claimed
takeaway_ordered
received
reviewed
ready_to_submit
submitted
cashback_received
cancelled
```

### MCP Tools

Initial tools:

- `create-workflow`: create a local workflow item from manually entered order details.
- `list-workflows`: list items with optional status filtering.
- `get-workflow`: show one item by id.
- `update-workflow`: update fields such as order ids, amount, deadline, notes, or screenshot paths.
- `advance-workflow`: move an item to the next allowed state.
- `next-action`: return the recommended next manual action.
- `review-notes-draft`: generate a neutral review-note draft from user-provided real experience notes.

The `review-notes-draft` tool must require user-provided experience input. It should not fabricate quality claims.

### Storage

Use local JSON storage for the first version:

```text
packages/xiaocan-workflow-mcp/data/workflows.json
```

If the file does not exist, the server creates it. The implementation should use a small repository/storage module so SQLite or another store can replace JSON later.

### Transport

Use the same HTTP SSE transport style as the current weather MCP, with an independent default port.

Suggested defaults:

- Weather MCP: existing `PORT` default `7777`.
- Xiaocan workflow MCP: `PORT` default `7788`.

Each package can still be run independently.

## Error Handling

Tools should return MCP error content for:

- Missing required fields.
- Unknown workflow id.
- Invalid status transitions.
- Invalid numeric values.
- Invalid date strings.

The server should avoid throwing uncaught errors from tool handlers.

## Testing and Verification

Implementation should verify:

- TypeScript compile for all packages.
- Weather package still starts or compiles after relocation.
- Xiaocan workflow storage creates, reads, updates, and lists records.
- Status transition rules reject invalid jumps.
- Review draft tool refuses empty or fabricated input.

Minimum commands:

```text
pnpm install
pnpm typecheck
```

If package-level tests are added:

```text
pnpm test
```

## Non-Goals

This project will not download or configure Android Studio for private app traffic capture. Android Studio is unnecessary for the compliant workflow assistant. The user can still manually enter information from their phone into the MCP tools.

This project will not automate mobile UI actions or interact with Xiaocan, Meituan, or Ele.me apps.
