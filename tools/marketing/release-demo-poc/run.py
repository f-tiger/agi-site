#!/usr/bin/env python3
"""One fixed local POC. Run: python run.py demo.json --out out/current.
Fresh output directories only. No existing video can satisfy a fresh run.
"""
import argparse, datetime as dt, hashlib, importlib.util, json, os, pathlib, shutil, subprocess, sys, time
ROOT=pathlib.Path(__file__).resolve().parent
APPROVED=[
 {'Turn this draft into an editable PowerPoint.','Turn this draft into a PowerPoint you can edit.'},
 {'Change the title. The preview follows your edits.'},
 {'Keep the source and speaker notes with the slide.'},
 {'Download the actual PowerPoint file, with native editable text.'},
 {'Creation and exports are free. Check the file before sharing.'}]
TIMELINE=[(0,5),(5,5),(10,5),(15,6),(21,7)]
LABELS=['ONE FREE EXPORT','EDIT THE DRAFT','KEEP THE CONTEXT','DOWNLOAD THE FILE','INSPECT THE RESULT']
HEADINGS=['Keep the deck editable.','Make the title yours.','Sources. Speaker notes.','A real PowerPoint file.','Open it. Check it. Share.']
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def canonical(o):return json.dumps(o,sort_keys=True,separators=(',',':')).encode()
def hash_obj(o):return hashlib.sha256(canonical(o)).hexdigest()
def check_config(c):
 if c.get('schema')!=1 or c.get('product')!='BPJ ProposalDeck' or c.get('feature')!='native-editable-pptx' or c.get('template')!='proposal-demo-01' or c.get('duration_seconds')!=28 or c.get('voice')!='af_heart' or c.get('expected_title')!='A focused coffee launch':raise ValueError('UNREVIEWED_CONFIG')
 if len(c.get('scenes',[]))!=5:raise ValueError('FIXED_TEMPLATE_REQUIRED')
 for i,s in enumerate(c['scenes']):
  if (s.get('at'),s.get('duration'))!=TIMELINE[i] or s.get('narration') not in APPROVED[i]:raise ValueError('UNSUPPORTED_OR_UNREVIEWED_CLAIM')
  if s.get('heading')!=HEADINGS[i] or s.get('label')!=LABELS[i]:raise ValueError('UNSUPPORTED_OR_UNREVIEWED_HEADING')
 return c

