from pathlib import Path
import zipfile,tempfile,subprocess,json
ROOT=Path(__file__).resolve().parents[2]
with tempfile.TemporaryDirectory() as d:
 root=Path(d)
 with zipfile.ZipFile(ROOT/'document-assets/tds-file-check-kit.zip') as z:
  assert len(z.namelist())==6 and all(not n.startswith('/') and '..' not in Path(n).parts for n in z.namelist());z.extractall(root)
 assert (root/'tools/verify-file-cli.mjs').read_bytes()==(ROOT/'document-assets/verify-file-cli.mjs').read_bytes()
 def run():return subprocess.run(['node','tools/run-file-check.mjs'],cwd=root,capture_output=True,text=True)
 ok=run();assert ok.returncode==0 and json.loads(ok.stdout)['result']=='match'
 (root/'delivery/asset.bin').write_bytes(b'changed');bad=run();assert bad.returncode==1 and json.loads(bad.stdout)['result']=='different'
 (root/'delivery/reference.txt').write_text('bad reference');assert run().returncode==2
 (root/'delivery/asset.bin').unlink();assert run().returncode==2
 workflow=(root/'.github/workflows/tds-file-check.yml').read_text();assert 'contents: read' in workflow and 'persist-credentials: false' in workflow and 'run: node tools/run-file-check.mjs' in workflow
 assert 'pull_request_target' not in workflow and 'secrets.' not in workflow
 print('Workflow kit: example passes; altered bytes, invalid reference and missing file fail; packaged verifier unchanged.')
