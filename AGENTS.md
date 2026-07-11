# AGENTS.md

## Project Purpose

`posprint-mcp` is an MCP server for printing on POS printers, such as the Epson TM-88V.

## Printing Implementation

This MCP server uses the public npm package `@bestimmaa/posprint` to implement its printing features.

The npm package is prepared as `@bestimmaa/posprint-mcp` and exposes a `posprint-mcp` binary.

## MCP Tool Contract

- Primary tool name: `print`
- Input includes:
  - `printerUri?: string` (optional if `PRINTER_URI` env var is configured as a default)
  - `markdown: string`
  - `mode: "preview" | "confirm"`
  - `confirmationToken?: string` (required when `mode="confirm"`)
  - `options?: { copies?: number; timeoutMs?: number }`

### Confirmation Flow

Printing is a two-step flow:

1. Call `print` with `mode: "preview"` to get a preview snippet and confirmation token.
2. Ask the user to confirm.
3. Call `print` with `mode: "confirm"` and the `confirmationToken` to submit the print job.

## Long Markdown Warning

If markdown exceeds 80 lines, preview responses include a warning and recommend summarizing before printing.

## Transports

- `MCP_TRANSPORT=stdio` (default): local stdio transport, used by `npx`/global installs.
- `MCP_TRANSPORT=http`: Streamable HTTP transport for remote clients (see `src/http/server.ts`), used by the Docker image. Requires `POSPRINT_AUTH_TOKEN` (bearer token) — the server refuses to start without it.
