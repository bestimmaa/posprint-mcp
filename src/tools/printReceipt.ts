import { ZodError } from "zod";
import { createConfirmationToken, consumeConfirmationToken } from "../confirmation/store.js";
import { AppError, mapUnknownError } from "../errors.js";
import { printMarkdown } from "../printing/posprintClient.js";
import type { PrintToolResult } from "../types.js";
import { parsePrintReceiptInput } from "../validation/printReceiptSchema.js";

const EXCESSIVE_LINE_THRESHOLD = 80;
const PREVIEW_LINE_COUNT = 20;

function getLineCount(markdown: string): number {
  return markdown.split(/\r?\n/).length;
}

function buildSnippet(markdown: string, lineCount = PREVIEW_LINE_COUNT): string {
  return markdown.split(/\r?\n/).slice(0, lineCount).join("\n");
}

export async function handlePrintReceipt(input: unknown): Promise<PrintToolResult> {
  const start = Date.now();
  let printerUri: string | undefined;

  try {
    const parsed = parsePrintReceiptInput(input);
    printerUri = parsed.printerUri;

    if (parsed.mode === "preview") {
      const lineCount = getLineCount(parsed.markdown);
      const confirmationToken = createConfirmationToken({
        printerUri: parsed.printerUri,
        markdown: parsed.markdown,
        options: parsed.options
      });

      return {
        ok: true,
        requiresConfirmation: true,
        confirmationToken,
        preview: {
          lineCount,
          snippet: buildSnippet(parsed.markdown),
          suggestedAction: "Ask the user to confirm printing this preview or summarize it first.",
          ...(lineCount > EXCESSIVE_LINE_THRESHOLD
            ? {
                excessiveLengthWarning:
                  "This printout is long (>80 lines). Consider summarizing before printing."
              }
            : {})
        }
      };
    }

    consumeConfirmationToken({
      confirmationToken: parsed.confirmationToken!,
      printerUri: parsed.printerUri,
      markdown: parsed.markdown,
      options: parsed.options
    });

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
    if (error instanceof ZodError) {
      throw new AppError("VALIDATION_ERROR", "Invalid print input", {
        issues: error.issues
      });
    }

    if (
      error instanceof Error &&
      ("INVALID_URI" === (error as Error & { code?: string }).code ||
        "UNSUPPORTED_SCHEME" === (error as Error & { code?: string }).code ||
        "UNSUPPORTED_PATH" === (error as Error & { code?: string }).code)
    ) {
      throw new AppError("VALIDATION_ERROR", error.message, {
        printerUri
      });
    }

    const mapped = mapUnknownError(error);
    if (mapped.code === "UNKNOWN_ERROR") {
      throw new AppError("PRINTER_ERROR", "Printer job failed", {
        ...mapped.meta,
        durationMs: Date.now() - start
      });
    }

    throw new AppError(mapped.code, mapped.message, {
      ...mapped.meta,
      durationMs: Date.now() - start
    });
  }
}
