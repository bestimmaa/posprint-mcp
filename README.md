# @bestimmaa/posprint-mcp

MCP server for POS printer receipts using [`@bestimmaa/posprint`](https://www.npmjs.com/package/@bestimmaa/posprint).

The tool is intentionally named `print` so clients can map natural user phrasing such as "print receipt", "hard copy", or "print this out" to the same operation.

## Requirements

- Node.js 20+
- A printer reachable via a CUPS URI supported by `@bestimmaa/posprint`

## MCP Client Configuration

Add this to your MCP client config. No separate installation step is required — `npx` fetches the package on first run.

```json
{
  "mcpServers": {
    "posprint": {
      "command": "npx",
      "args": ["-y", "@bestimmaa/posprint-mcp"]
    }
  }
}
```

## Global Install (optional)

```bash
npm install -g @bestimmaa/posprint-mcp
```

After global installation, you can use the shorter form in your MCP client config:

```json
{
  "mcpServers": {
    "posprint": {
      "command": "posprint-mcp"
    }
  }
}
```

## Docker (remote MCP server)

For clients that can only talk to a *remote* MCP server (e.g. Notion custom agents), run `posprint-mcp` in a Docker container over HTTP instead of stdio. The image defaults to `MCP_TRANSPORT=http`.

### Configuration via `.env`

Copy [`.env.example`](.env.example) to `.env` and fill in your values — `.env` is gitignored, so real tokens/URIs never get committed.

```bash
cp .env.example .env
# edit .env: set POSPRINT_AUTH_TOKEN (e.g. `openssl rand -hex 32`) and PRINTER_URI
docker compose up -d --build
```

`docker-compose.yml` reads `.env` automatically (both for the container's env vars and the host port mapping). To run without Compose, pass the same file to `docker run` directly:

```bash
docker build -t posprint-mcp .
docker run -d --name posprint-mcp -p 3000:3000 --env-file .env posprint-mcp
```

The server listens on `POST /mcp` (MCP Streamable HTTP transport, stateless) and `GET /healthz` (unauthenticated health check). It refuses to start if `POSPRINT_AUTH_TOKEN` is unset, since an unauthenticated remote endpoint would let anyone on the network print to your printer.

Point your remote MCP client at `http://<host>:3000/mcp` with header-based auth:

```
Authorization: Bearer <POSPRINT_AUTH_TOKEN>
```

Note: the container needs network access to your printer's CUPS/IPP endpoint (typically on your LAN), so run it on a network that can reach it (e.g. `--network host`, or a bridge network with routing to the printer's subnet).

**`.local` (mDNS) hostnames will not resolve inside the container** — most base images (including this one) have no mDNS support, so a `PRINTER_URI` like `ipp://myprinter.local:631/...` will fail to connect. Use one of:

- The printer's static/reserved IP address, or
- A regular DNS name if your router provides one (e.g. many Fritz!Box routers also expose LAN devices as `<name>.fritz.box`, which resolves via normal DNS and works fine in containers).

### Environment variables

| Variable | Applies to | Description |
| --- | --- | --- |
| `MCP_TRANSPORT` | both | `stdio` (default) or `http`. The Docker image sets this to `http`. |
| `PORT` | `http` transport | Port to listen on. Defaults to `3000`. |
| `POSPRINT_AUTH_TOKEN` | `http` transport | Bearer token required on every `/mcp` request. **Required** when `MCP_TRANSPORT=http` — the server refuses to start without it. |
| `PRINTER_URI` | both | Default CUPS printer URI. When set, the `print` tool's `printerUri` argument becomes optional; an explicit `printerUri` in a tool call still takes precedence. |

## Development

```bash
npm install
npm run build
npm test
```

Run the local server from source:

```bash
npm run dev
```

Run the built server:

```bash
npm start
```

## Tool: `print`

Input:

- `printerUri?: string` (optional if the server has a default configured via the `PRINTER_URI` environment variable)
- `markdown: string`
- `mode: "preview" | "confirm"`
- `confirmationToken?: string` (required when `mode="confirm"`)
- `options?: { copies?: number; timeoutMs?: number }`

### Two-step confirmation flow

1. Call `print` with `mode: "preview"`.
2. Show the returned snippet to the user and ask for confirmation.
3. Call `print` again with `mode: "confirm"` and the returned `confirmationToken`.

Preview response includes:

- `requiresConfirmation: true`
- `confirmationToken`
- `preview.lineCount`
- `preview.snippet`
- `preview.excessiveLengthWarning` (present when markdown is more than 80 lines)

Confirm response shape:

```json
{ "ok": true, "meta": { "printerUri": "...", "durationMs": 20, "printedAt": "...", "jobId": "optional" } }
```

Error codes:

- `VALIDATION_ERROR`
- `PRINTER_ERROR`
- `TIMEOUT`
