import { describe, expect, it } from "vitest";
import { getAuthToken, getDefaultPrinterUri, getHttpPort, getTransportMode } from "../src/config.js";

describe("getTransportMode", () => {
  it("defaults to stdio", () => {
    expect(getTransportMode({})).toBe("stdio");
  });

  it("returns http when MCP_TRANSPORT=http", () => {
    expect(getTransportMode({ MCP_TRANSPORT: "http" })).toBe("http");
  });

  it("falls back to stdio for unrecognized values", () => {
    expect(getTransportMode({ MCP_TRANSPORT: "websocket" })).toBe("stdio");
  });
});

describe("getHttpPort", () => {
  it("defaults to 3000", () => {
    expect(getHttpPort({})).toBe(3000);
  });

  it("parses a valid PORT value", () => {
    expect(getHttpPort({ PORT: "8080" })).toBe(8080);
  });

  it("throws on a non-numeric PORT", () => {
    expect(() => getHttpPort({ PORT: "not-a-port" })).toThrow(/invalid port/i);
  });

  it("throws on an out-of-range PORT", () => {
    expect(() => getHttpPort({ PORT: "70000" })).toThrow(/invalid port/i);
    expect(() => getHttpPort({ PORT: "-1" })).toThrow(/invalid port/i);
  });

  it("allows PORT=0 to request an OS-assigned ephemeral port", () => {
    expect(getHttpPort({ PORT: "0" })).toBe(0);
  });
});

describe("getAuthToken", () => {
  it("returns undefined when unset", () => {
    expect(getAuthToken({})).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getAuthToken({ POSPRINT_AUTH_TOKEN: "" })).toBeUndefined();
  });

  it("returns the configured token", () => {
    expect(getAuthToken({ POSPRINT_AUTH_TOKEN: "secret-token" })).toBe("secret-token");
  });
});

describe("getDefaultPrinterUri", () => {
  it("returns undefined when unset", () => {
    expect(getDefaultPrinterUri({})).toBeUndefined();
  });

  it("returns undefined for a blank value", () => {
    expect(getDefaultPrinterUri({ PRINTER_URI: "   " })).toBeUndefined();
  });

  it("returns the configured URI", () => {
    expect(getDefaultPrinterUri({ PRINTER_URI: "ipp://taiga.local:631/printers/T88V" })).toBe(
      "ipp://taiga.local:631/printers/T88V"
    );
  });
});
