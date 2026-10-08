from mcp.server.mcpserver import MCPServer
mcp = MCPServer("test", "1.0")
@mcp.tool()
def my_tool(ctx, arg1: str):
    pass
