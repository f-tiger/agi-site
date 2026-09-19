from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
files=['runner.mjs','engine.mjs','core.mjs','finance.mjs','evidence.mjs','planning.mjs','inspection.mjs','profiles.mjs','LICENSE.txt']
with ZipFile('dist/offline-tools.zip','w',ZIP_DEFLATED) as z:
    for name in files:
        z.write(Path('public')/name,name)
    z.writestr('README.txt','Web3 Workbench — offline review tools\nNode.js 22+; no npm install needed.\nUsage: node runner.mjs <tool-id> input.json > report.json\nTool IDs: reconcile evidence route protocol permit compute incentives proof calls disclosures\nExit 0 means calculation completed, not that any financial action is approved. Exit 2 means invalid input.\nInput limits: 128 KiB, strict fields, bounded record lists. Read the website guide for each tool.\nNo requests, wallets, model API calls or payments. Review exported records before sharing.\n')
