"""End-to-end gates: freeze code, baseline, JSON-only revision, restore, local negative."""
from pathlib import Path
import hashlib,json,os,shutil,subprocess,sys,time
from run import hash_obj,check_config
ROOT=Path(__file__).resolve().parent;CONFIG=ROOT/'demo.json';OUT=ROOT/'out';OUT.mkdir(exist_ok=True)
def code_hash():return hash_obj({p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(ROOT.iterdir()) if p.suffix in ['.py','.mjs','.json','.txt'] and p.name not in ['demo.json','demo-project.json']})
def execute(name,fixture=None):
 env=dict(os.environ)
 if fixture:env['POC_FIXTURE']=fixture
 else:env.pop('POC_FIXTURE',None)
 start=time.perf_counter();cmd=[sys.executable,'run.py','demo.json','--out','out/current'];result=subprocess.run(cmd,cwd=ROOT,env=env);wall=time.perf_counter()-start;manifest=json.loads((OUT/'current/manifest.json').read_text());shutil.move(OUT/'current',OUT/name);return {'name':name,'command':['python','run.py','demo.json','--out','out/current'],'exit_code':result.returncode,'measured_wall_seconds':round(wall,3),'manifest':manifest}
for stage in ['current','baseline','revision','restored','negative-local-selector','gate-receipt.json']:
 if (OUT/stage).exists():raise SystemExit('Refusing existing gate output; use a fresh out directory. No prior artifact is accepted.')
original=CONFIG.read_bytes();frozen=code_hash();receipt={'status':'failed','implementation_frozen_sha256':frozen,'runs':[],'human_baseline':'unmeasured','manual_interventions_after_freeze':0,'gate_a':{'status':'not-run'},'gate_b':{'status':'not-run'}}
try:
 baseline=execute('baseline');receipt['runs'].append(baseline);assert baseline['exit_code']==0,'baseline failed'
 revised_bytes=original.replace(b'Turn this draft into an editable PowerPoint.',b'Turn this draft into a PowerPoint you can edit.');assert revised_bytes!=original;CONFIG.write_bytes(revised_bytes);assert code_hash()==frozen
 revised=execute('revision');receipt['runs'].append(revised);assert revised['exit_code']==0,'revision failed';assert code_hash()==frozen
 CONFIG.write_bytes(original);restored=execute('restored');receipt['runs'].append(restored);assert restored['exit_code']==0,'restoration failed';assert code_hash()==frozen
 for field in ['project','source','fixture']:
  assert baseline['manifest']['input_hashes'][field]==revised['manifest']['input_hashes'][field]==restored['manifest']['input_hashes'][field],('non-config input changed',field)
 for name in ['narration.wav','captions.srt','proposal-demo-landscape.mp4','proposal-demo-portrait.mp4']:
  a=hashlib.sha256((OUT/'baseline/media'/name).read_bytes()).hexdigest();b=hashlib.sha256((OUT/'revision/media'/name).read_bytes()).hexdigest();assert a!=b,('stale revision artifact',name)
 assert restored['manifest']['input_hashes']['config']==baseline['manifest']['input_hashes']['config'];assert revised['manifest']['input_hashes']['config']!=baseline['manifest']['input_hashes']['config']
 for stage in ['baseline','revision','restored']:
  expected='Turn this draft into a PowerPoint you can edit.' if stage=='revision' else 'Turn this draft into an editable PowerPoint.'
  timing=json.loads((OUT/stage/'media/narration-timing.json').read_text());assert timing[0]['text']==expected
  assert expected in (OUT/stage/'media/captions.srt').read_text()
  for video in json.loads((OUT/stage/'media/media.json').read_text()):assert video['config_captions'][0]==expected
 receipt['strict_byte_equality_diagnostic']={name:hashlib.sha256((OUT/'baseline/media'/name).read_bytes()).hexdigest()==hashlib.sha256((OUT/'restored/media'/name).read_bytes()).hexdigest() for name in ['narration.wav','captions.srt','proposal-demo-landscape.mp4','proposal-demo-portrait.mp4']}
 receipt['strict_byte_equality_required']=False
 receipt['gate_a']={'status':'passed','change':'Only scenes[0].narration changed in demo.json; original exact bytes restored.','code_hash_unchanged':True,'audio_srt_both_formats_changed':True,'human_labor_savings':'unmeasured'}
 negative=execute('negative-local-selector','missing-export');receipt['runs'].append(negative);assert negative['exit_code']!=0;assert negative['manifest']['input_hash']!=baseline['manifest']['input_hash'];assert not list((OUT/'negative-local-selector').rglob('*.mp4'));assert negative['manifest']['outputs']==[];assert 'LOCAL_FEATURE_SELECTOR_MISSING' in negative['manifest'].get('reason','')
 receipt['gate_b']={'status':'passed','fixture':'LOCAL wrapper disables the export selector; unchanged public production is not tested as removed.','fresh_input_hash':True,'new_successful_video':False,'cached_output_relabelled':False};receipt['status']='passed'
except Exception as e:receipt['reason']=str(e)
finally:
 CONFIG.write_bytes(original);receipt['implementation_final_sha256']=code_hash();receipt['config_original_restored']=CONFIG.read_bytes()==original;(OUT/'gate-receipt.json').write_text(json.dumps(receipt,indent=2));print(json.dumps({k:receipt[k] for k in ['status','gate_a','gate_b']}))
raise SystemExit(0 if receipt['status']=='passed' else 1)
