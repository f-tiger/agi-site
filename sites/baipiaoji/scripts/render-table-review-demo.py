from pathlib import Path
import subprocess,json,math,wave,array
out=Path('/tmp/bpj-table-review-video');src=out/'table-review-recording.webm'
raw=float(json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(src)]))['format']['duration'])
trim=1.2;duration=raw-trim-.2;rate=44100
# Original procedural composition: soft C / Am / F / G arpeggios, no external recording.
notes=[261.6256,329.6276,391.9954,523.2511,220,261.6256,329.6276,440,174.6141,220,261.6256,349.2282,195.9977,246.9417,293.6648,391.9954]
samples=array.array('h')
for i in range(int(duration*rate)):
 t=i/rate;beat=int(t/.42);dt=t-beat*.42;f=notes[beat%len(notes)];env=(1-math.exp(-dt*100))*math.exp(-dt*5)
 tone=(math.sin(2*math.pi*f*t)+.3*math.sin(4*math.pi*f*t))*env
 bass=math.sin(2*math.pi*notes[(beat//4*4)%16]/2*t)*.12
 fade=min(1,t/1.5,(duration-t)/2)
 samples.append(int((tone*.08+bass*.1)*max(0,fade)*32767))
with wave.open(str(out/'original-music.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(samples.tobytes())
dest=out/'bpj-table-review-demo-en.mp4'
subprocess.run(['ffmpeg','-y','-v','error','-ss',str(trim),'-i',str(src),'-i',str(out/'original-music.wav'),'-t',str(duration),'-map','0:v:0','-map','1:a:0','-vf','scale=1080:1920:flags=lanczos,fps=30','-c:v','libx264','-preset','medium','-crf','24','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-af','loudnorm=I=-20:TP=-2:LRA=7','-movflags','+faststart',str(dest)],check=True)
subprocess.run(['ffmpeg','-v','error','-i',str(dest),'-f','null','-'],check=True)
print(json.dumps({'path':str(dest),'duration':duration,'bytes':dest.stat().st_size}))
