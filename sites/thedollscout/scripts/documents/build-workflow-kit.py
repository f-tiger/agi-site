#!/usr/bin/env python3
"""Deterministic offline/GitHub Actions starter, reusing the public verifier."""
from pathlib import Path
import io,zipfile,sys,hashlib
ROOT=Path(__file__).resolve().parents[2]
REFERENCE='https://thedollscout.com/verify-file#tds-file-v1='+hashlib.sha256(b'abc').hexdigest()+'.3'
RUNNER='''import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const reference=readFileSync(new URL('../delivery/reference.txt',import.meta.url),'utf8').trim();
const result=spawnSync(process.execPath,[fileURLToPath(new URL('./verify-file-cli.mjs',import.meta.url)),fileURLToPath(new URL('../delivery/asset.bin',import.meta.url)),reference],{stdio:'inherit',shell:false});
if(result.error)console.error('Could not start the local verifier.');
process.exitCode=result.status??2;
'''
WORKFLOW='''name: Check delivered file
on:
  workflow_dispatch:
  push:
    paths:
      - 'delivery/**'
      - 'tools/run-file-check.mjs'
      - 'tools/verify-file-cli.mjs'
      - '.github/workflows/tds-file-check.yml'
permissions:
  contents: read
jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 3
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - name: Compare bytes with the trusted reference
        run: node tools/run-file-check.mjs
'''
README='''# TDS file handoff check — runnable starter

Purpose: check whether a delivered file matches a separately obtained TDS SHA-256 + byte-length reference. No account, npm dependency, API key or TDS server call.

## Run locally first

Unzip into a new folder. Install Node.js 20 or later. From that folder run:

    node tools/run-file-check.mjs

The included asset is exactly the three bytes `abc`. Expect `match` and exit code 0. Edit `delivery/asset.bin`, keeping the reference unchanged, then rerun: expect `different` and exit code 1. An invalid reference or unreadable file returns 2. Files up to 20 MiB.

## Use your own file

Replace `delivery/asset.bin` with the exact bytes to check (the extension does not matter). Put the sender's trusted TDS reference URL in `delivery/reference.txt`, one line. Obtain the reference independently through a channel you trust; creating a reference from an already altered file cannot detect that alteration. Protect the reference: changing both asset and reference can pass.

Create or inspect references at https://thedollscout.com/verify-file?via=workflow-kit . The browser tool processes your file locally. No result is reported back to TDS by these scripts.

## Optional GitHub Actions

Copy the kit's `delivery`, `tools`, and `.github/workflows/tds-file-check.yml` into a repository you control. Preserve the hidden `.github` folder. The template runs after relevant pushes or a manual Actions trigger, with read-only contents permission. It does not create releases, send messages, or deploy anything. Review third-party action versions before adopting it; account Actions limits still apply.

Uploading the kit or your real files to GitHub is optional and uploads those files to GitHub. Public repositories expose their contents and workflow logs. Keep confidential files offline or use an appropriately restricted repository. The verifier prints the hash, size and comparison result, not the file contents.

A match is only file equality. It does NOT establish sender identity, authorship, malware safety, receipt, acceptance, trusted time or legal evidence. This is a runnable template, not an n8n integration or a hosted API. Downloads do not prove installation, execution or paying users.
'''
files={'.github/workflows/tds-file-check.yml':WORKFLOW.encode(),'tools/verify-file-cli.mjs':(ROOT/'document-assets/verify-file-cli.mjs').read_bytes(),'tools/run-file-check.mjs':RUNNER.encode(),'delivery/asset.bin':b'abc','delivery/reference.txt':(REFERENCE+'\n').encode(),'README.md':README.encode()}
b=io.BytesIO()
with zipfile.ZipFile(b,'w',zipfile.ZIP_STORED) as z:
 for name,data in files.items():
  info=zipfile.ZipInfo(name,(2026,9,29,0,0,0));info.external_attr=0o100644<<16;z.writestr(info,data)
outputs={'tds-file-check-kit.zip':b.getvalue(),'tds-file-check-kit.txt':README.encode()}
for name,data in outputs.items():
 p=ROOT/'document-assets'/name
 if '--check' in sys.argv:assert p.read_bytes()==data,'Stale kit: '+name
 else:p.write_bytes(data)
print('Workflow starter matches the public verifier.' if '--check' in sys.argv else 'Built deterministic workflow starter.')
