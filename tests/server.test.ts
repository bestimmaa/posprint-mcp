import { describe, expect, it, vi } from "vitest";

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  return {
    McpServer: vi.fn().mockImplementation(() => ({
      tool: vi.fn(),
      connect: vi.fn()
    }))
  };
});

import { createServer } from "../src/server.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("createServer", () => {
  it("registers print tool with natural-language trigger hints", () => {
    const server = createServer();
    expect(server).toBeTruthy();

    const instance = vi.mocked(McpServer).mock.results[0]?.value;
    expect(instance.tool).toHaveBeenCalledWith(
      "print",
      expect.stringContaining("print a receipt"),
      expect.any(Object),
      expect.any(Function)
    );

    expect(instance.tool).toHaveBeenCalledWith(
      "print",
      expect.stringContaining("hard copy"),
      expect.any(Object),
      expect.any(Function)
    );
  });
});
