# posprint-mcp

MCP server for POS printer receipts using `posprint`.

The tool is intentionally named `print` so clients can map natural user phrasing such as "print receipt", "hard copy", or "print this out" to the same operation.

## Requirements
- Node.js 20+
- SSH access to the private Bitbucket repo `git@bitbucket.org:bestimmaa/posprint.git`
- A printer reachable via a CUPS URI supported by `posprint`

## Install
```bash
npm install
```

## Build
```bash
npm run build
```

## Run
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
- `UNKNOWN_ERROR`
