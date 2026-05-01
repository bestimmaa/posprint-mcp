# Posprint MCP v1 Printing Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript MCP server with one `printReceipt` tool that prints Markdown to a CUPS URI via `posprint`, returning structured success metadata and stable error codes.

**Architecture:** Keep v1 minimal with a thin `posprint` adapter. The MCP tool handler validates input, calls a timeout-protected print client, and maps failures into stable public error codes. Tests use Vitest with module mocking so CI does not require printer hardware.

**Tech Stack:** Node.js, TypeScript, `@modelcontextprotocol/sdk`, private Bitbucket `posprint` git dependency, Zod, Vitest

---

## Planned File Structure

- Create: `package.json` — scripts and dependencies
- Create: `tsconfig.json` — TS compiler settings
- Create: `.gitignore` — ignore build/test artifacts
- Create: `src/types.ts` — request/response and error code types
- Create: `src/validation/printReceiptSchema.ts` — Zod schema + parser
- Create: `src/errors.ts` — app error class + mapper helpers
- Create: `src/printing/posprintClient.ts` — timeout-wrapped call into `posprint`
- Create: `src/tools/printReceipt.ts` — MCP tool definition + handler
- Create: `src/server.ts` — MCP server bootstrap and tool registration
- Create: `tests/validation/printReceiptSchema.test.ts`
- Create: `tests/errors.test.ts`
- Create: `tests/printing/posprintClient.test.ts`
- Create: `tests/tools/printReceipt.test.ts`
- Create: `tests/server.test.ts`
- Create: `README.md` — setup and usage instructions

### Task 1: Project bootstrap (TypeScript + test tooling)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

- [ ] **Step 1: Write the failing environment smoke test command**

Run: `npm test`
Expected: command fails with `ENOENT` because `package.json` does not exist.

- [ ] **Step 2: Add `package.json` with build/start/test scripts and dependencies**

```json
{
  "name": "posprint-mcp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/server.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "dev": "tsx src/server.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.13.0",
    "posprint": "git+ssh://git@bitbucket.org/bestimmaa/posprint.git#master",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.15.3",
    "tsx": "^4.19.3",
    "typescript": "^5.8.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 3: Add `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

- [ ] **Step 4: Add `.gitignore`**

```gitignore
node_modules/
dist/
coverage/
.vitest/
```

- [ ] **Step 5: Install dependencies and run tests to verify runner works**

Run: `npm install && npm test`
Expected: Vitest runs and exits successfully with `0 test files`.

- [ ] **Step 6: Commit bootstrap**

```bash
git add package.json tsconfig.json .gitignore
git commit -m "chore: bootstrap typescript and vitest tooling"
```

### Task 2: Define types, validation, and error mapping (TDD)

**Files:**
- Create: `src/types.ts`
- Create: `src/validation/printReceiptSchema.ts`
- Create: `src/errors.ts`
- Test: `tests/validation/printReceiptSchema.test.ts`
- Test: `tests/errors.test.ts`

- [ ] **Step 1: Write failing validation tests**

```ts
import { describe, expect, it } from "vitest";
import { parsePrintReceiptInput } from "../../src/validation/printReceiptSchema.js";

describe("parsePrintReceiptInput", () => {
  it("accepts valid input", () => {
    const parsed = parsePrintReceiptInput({
      printerUri: "ipps://printer.local/ipp/print",
      markdown: "# Hello",
      options: { copies: 2, timeoutMs: 5000 }
    });

    expect(parsed.printerUri).toBe("ipps://printer.local/ipp/print");
    expect(parsed.markdown).toBe("# Hello");
  });

  it("rejects empty markdown", () => {
    expect(() =>
      parsePrintReceiptInput({ printerUri: "ipps://printer.local/ipp/print", markdown: "" })
    ).toThrow(/markdown/i);
  });

  it("rejects invalid copies", () => {
    expect(() =>
      parsePrintReceiptInput({
        printerUri: "ipps://printer.local/ipp/print",
        markdown: "ok",
        options: { copies: 0 }
      })
    ).toThrow(/copies/i);
  });
});
```

- [ ] **Step 2: Write failing error-mapping tests**

