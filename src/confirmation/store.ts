import { createHash, randomUUID } from "node:crypto";
import { AppError } from "../errors.js";
import type { PrintReceiptInput } from "../types.js";

interface PendingConfirmation {
  printerUri: string;
  markdownHash: string;
  optionsKey: string;
  createdAt: number;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const confirmationStore = new Map<string, PendingConfirmation>();

function optionsKey(options: PrintReceiptInput["options"]): string {
  return JSON.stringify({
    copies: options?.copies ?? null,
    timeoutMs: options?.timeoutMs ?? null
  });
}

export function buildMarkdownHash(markdown: string): string {
  return createHash("sha256").update(markdown, "utf8").digest("hex");
}

export function createConfirmationToken(input: Pick<PrintReceiptInput, "printerUri" | "markdown" | "options">): string {
  const token = randomUUID();
  confirmationStore.set(token, {
    printerUri: input.printerUri,
    markdownHash: buildMarkdownHash(input.markdown),
    optionsKey: optionsKey(input.options),
    createdAt: Date.now()
  });

  return token;
}

export function consumeConfirmationToken(
  input: Pick<PrintReceiptInput, "printerUri" | "markdown" | "options"> & { confirmationToken: string },
  now = Date.now(),
  ttlMs = DEFAULT_TTL_MS
): void {
  const pending = confirmationStore.get(input.confirmationToken);

  if (!pending) {
    throw new AppError("VALIDATION_ERROR", "Invalid confirmation token", {
      confirmationToken: input.confirmationToken
    });
  }

  if (now - pending.createdAt > ttlMs) {
    confirmationStore.delete(input.confirmationToken);
    throw new AppError("VALIDATION_ERROR", "Confirmation token expired", {
      confirmationToken: input.confirmationToken
    });
  }

  const incomingHash = buildMarkdownHash(input.markdown);
  if (pending.printerUri !== input.printerUri || pending.markdownHash !== incomingHash || pending.optionsKey !== optionsKey(input.options)) {
    throw new AppError("VALIDATION_ERROR", "Confirmation token does not match print request", {
      confirmationToken: input.confirmationToken
    });
  }

  confirmationStore.delete(input.confirmationToken);
}

export function clearConfirmationStoreForTests(): void {
  confirmationStore.clear();
}
