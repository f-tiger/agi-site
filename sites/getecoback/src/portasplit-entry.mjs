import entry from '../data/mcp-portasplit-entry.json' with {type:'json'};

const canonical = 'https://getecoback.com' + entry.page;
export const PORTASPLIT_ENTRY_PAGE = entry.page;
export const PORTASPLIT_GUIDE_URL = canonical + entry.fragment;
export const PORTASPLIT_ENTRY_DOCUMENT = canonical + entry.query;
export const PORTASPLIT_ENTRY_URL = PORTASPLIT_ENTRY_DOCUMENT + entry.fragment;
export const PORTASPLIT_MODEL_SEARCH = entry.model_search;
