import { beforeEach, describe, expect, it } from "vitest";
import {
  clearConfirmationStoreForTests,
  consumeConfirmationToken,
  createConfirmationToken
} from "../../src/confirmation/store.js";

describe("confirmation store", () => {
  beforeEach(() => {
    clearConfirmationStoreForTests();
  });

  it("creates and consumes a token once", () => {
    const token = createConfirmationToken({
      printerUri: "ipps://printer.local/ipp/print",
      markdown: "# Hello",
      options: { copies: 1, timeoutMs: 5000 }
    });

    expect(() =>
      consumeConfirmationToken({
        confirmationToken: token,
        printerUri: "ipps://printer.local/ipp/print",
        markdown: "# Hello",
        options: { copies: 1, timeoutMs: 5000 }
      })
    ).not.toThrow();

    expect(() =>
      consumeConfirmationToken({
        confirmationToken: token,
        printerUri: "ipps://printer.local/ipp/print",
        markdown: "# Hello",
        options: { copies: 1, timeoutMs: 5000 }
      })
    ).toThrow(/invalid/i);
  });

  it("rejects mismatched markdown", () => {
    const token = createConfirmationToken({
      printerUri: "ipps://printer.local/ipp/print",
      markdown: "# Hello"
    });

    expect(() =>
      consumeConfirmationToken({
        confirmationToken: token,
        printerUri: "ipps://printer.local/ipp/print",
        markdown: "# Different"
      })
    ).toThrow(/does not match/i);
  });

  it("expires confirmation token", () => {
    const token = createConfirmationToken({
      printerUri: "ipps://printer.local/ipp/print",
      markdown: "# Hello"
    });

    const now = Date.now() + 11 * 60 * 1000;

    expect(() =>
      consumeConfirmationToken(
        {
          confirmationToken: token,
          printerUri: "ipps://printer.local/ipp/print",
          markdown: "# Hello"
        },
        now,
        10 * 60 * 1000
      )
    ).toThrow(/expired/i);
  });
});
