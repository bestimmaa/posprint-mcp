import { describe, expect, it, vi, beforeEach } from "vitest";
import { handlePrintReceipt } from "../../src/tools/printReceipt.js";
import { AppError } from "../../src/errors.js";

vi.mock("../../src/printing/posprintClient.js", () => ({
  printMarkdown: vi.fn()
}));

vi.mock("../../src/confirmation/store.js", () => ({
  createConfirmationToken: vi.fn(),
  consumeConfirmationToken: vi.fn()
}));

import { printMarkdown } from "../../src/printing/posprintClient.js";
import { consumeConfirmationToken, createConfirmationToken } from "../../src/confirmation/store.js";

describe("handlePrintReceipt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns preview payload and token in preview mode", async () => {
    vi.mocked(createConfirmationToken).mockReturnValueOnce("token-123");

    const result = await handlePrintReceipt({
      printerUri: "ipps://printer.local/ipp/print",
      markdown: "# Hi",
      mode: "preview"
    });

    expect(result.ok).toBe(true);
    expect("requiresConfirmation" in result && result.requiresConfirmation).toBe(true);
    if ("confirmationToken" in result) {
      expect(result.confirmationToken).toBe("token-123");
    }
    expect(printMarkdown).not.toHaveBeenCalled();
  });

  it("includes excessive length warning for long markdown", async () => {
    vi.mocked(createConfirmationToken).mockReturnValueOnce("token-123");
    const longMarkdown = Array.from({ length: 81 }, (_, index) => `line-${index + 1}`).join("\n");

    const result = await handlePrintReceipt({
      printerUri: "ipps://printer.local/ipp/print",
      markdown: longMarkdown,
      mode: "preview"
    });

    expect("preview" in result).toBe(true);
    if ("preview" in result) {
      expect(result.preview.lineCount).toBe(81);
      expect(result.preview.excessiveLengthWarning).toMatch(/long/i);
    }
  });

  it("prints on confirm mode with valid token", async () => {
    vi.mocked(consumeConfirmationToken).mockReturnValueOnce(undefined);
    vi.mocked(printMarkdown).mockResolvedValueOnce({ jobId: "99" });

    const result = await handlePrintReceipt({
      printerUri: "ipps://printer.local/ipp/print",
      markdown: "# Hi",
      mode: "confirm",
      confirmationToken: "token-123"
    });

    expect(result.ok).toBe(true);
    expect("meta" in result).toBe(true);
    if ("meta" in result) {
      expect(result.meta.printerUri).toBe("ipps://printer.local/ipp/print");
      expect(result.meta.jobId).toBe("99");
      expect(result.meta.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("throws VALIDATION_ERROR for missing confirmation token in confirm mode", async () => {
    await expect(
      handlePrintReceipt({ printerUri: "ipps://printer.local/ipp/print", markdown: "# Hi", mode: "confirm" })
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("maps unknown runtime failures", async () => {
    vi.mocked(consumeConfirmationToken).mockReturnValueOnce(undefined);
    vi.mocked(printMarkdown).mockRejectedValueOnce(new Error("driver crashed"));

    await expect(
      handlePrintReceipt({
        printerUri: "ipps://printer.local/ipp/print",
        markdown: "# Hi",
        mode: "confirm",
        confirmationToken: "token-123"
      })
    ).rejects.toBeInstanceOf(AppError);
  });
});