def main():
 p=argparse.ArgumentParser();p.add_argument('config');p.add_argument('--out',required=True);a=p.parse_args();out=pathlib.Path(a.out).resolve()
 if out.exists():print('Refusing existing output directory; cached results cannot satisfy this run.',file=sys.stderr);return 2
 out.mkdir(parents=True);started=time.perf_counter();manifest={'status':'review-needed','started_at_utc':dt.datetime.now(dt.timezone.utc).isoformat(),'scope':'one product, one PPTX export, one fixed template','commands':[],'manual_interventions':0,'outputs':[],'capture_binding':'local source snapshot; not proof of a live deployed commit','human_labor_savings':'unmeasured'}
 def command(cmd):
  at=time.perf_counter();r=subprocess.run(cmd,cwd=ROOT,text=True,capture_output=True);manifest['commands'].append({'argv':[str(x).replace(str(ROOT),'.').replace(str(out),'OUT') for x in cmd],'wall_seconds':round(time.perf_counter()-at,3),'exit_code':r.returncode});
  if r.returncode:raise RuntimeError(f'COMMAND_FAILED: {pathlib.Path(str(cmd[0])).name}; '+(r.stderr or r.stdout)[-1600:].replace(str(ROOT),'.').replace(str(out),'OUT'))
  return r
 try:
  config=pathlib.Path(a.config).resolve();manifest['requested_config_sha256']=sha(config);cfg=check_config(json.loads(config.read_text()));project=ROOT/'demo-project.json';repo=pathlib.Path(os.environ.get('POC_REPO_ROOT',ROOT.parents[2]));fixture=os.environ.get('POC_FIXTURE','none');source=out/'isolated-site';command(['node',str(ROOT/'prepare.mjs'),str(repo),str(source),fixture]);
  implementation={p.name:sha(p) for p in sorted(ROOT.iterdir()) if p.suffix in ['.py','.mjs','.json','.txt'] and p.name not in ['demo.json','demo-project.json']};manifest['implementation_hash']=hash_obj(implementation);manifest['implementation_files']=implementation;manifest['input_hashes']={'config':sha(config),'project':sha(project),'source':sha(source/'source.json'),'fixture':hash_obj(fixture)};manifest['input_hash']=hash_obj(manifest['input_hashes']);manifest['fixture']=fixture;manifest['source_commit']=json.loads((source/'source.json').read_text())['source_commit'];manifest['source_binding']='Exact product module Git blob hashes match source-lock.json pinned to independently fetched GitHub commit.';manifest['implementation_commit']=os.environ.get('GITHUB_SHA','local-unbound');manifest['source_files']=json.loads((source/'source.json').read_text())['source'];manifest['config']=cfg
  missing=[x for x in ['numpy','soundfile','PIL','onnxruntime','kokoro_onnx'] if importlib.util.find_spec(x) is None];missing += [x for x in ['node','ffmpeg','ffprobe','soffice','pdftoppm'] if shutil.which(x) is None]
  if missing:raise RuntimeError('DEPENDENCIES_UNAVAILABLE: '+', '.join(missing))
  model=pathlib.Path(os.environ.get('KOKORO_MODEL_DIR','models'));license_report=pathlib.Path(os.environ.get('MEDIA_EVIDENCE_DIR','artifacts/media-evidence'))/'media-ready.json'
  if not license_report.is_file():raise RuntimeError('LICENSE_AND_ASSET_HASH_GATE_MISSING')
  license_data=json.loads(license_report.read_text())
  if license_data.get('status')!='media_dependencies_ready_not_inference_tested':raise RuntimeError('LICENSE_GATE_NOT_PASSED')
  manifest['media_installation_sha256']=sha(license_report);manifest['model_voice_assets']=[]
  for asset in license_data.get('assets',[]):
   file=model/asset['filename'];actual=sha(file)
   if actual!=asset['verified_sha256']:raise RuntimeError('MODEL_OR_VOICE_HASH_CHANGED')
   manifest['model_voice_assets'].append({'file':asset['filename'],'sha256':actual})
  if len(manifest['model_voice_assets'])!=2:raise RuntimeError('MODEL_ASSET_RECEIPT_INCOMPLETE')
  cap=out/'capture';command(['node',str(ROOT/'capture.mjs'),str(source),str(cap),str(config),str(project)]);capture=json.loads((cap/'capture-report.json').read_text());
  if capture['status']!='passed':raise RuntimeError('CAPTURE_NOT_PASSED')
  for fmt in ['landscape','portrait']:
   folder=cap/fmt;binding={'schema_version':1,'inputs':{'project_sha256':sha(project),'pptx_sha256':sha(folder/'download.pptx'),'expected_title_sha256':hashlib.sha256(cfg['expected_title'].encode()).hexdigest()}};bp=folder/'input-binding.json';bp.write_text(json.dumps(binding,indent=2));command([sys.executable,str(ROOT/'validate_export.py'),'--pptx',str(folder/'download.pptx'),'--project',str(project),'--expected-title',cfg['expected_title'],'--input-manifest',str(bp),'--report',str(folder/'validation.json')]);render=folder/'render';render.mkdir();command(['soffice','--headless','--convert-to','pdf','--outdir',str(render),str(folder/'download.pptx')]);
   if not (render/'download.pdf').is_file():raise RuntimeError('NATIVE_PPTX_OPEN_FAILED')
   command(['pdftoppm','-scale-to','1600','-png','-singlefile',str(render/'download.pdf'),str(render/'slide-1')]);text=command(['pdftotext',str(render/'download.pdf'),'-']).stdout
   if cfg['expected_title'] not in text:raise RuntimeError('NATIVE_RENDER_CONTENT_MISSING')
  media=out/'media';command([sys.executable,str(ROOT/'render.py'),str(config),str(cap),str(media),'--stage','audio']);command([sys.executable,str(ROOT/'render.py'),str(config),str(cap),str(media),'--stage','render']);manifest['outputs']=json.loads((media/'media.json').read_text());manifest['status']='passed';manifest['limits']=['Automated native LibreOffice open/render, not Microsoft PowerPoint/WPS testing.','Visual and auditory human/agent review is separate from this machine result.','No customer or commercial outcome validation.']
 except Exception as e:manifest['reason']=str(e);manifest['status']='failed' if 'SELECTOR_MISSING' in str(e) or 'UNSUPPORTED' in str(e) else 'review-needed'
 finally:
  manifest['wall_seconds']=round(time.perf_counter()-started,3);manifest['finished_at_utc']=dt.datetime.now(dt.timezone.utc).isoformat();(out/'manifest.json').write_text(json.dumps(manifest,indent=2));print(json.dumps({'status':manifest['status'],'wall_seconds':manifest['wall_seconds'],'reason':manifest.get('reason')}))
 return 0 if manifest['status']=='passed' else 1
if __name__=='__main__':raise SystemExit(main())
