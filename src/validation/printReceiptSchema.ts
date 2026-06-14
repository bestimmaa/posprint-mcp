import { z } from "zod";
import type { PrintReceiptInput } from "../types.js";

const printReceiptSchema = z
  .object({
    printerUri: z.string().trim().min(1, "printerUri cannot be empty"),
    markdown: z.string().min(1, "markdown cannot be empty"),
    mode: z.enum(["preview", "confirm"]),
    confirmationToken: z.string().min(1, "confirmationToken cannot be empty").optional(),
    options: z
      .object({
        copies: z.number().int().positive().max(20).optional(),
        timeoutMs: z.number().int().positive().max(120_000).optional()
      })
      .optional()
  })
  .superRefine((value, context) => {
    if (value.mode === "confirm" && !value.confirmationToken) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "confirmationToken is required when mode is confirm",
        path: ["confirmationToken"]
      });
    }
  });

export function parsePrintReceiptInput(input: unknown): PrintReceiptInput {
  return printReceiptSchema.parse(input);
}
