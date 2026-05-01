import { ZodError } from "zod";
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
    if (error instanceof ZodError) {
      throw new AppError("VALIDATION_ERROR", "Invalid printReceipt input", {
        issues: error.issues
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
