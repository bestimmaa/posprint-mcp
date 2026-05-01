# posprint-mcp

MCP server for POS printer receipts using `posprint`.

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

## Tool: `printReceipt`

Input:
- `printerUri: string`
- `markdown: string`
- `options?: { copies?: number; timeoutMs?: number }`

Success shape:
```json
{ "ok": true, "meta": { "printerUri": "...", "durationMs": 20, "printedAt": "...", "jobId": "optional" } }
```

Error codes:
- `VALIDATION_ERROR`
- `PRINTER_ERROR`
- `TIMEOUT`
- `UNKNOWN_ERROR`