```ts
import { describe, expect, it } from "vitest";
import { AppError, mapUnknownError } from "../src/errors.js";

describe("mapUnknownError", () => {
  it("passes through AppError unchanged", () => {
    const err = new AppError("VALIDATION_ERROR", "bad input", { field: "markdown" });
    const mapped = mapUnknownError(err);
    expect(mapped).toBe(err);
  });

  it("maps timeout-like errors to TIMEOUT", () => {
    const mapped = mapUnknownError(new Error("operation timeout exceeded"));
    expect(mapped.code).toBe("TIMEOUT");
  });

  it("maps unknown errors to UNKNOWN_ERROR", () => {
    const mapped = mapUnknownError(new Error("boom"));
    expect(mapped.code).toBe("UNKNOWN_ERROR");
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run: `npm test`
Expected: FAIL with module-not-found errors for `printReceiptSchema` and `errors`.

- [ ] **Step 4: Implement shared types**

```ts
export type PrintErrorCode =
  | "VALIDATION_ERROR"
  | "PRINTER_ERROR"
  | "TIMEOUT"
  | "UNKNOWN_ERROR";

export interface PrintReceiptInput {
  printerUri: string;
  markdown: string;
  options?: {
    copies?: number;
    timeoutMs?: number;
  };
}

export interface PrintSuccessMeta {
  printerUri: string;
  durationMs: number;
  printedAt: string;
  jobId?: string;
}

export interface PrintReceiptSuccess {
  ok: true;
  meta: PrintSuccessMeta;
}
```

- [ ] **Step 5: Implement validation parser**

```ts
import { z } from "zod";
import type { PrintReceiptInput } from "../types.js";

const printReceiptSchema = z.object({
  printerUri: z.string().trim().url("printerUri must be a valid URI"),
  markdown: z.string().min(1, "markdown cannot be empty"),
  options: z
    .object({
      copies: z.number().int().positive().max(20).optional(),
      timeoutMs: z.number().int().positive().max(120_000).optional()
    })
    .optional()
});

export function parsePrintReceiptInput(input: unknown): PrintReceiptInput {
  return printReceiptSchema.parse(input);
}
```

- [ ] **Step 6: Implement app errors and mapper**

```ts
import type { PrintErrorCode } from "./types.js";

export class AppError extends Error {
  constructor(
    public readonly code: PrintErrorCode,
    message: string,
    public readonly meta?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function mapUnknownError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof Error && /timeout/i.test(error.message)) {
    return new AppError("TIMEOUT", "Printing timed out", { cause: error.message });
  }

  return new AppError("UNKNOWN_ERROR", "Unexpected printing failure", {
    cause: error instanceof Error ? error.message : String(error)
  });
}
```

- [ ] **Step 7: Run tests to verify pass**

Run: `npm test`
Expected: PASS for validation and error mapping tests.

- [ ] **Step 8: Commit types/validation/error layer**

```bash
git add src/types.ts src/validation/printReceiptSchema.ts src/errors.ts tests/validation/printReceiptSchema.test.ts tests/errors.test.ts
git commit -m "feat: add print input validation and error mapping"
```

### Task 3: Implement `posprint` client wrapper with timeout (TDD)

**Files:**
- Create: `src/printing/posprintClient.ts`
- Test: `tests/printing/posprintClient.test.ts`

- [ ] **Step 1: Write failing tests for print client behavior**

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { printMarkdown } from "../../src/printing/posprintClient.js";

vi.mock("posprint", () => ({
  default: {
    markdownToEscpos: vi.fn(),
    printRawToPrinterUri: vi.fn()
  }
}));

import posprint from "posprint";

const api = posprint as unknown as {
  markdownToEscpos: ReturnType<typeof vi.fn>;
  printRawToPrinterUri: ReturnType<typeof vi.fn>;
};

describe("printMarkdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("converts markdown and prints to CUPS URI", async () => {
    api.markdownToEscpos.mockReturnValueOnce(Uint8Array.from([0x1b, 0x40]));
    api.printRawToPrinterUri.mockResolvedValueOnce({ printerUri: "ipps://printer.local/ipp/print" });

    const result = await printMarkdown({
      printerUri: "ipps://printer.local/ipp/print",
      markdown: "# Receipt",
      copies: 1,
      timeoutMs: 5000
    });

    expect(api.markdownToEscpos).toHaveBeenCalledWith("# Receipt", { charsPerLine: 42 });
    expect(api.printRawToPrinterUri).toHaveBeenCalledTimes(1);
    expect(api.printRawToPrinterUri).toHaveBeenCalledWith(
      "ipps://printer.local/ipp/print",
      expect.any(Buffer)
    );
    expect(result.jobId).toBeUndefined();
  });

  it("throws timeout error when URI print exceeds timeout", async () => {
    api.markdownToEscpos.mockReturnValueOnce(Uint8Array.from([0x1b, 0x40]));
    api.printRawToPrinterUri.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({}), 50)) as Promise<any>
    );

    await expect(
      printMarkdown({
        printerUri: "ipps://printer.local/ipp/print",
        markdown: "# Receipt",
        timeoutMs: 10
      })
    ).rejects.toThrow(/timeout/i);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test`
