import entry from '../data/mcp-cellar-entry.json' with {type:'json'};

export const CELLAR_MODEL_ENTRY_PAGE = entry.page;
export const CELLAR_MODEL_ENTRY_DOCUMENT = 'https://getecoback.com' + entry.page + entry.query;
export const CELLAR_MODEL_ENTRY_URL = CELLAR_MODEL_ENTRY_DOCUMENT + entry.fragment;
export const CELLAR_MODEL_SEARCH = entry.model_search;
