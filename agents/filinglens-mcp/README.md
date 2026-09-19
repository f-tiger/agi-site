# FilingLens MCP — internal evaluation beta

Compare the same SEC financial fact for the exact same period at two filing cutoffs. Three read-only tools: `filinglens_example`, `filinglens_periods`, `filinglens_compare`. Prompt: `review_filing_change`; resource: `filinglens://contract`.

Requires Node.js 22+. Extract the published archive, verify its SHA-256, then run `npm ci --ignore-scripts --no-audit --no-fund` and `npm test`. Run `node scripts/evaluate.mjs` for the ten independent protocol scenarios. Configure an MCP host with command `node` and absolute argument `/path/filinglens-mcp/src/server.mjs`. A plain terminal waits on stdio; it is not a chat interface.

The host supplies one official SEC companyconcept JSON object. No file reads, network, storage, model calls or telemetry occur in this package. Host fees and data policies apply. The browser site has a separate, cached official SEC lookup. Source documentation: https://www.sec.gov/search-filings/edgar-application-programming-interfaces and https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data . Respect SEC fair access rules when obtaining data.

`filinglens_periods` returns exact start/end/unit combinations, with pagination. `filinglens_compare` accepts `{data, options:{unit,start:null|"YYYY-MM-DD",end,before,after}}`. `before` must precede `after`. It picks the latest eligible filing date at each cutoff; same-day value conflicts are incomplete. A missing baseline is not zero. It never combines fiscal labels, quarter frames, concept tags or units. Absolute decimal differences use integer arithmetic; unsafe numbers are rejected. Source references are supplied metadata and must be checked in original filings. Fictional example records have no source links.

Supported concepts: Assets, Liabilities, StockholdersEquity, Revenues, RevenueFromContractWithCustomerExcludingAssessedTax, NetIncomeLoss, EarningsPerShareDiluted, NetCashProvidedByUsedInOperatingActivities. Custom dimensions and tags are outside scope. No restatement classification, alerts, trading or investment recommendation. A reported-value change does not prove an accounting error, its cause or an investment opportunity.

The free beta license permits internal evaluation only. The proposed €19/month workspace is not built or for sale. No revenue or customer proof is claimed. Validation includes adversarial fixtures and a real SDK stdio client, not a benchmark of host-model reasoning or every desktop host.