Expected: FAIL with missing module `src/printing/posprintClient.ts`.

- [ ] **Step 3: Implement timeout-wrapped client**

```ts
import posprint from "posprint";

const { markdownToEscpos, printRawToPrinterUri } = posprint as unknown as {
  markdownToEscpos: (markdown: string, options?: { charsPerLine?: number }) => Uint8Array | Buffer | number[];
  printRawToPrinterUri: (printerUri: string, data: Buffer) => Promise<unknown>;
};

export interface PrintMarkdownParams {
  printerUri: string;
  markdown: string;
  copies?: number;
  timeoutMs?: number;
  charsPerLine?: number;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`print timeout after ${timeoutMs}ms`)), timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function printMarkdown(params: PrintMarkdownParams): Promise<{ jobId?: string }> {
  const { printerUri, markdown, copies = 1, timeoutMs = 15_000, charsPerLine = 42 } = params;

  const escpos = markdownToEscpos(markdown, { charsPerLine });
  const payload = Buffer.from(escpos);

  for (let i = 0; i < copies; i += 1) {
    await withTimeout(printRawToPrinterUri(printerUri, payload), timeoutMs);
  }

  return {};
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test`
Expected: PASS for `posprintClient` tests.

- [ ] **Step 5: Commit print client**

```bash
git add src/printing/posprintClient.ts tests/printing/posprintClient.test.ts
git commit -m "feat: add posprint markdown client with timeout support"
```

### Task 4: Implement `printReceipt` tool handler (TDD)

**Files:**
- Create: `src/tools/printReceipt.ts`
- Test: `tests/tools/printReceipt.test.ts`

- [ ] **Step 1: Write failing tests for tool handler success + failures**

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { handlePrintReceipt } from "../../src/tools/printReceipt.js";
import { AppError } from "../../src/errors.js";

vi.mock("../../src/printing/posprintClient.js", () => ({
  printMarkdown: vi.fn()
}));

import { printMarkdown } from "../../src/printing/posprintClient.js";

