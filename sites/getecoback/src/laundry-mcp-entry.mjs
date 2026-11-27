import entry from '../data/mcp-laundry-entry.json' with {type:'json'};

export const LAUNDRY_ENTRY_TOOL = entry.tool;
export const LAUNDRY_ENTRY_PAGE = entry.page;
export const LAUNDRY_ENTRY_DOCUMENT = 'https://getecoback.com'+entry.page+entry.query;
export const LAUNDRY_ENTRY_URL = LAUNDRY_ENTRY_DOCUMENT+entry.fragment;
