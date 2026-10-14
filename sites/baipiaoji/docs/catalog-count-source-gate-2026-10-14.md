# GitHub catalogue count validation

The daily release was blocked because the count validator scanned a third-party publisher description in the GitHub search JSON as if it claimed the size of BPJ’s AI-tool catalogue. The description refers to that publisher’s supported tools. It is preserved in the delivered search data.

The count validator now ignores only publisherDescription fields inside the exact GitHub catalogue payload on the two catalogue routes, and only when the record ID, repository and description match the automatic source catalogue. Unknown, editorial or altered descriptions fail closed. Visible copy, JSON-LD and all other JSON fields remain subject to the existing count validation; there is no numeric allowlist or route-wide exemption.

Verification reproduced the original two count failures against the same completed build. The revised verifier passed all 3629 pages and 3625 canonical checks, plus the existing GitHub catalogue and site-journey checks. Regression fixtures preserve stale claims in visible text, structured data and other payload fields, reject altered or unknown descriptions, and leave other routes unchanged. The fixtures run in the existing release workflow before the output verifier.

This changes validation only. Published content, metadata, canonical URLs, account behavior and analytics remain unchanged; no new IndexNow URLs are created by this validator repair. The existing release still evaluates substantive changes from other scheduled data updates. Successful deployment or indexing submission is not acquisition evidence.
