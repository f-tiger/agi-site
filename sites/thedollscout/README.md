# TDS Document Scout

Free browser tools for creators and small teams preparing files for publication or handover. No account is required. File processing stays on the visitor’s device.

## Try a complete task

- [Run the image example](https://thedollscout.com/image-compressor?example=1#utility-result): resize a built-in image, inspect the actual export and download it. Then choose your own files.
- [Run the PDF comparison example](https://thedollscout.com/compare-pdf-text?example=1#results): inspect page-level text changes between two public sample PDFs and export the report. This is not visual comparison or OCR.
- [Record a file handover](https://thedollscout.com/delivery-evidence): create a portable inventory of final files and notes. It does not prove delivery, identity or acceptance.

The [complete toolkit](https://thedollscout.com/#tools) includes 12 tools across AI, images, JSON, time zones, file verification and PDFs. English, German and Chinese interfaces are available. Local AI models require an explicit first-use download; interface language does not imply multilingual model support.

## Build and verify

```sh
cd scripts/documents
npm ci
npm test
node build.mjs
node verify.mjs
```

The generator maintains HTML, metadata, structured data, plain text and the public tool manifest together. See CLAUDE.md for full deployment and privacy requirements. Example runs, CI checks and real task completions are separated; public event aggregates are not unique-user or revenue counts.

## History

The previous collectibles guide remains accessible in the [collector archive](https://thedollscout.com/collectors). Existing guide and tool URLs are preserved. TDS is independent of Pop Mart and Kasing Lung.
