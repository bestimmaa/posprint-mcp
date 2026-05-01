import { describe, expect, it } from "vitest";
import { parsePrintReceiptInput } from "../../src/validation/printReceiptSchema.js";

describe("parsePrintReceiptInput", () => {
  it("accepts valid preview input", () => {
    const parsed = parsePrintReceiptInput({
      printerUri: "ipps://printer.local/ipp/print",
      markdown: "# Hello",
      mode: "preview",
      options: { copies: 2, timeoutMs: 5000 }
    });

    expect(parsed.printerUri).toBe("ipps://printer.local/ipp/print");
    expect(parsed.markdown).toBe("# Hello");
    expect(parsed.mode).toBe("preview");
  });

  it("accepts valid confirm input with token", () => {
    const parsed = parsePrintReceiptInput({
      printerUri: "ipps://printer.local/ipp/print",
      markdown: "# Hello",
      mode: "confirm",
      confirmationToken: "token-123"
    });

    expect(parsed.mode).toBe("confirm");
    expect(parsed.confirmationToken).toBe("token-123");
  });

  it("rejects empty markdown", () => {
    expect(() =>
      parsePrintReceiptInput({ printerUri: "ipps://printer.local/ipp/print", markdown: "", mode: "preview" })
    ).toThrow(/markdown/i);
  });

  it("rejects invalid copies", () => {
    expect(() =>
      parsePrintReceiptInput({
        printerUri: "ipps://printer.local/ipp/print",
        markdown: "ok",
        mode: "preview",
        options: { copies: 0 }
      })
    ).toThrow(/copies/i);
  });

  it("rejects confirm mode without token", () => {
    expect(() =>
      parsePrintReceiptInput({
        printerUri: "ipps://printer.local/ipp/print",
        markdown: "ok",
        mode: "confirm"
      })
    ).toThrow(/confirmationToken/i);
  });
});
