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
