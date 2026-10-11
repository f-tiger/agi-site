// Pure topic rules. Importing this module never fetches or writes trend data.
export const MAPS = {
  'sites/baipiaoji/data/trends-us.json': ['chatgpt', 'openai', 'claude', 'anthropic', 'gemini',
    'midjourney', 'suno', 'sora', 'grok', 'deepseek', 'kimi', 'qwen', 'copilot', 'perplexity',
    'runway', 'notebooklm', 'stable diffusion', 'llama', 'mistral', 'artificial intelligence',
    'gpt', 'veo', 'nano banana'],
  'sites/agiscorecard/trends-us.json': ['agi', 'openai', 'anthropic', 'claude', 'gpt', 'gemini',
    'superintelligence', 'altman', 'aschenbrenner', 'deepmind', 'artificial general intelligence',
    'ai benchmark', 'gpt-6', 'sam altman'],
  // Current collector scope: prioritize these four brands, then the other four.
  // Qualify HIRONO and MOLLY to avoid treating people's names as toy demand.
  'sites/thedollscout/content/trends-us.json': ['smiski', 'sonny angel', 'jellycat', 'labubu',
    'skullpanda', 'hirono figure', 'hirono toy', 'hirono blind box', 'pop mart hirono',
    'popmart hirono', 'dimoo', 'mega molly', 'molly figure', 'molly blind box',
    'pop mart molly', 'popmart molly', 'pop mart', 'popmart', 'blind box', 'blindbox'],
};

const SHORT = new Set(['agi', 'gpt', 'veo', 'sora', 'kimi', 'suno', 'grok', 'qwen']);

export const hit = (title, kw) => SHORT.has(kw)
  ? new RegExp(`(^|[^a-z0-9])${kw}([^a-z0-9]|$)`, 'i').test(title)
  : title.toLowerCase().includes(kw);
