// Fixed labels only. Neither self-reported metadata nor a UA establishes identity.
const CLIENTS = {
  chatgpt: ['chatgpt'],
  claude: ['claude', 'claude desktop', 'claude-desktop', 'claude code', 'claude-code'],
  cursor: ['cursor', 'cursor-vscode'],
  vscode: ['vscode', 'visual studio code', 'vscode-insiders'],
  copilot: ['github copilot', 'github-copilot'],
  gemini: ['gemini cli', 'gemini-cli'],
  windsurf: ['windsurf'],
};

const CLIENT_NAMES = new Map(Object.entries(CLIENTS).flatMap(([family, names]) =>
  names.map(name => [name, family])));

// Count only a product name and version in the leading UA product token.
const UA_PRODUCT = /^([\w-]+)\/\d[\w.+-]*(?:\s|$)/i;
export const MCP_CLIENT_SIGNALS = ['unknown', ...Object.keys(CLIENTS).flatMap(family =>
  [`client_info:${family}`, `user_agent:${family}`])];

export function mcpClientSignal(clientInfo, ua) {
  if (clientInfo !== undefined) {
    const {name, version} = clientInfo && typeof clientInfo === 'object' ? clientInfo : {};
    if (typeof name !== 'string' || name.length > 64 ||
        typeof version !== 'string' || !version.trim() || version.length > 64) return 'unknown';
    const family = CLIENT_NAMES.get(name.trim().toLowerCase());
    return family ? `client_info:${family}` : 'unknown';
  }
  const product = UA_PRODUCT.exec(ua.slice(0, 100))?.[1];
  const family = product && CLIENT_NAMES.get(product.toLowerCase());
  return family ? `user_agent:${family}` : 'unknown';
}
