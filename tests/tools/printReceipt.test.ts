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
