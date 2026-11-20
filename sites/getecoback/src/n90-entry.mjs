import entry from '../data/mcp-n90-entry.json' with {type:'json'};

export const N90_ENTRY_PAGE = entry.page;
export const N90_ENTRY_DOCUMENT = 'https://getecoback.com' + entry.page + entry.query;
export const N90_ENTRY_URL = N90_ENTRY_DOCUMENT + entry.fragment;
export const N90_PRODUCT_URL = entry.product_url;
export const N90_TOOL_NAME = entry.tool;
