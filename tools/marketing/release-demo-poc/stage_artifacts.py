"""Explicit allowlist: no model weights, environments, raw logs or account data."""
from pathlib import Path
import hashlib,json,os,shutil
ROOT=Path(__file__).resolve().parent;OUT=ROOT/'out';DEST=ROOT/'artifacts/deliverable';
if DEST.exists():raise SystemExit('Refusing existing artifact stage; stale files must not be reused.')
DEST.mkdir(parents=True)
def cp(src,dst):
 src=Path(src);dst=Path(dst)
 if src.is_file():dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
for n in ['gate-receipt.json'] :cp(OUT/n,DEST/n)
for stage in ['baseline','revision','restored','negative-local-selector']:
 for n in ['manifest.json','capture/capture-report.json','media/media.json','media/narration-timing.json','media/captions.srt'] :cp(OUT/stage/n,DEST/'evidence'/stage/n)
 for fmt in ['landscape','portrait']:
  for n in ['validation.json','capture.json','input-binding.json']:cp(OUT/stage/'capture'/fmt/n,DEST/'evidence'/stage/fmt/n)
final=OUT/'restored'
for n in ['proposal-demo-portrait.mp4','proposal-demo-landscape.mp4','captions.srt','narration-timing.json','narration.wav','original-music.wav','media.json','landscape-ffprobe.json','portrait-ffprobe.json'] :cp(final/'media'/n,DEST/n)
for fmt in ['landscape','portrait']:
 for n in ['download.pptx','capture.webm','render/download.pdf','render/slide-1.png','01-preview.png','02-edited.png','03-notes.png','04-downloaded.png','05-preview.png'] :cp(final/'capture'/fmt/n,DEST/'evidence/final'/fmt/n)
 for s in [1,7,12,18,24]:cp(final/'media'/f'{fmt}-{s:02d}.jpg',DEST/'qa'/f'{fmt}-{s:02d}.jpg')
cp(ROOT/'.gitignore',DEST/'code/.gitignore')
SOURCE_FILES=['capture.mjs', 'demo-project.json', 'demo.json', 'gates.py', 'prepare.mjs', 'render.py', 'requirements.txt', 'run.py', 'setup_media.py', 'source-lock.json', 'stage_artifacts.py', 'test_config.py', 'test_setup_media.py', 'test_validation.py', 'validate_export.py', 'README.md', 'package.json', 'package-lock.json']
for name in SOURCE_FILES:cp(ROOT/name,DEST/"code"/name)
for name in ["tests/fixtures/selector-valid.html","tests/fixtures/selector-broken.html","test-fixtures/licenses/espeak-ng-GPL-3.0.txt","test-fixtures/licenses/espeakng-loader-MIT.txt"]:cp(ROOT/name,DEST/"code"/name)
media=Path(os.environ['MEDIA_EVIDENCE_DIR'])
if media.exists():shutil.copytree(media,DEST/'licenses/media-evidence',dirs_exist_ok=True)
for n in ['pip-install-report.json','npm-versions.json','system-versions.txt','ffmpeg-license.txt','font-copyright.txt','unit-tests.txt'] :cp(ROOT/'artifacts'/n,DEST/'licenses'/n)
product=final/'isolated-site/source'
if product.exists():shutil.copytree(product,DEST/'code/product-source',dirs_exist_ok=True)
files=[{'file':str(p.relative_to(DEST)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(DEST.rglob('*')) if p.is_file()]
(DEST/'SHA256SUMS.json').write_text(json.dumps(files,indent=2));print(json.dumps({'files':len(files),'bytes':sum(x['bytes'] for x in files),'stage_status':'review-required' if not (DEST/'proposal-demo-portrait.mp4').exists() else ('ready-for-visual-audio-review' if (OUT/'gate-receipt.json').exists() and json.loads((OUT/'gate-receipt.json').read_text()).get('status')=='passed' else 'gates-not-passed-review-required')}))
