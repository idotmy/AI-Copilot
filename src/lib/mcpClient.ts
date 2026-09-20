const OFFICIAL_DOTI_MCP_URL = 'https://doti.my/api/ai/mcp';

export async function callMcpTool(name: string, args: Record<string, any> = {}) {
  let response: Response;
  try {
    response = await fetch('/api/doti/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'tools/call',
        params: {
          name,
          arguments: args,
        },
      }),
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
  } catch {
    // Seamless fallback directly to official Doti MCP endpoint
    response = await fetch(OFFICIAL_DOTI_MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name,
          arguments: args,
        },
      }),
    });
  }

  if (!response.ok) {
    throw new Error(`MCP tool call failed with status: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'MCP Error');
  }

  const text = data?.result?.content?.[0]?.text;
  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return data.result;
}

export async function listMcpTools() {
  let response: Response;
  try {
    response = await fetch('/api/doti/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'tools/list',
        params: {},
      }),
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
  } catch {
    response = await fetch(OFFICIAL_DOTI_MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/list',
        params: {},
      }),
    });
  }
  if (!response.ok) throw new Error('Failed to fetch tools');
  const data = await response.json();
  return data.result?.tools || [];
}
