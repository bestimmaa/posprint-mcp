# Posprint MCP v1 Design

Date: 2026-05-01  
Project: `posprint-mcp`  
Scope: Initial MCP server for POS printing via `posprint`

## 1. Goal

Build a TypeScript MCP server that exposes a single high-level tool, `printReceipt`, which prints Markdown content to a POS printer using a CUPS URI supported by `posprint`.

v1 prioritizes a minimal, reliable flow with clear validation, stable error codes, and useful success metadata.

## 2. Decisions Captured

- Runtime: TypeScript + Node.js
- API style: single high-level tool (`printReceipt`)
- Connection target: CUPS URI (network-focused)
- Input format: Markdown
- Success return format: `{ ok: true, meta: {...} }`

## 3. Considered Approaches

### Approach 1 (Chosen): Thin wrapper over `posprint`

Expose `printReceipt`, validate input, call `posprint`, and return structured result metadata.

**Why chosen:**
- Smallest implementation surface for v1
- Directly aligned with `posprint` capabilities
- Minimizes unnecessary abstraction while leaving room to evolve

### Approach 2: Adapter/domain abstraction

Create backend-agnostic printer interfaces and implement `posprint` as an adapter.

**Why not now:**
- Extra boilerplate for current scope
- Useful later if multiple printer backends are needed

### Approach 3: Queue/worker pipeline

Enqueue print jobs and process asynchronously.

**Why not now:**
- Operationally heavier than needed for initial release
- Better suited for high-throughput multi-printer workflows

## 4. External Contract

## Tool: `printReceipt`

### Input

```ts
{
  printerUri: string;
  markdown: string;
  options?: {
    copies?: number;
    timeoutMs?: number;
  };
}
```

### Success output

```json
{
  "ok": true,
  "meta": {
    "printerUri": "ipps://... or socket://...",
    "durationMs": 123,
    "jobId": "optional-if-available",
    "printedAt": "2026-05-01T12:34:56.000Z"
  }
}
```

### Error output (MCP tool error)

Structured error details:
- `code`: one of `VALIDATION_ERROR`, `PRINTER_ERROR`, `TIMEOUT`, `UNKNOWN_ERROR`
- `message`: human-readable summary
- `meta`: safe diagnostics (`printerUri`, elapsed time if known, summarized cause)

## 5. Architecture

Proposed file layout:

- `src/server.ts`
  - Bootstraps MCP server and registers tools
- `src/tools/printReceipt.ts`
  - Tool schema and request handler orchestration
- `src/printing/posprintClient.ts`
  - Thin wrapper around `posprint` invocation
- `src/validation/printReceiptSchema.ts`
  - Input validation rules
- `src/errors.ts`
  - Error normalization/mapping utilities
- `src/types.ts`
  - Shared request/response/meta types

### Data flow

1. MCP receives `printReceipt` request.
2. Validate `printerUri`, `markdown`, and optional fields.
3. Start timing and invoke `posprint` with CUPS URI + markdown.
4. On success, return `{ ok: true, meta }`.
5. On failure, map internal error to stable code and throw MCP tool error with structured data.

## 6. Validation Rules

- `printerUri` required, non-empty string (basic URI shape sanity check)
- `markdown` required, non-empty string
- `options.copies` optional; if present, positive integer
- `options.timeoutMs` optional; if present, positive integer with sensible upper bound

## 7. Error Handling Design

### Validation phase

- Invalid/empty `printerUri` -> `VALIDATION_ERROR`
- Empty `markdown` -> `VALIDATION_ERROR`
- Invalid option values -> `VALIDATION_ERROR`

### Execution phase

- Printer connectivity/device failures reported by `posprint` -> `PRINTER_ERROR`
- Operation exceeds timeout -> `TIMEOUT`
- Unexpected failures -> `UNKNOWN_ERROR`

Error mapping must preserve a stable public code while avoiding leaking sensitive internals.

## 8. Testing Strategy

### Unit tests

- Validation accept/reject cases
- Error mapping behavior
- Success response construction and metadata fields

### Integration-style tests (with mocked `posprint`)

- Handler invokes `posprint` with expected CUPS URI + markdown
- Simulated printer failure maps to `PRINTER_ERROR`
- Simulated timeout maps to `TIMEOUT`

### Non-CI/manual testing

- Optional real-printer verification in environments with CUPS/printer access

## 9. Non-Goals for v1

- Multiple printer backends
- Job queueing/retry persistence
- Rich receipt domain model beyond Markdown input
- Full hardware-in-the-loop CI coverage

## 10. Implementation Readiness

This design is intentionally minimal and focused for first delivery:

- one tool,
- one printing path,
- predictable output and errors,
- testable behavior without requiring hardware in CI.

It leaves a clean migration path toward an adapter model if additional backends or advanced job orchestration are later required.