describe("handlePrintReceipt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok + meta on success", async () => {
    vi.mocked(printMarkdown).mockResolvedValueOnce({ jobId: "99" });

    const result = await handlePrintReceipt({
      printerUri: "ipps://printer.local/ipp/print",
      markdown: "# Hi"
    });

    expect(result.ok).toBe(true);
    expect(result.meta.printerUri).toBe("ipps://printer.local/ipp/print");
    expect(result.meta.jobId).toBe("99");
    expect(result.meta.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("throws VALIDATION_ERROR for bad input", async () => {
    await expect(
      handlePrintReceipt({ printerUri: "not-a-uri", markdown: "# Hi" })
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("maps unknown runtime failures", async () => {
    vi.mocked(printMarkdown).mockRejectedValueOnce(new Error("driver crashed"));

    await expect(
      handlePrintReceipt({
        printerUri: "ipps://printer.local/ipp/print",
        markdown: "# Hi"
      })
    ).rejects.toBeInstanceOf(AppError);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test`
Expected: FAIL with missing module `src/tools/printReceipt.ts`.

- [ ] **Step 3: Implement tool handler orchestration**

```ts
import { AppError, mapUnknownError } from "../errors.js";
import { printMarkdown } from "../printing/posprintClient.js";
import type { PrintReceiptSuccess } from "../types.js";
import { parsePrintReceiptInput } from "../validation/printReceiptSchema.js";

export async function handlePrintReceipt(input: unknown): Promise<PrintReceiptSuccess> {
  const start = Date.now();

  try {
    const parsed = parsePrintReceiptInput(input);

    const result = await printMarkdown({
      printerUri: parsed.printerUri,
      markdown: parsed.markdown,
      copies: parsed.options?.copies,
      timeoutMs: parsed.options?.timeoutMs
    });

    return {
      ok: true,
      meta: {
        printerUri: parsed.printerUri,
        durationMs: Date.now() - start,
        printedAt: new Date().toISOString(),
        ...(result.jobId ? { jobId: result.jobId } : {})
      }
    };
  } catch (error) {
    if ((error as any)?.name === "ZodError") {
      throw new AppError("VALIDATION_ERROR", "Invalid printReceipt input", {
        issues: (error as any).issues
      });
    }

    throw mapUnknownError(error);
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test`
Expected: PASS for tool handler tests.

- [ ] **Step 5: Commit tool handler**

```bash
git add src/tools/printReceipt.ts tests/tools/printReceipt.test.ts
git commit -m "feat: add printReceipt orchestration handler"
```

### Task 5: Wire MCP server and registration (TDD)

**Files:**
- Create: `src/server.ts`
- Test: `tests/server.test.ts`

- [ ] **Step 1: Write failing server registration test**

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  return {
    McpServer: vi.fn().mockImplementation(() => ({
      tool: vi.fn(),
      connect: vi.fn()
    }))
  };
});

import { createServer } from "../src/server.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("createServer", () => {
  it("registers printReceipt tool", () => {
    const server = createServer();
    expect(server).toBeTruthy();

    const instance = vi.mocked(McpServer).mock.results[0]?.value;
    expect(instance.tool).toHaveBeenCalledWith(
      "printReceipt",
      expect.any(Object),
      expect.any(Function)
    );
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test`
Expected: FAIL with missing module `src/server.ts`.

- [ ] **Step 3: Implement MCP server bootstrap and tool registration**

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { handlePrintReceipt } from "./tools/printReceipt.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "posprint-mcp",
    version: "0.1.0"
  });

  server.tool(
    "printReceipt",
    {
      printerUri: z.string(),
      markdown: z.string(),
      options: z
        .object({
          copies: z.number().int().positive().optional(),
          timeoutMs: z.number().int().positive().optional()
        })
        .optional()
    },
    async (args) => {
      const result = await handlePrintReceipt(args);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    }
  );

  return server;
}

if (process.env.NODE_ENV !== "test") {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
```

- [ ] **Step 4: Run tests and build verification**

Run: `npm test && npm run build`
Expected: PASS tests and successful TypeScript compile.

- [ ] **Step 5: Commit MCP server wiring**

```bash
git add src/server.ts tests/server.test.ts
git commit -m "feat: register printReceipt MCP tool"
```

### Task 6: Documentation and final verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README with setup, tool contract, and local run steps**

```md
# posprint-mcp

MCP server for POS printer receipts using `posprint`.

## Requirements
- Node.js 20+
- A printer reachable via CUPS URI supported by `posprint`

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
```

- [ ] **Step 2: Run full verification suite**

Run: `npm test && npm run build`
Expected: all tests pass and build succeeds.

- [ ] **Step 3: Commit docs and lock v1**

```bash
git add README.md
git commit -m "docs: add usage and contract for printReceipt"
```

## Self-Review Checklist (Completed)

- Spec coverage: all required decisions are mapped to tasks (TypeScript runtime, single `printReceipt`, CUPS URI + Markdown path, meta-rich success output, stable error codes, tests).
- Placeholder scan: no `TODO`, `TBD`, or unspecified implementation steps remain.
- Type consistency: `PrintReceiptInput`, `PrintReceiptSuccess`, and error codes are consistent across planned files/tests.
