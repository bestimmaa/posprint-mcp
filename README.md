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

- `printerUri: string`
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
