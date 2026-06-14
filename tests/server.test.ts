import { describe, expect, it, vi } from "vitest";

const { connect, tool, transportInstance } = vi.hoisted(() => ({
  connect: vi.fn(),
  tool: vi.fn(),
  transportInstance: { kind: "stdio" }
}));

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  return {
    McpServer: vi.fn().mockImplementation(() => ({
      tool,
      connect
    }))
  };
});

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => {
  return {
    StdioServerTransport: vi.fn().mockImplementation(() => transportInstance)
  };
});

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer, startServer } from "../src/server.js";

describe("createServer", () => {
  it("does not connect the server when imported", () => {
    expect(connect).not.toHaveBeenCalled();
  });

  it("registers print tool with natural-language trigger hints", () => {
    tool.mockClear();

    const server = createServer();
    expect(server).toBeTruthy();

    expect(tool).toHaveBeenCalledWith(
      "print",
      expect.stringContaining("print a receipt"),
      expect.any(Object),
      expect.any(Function)
    );

    expect(tool).toHaveBeenCalledWith(
      "print",
      expect.stringContaining("hard copy"),
      expect.any(Object),
      expect.any(Function)
    );
  });

});

describe("startServer", () => {
  it("connects the MCP server to stdio", async () => {
    connect.mockClear();
    vi.mocked(McpServer).mockClear();
    vi.mocked(StdioServerTransport).mockClear();

    await startServer();

    expect(StdioServerTransport).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledWith(transportInstance);
    expect(McpServer).toHaveBeenCalledWith({
      name: "posprint-mcp",
      version: "0.1.0"
    });
  });
});
