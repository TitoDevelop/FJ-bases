import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {preparePreview} from '../tools/watermark.mjs';
const available=!spawnSync('ffmpeg',['-version'],{windowsHide:true}).error&&!spawnSync('ffprobe',['-version'],{windowsHide:true}).error;
const run=args=>{const result=spawnSync('ffmpeg',args,{windowsHide:true,maxBuffer:16*1024*1024});assert.equal(result.status,0,result.stderr?.toString());return result.stdout;};
test('FFmpeg creates MP3, repeats tag at 0/25/50 seconds and leaves quiet gaps without clipping',{skip:!available},()=>{
 const dir=mkdtempSync(join(tmpdir(),'fj-preview-test-'));
 try{
  const original=join(dir,'original.wav'),tag=join(dir,'tag.wav'),output=join(dir,'protected.mp3');
  run(['-v','error','-f','lavfi','-i','anullsrc=r=44100:cl=stereo','-t','52',original]);
  run(['-v','error','-f','lavfi','-i','sine=frequency=880:duration=1','-ar','44100',tag]);
  preparePreview(original,tag,output,192);assert.ok(existsSync(output));
  const pcm=run(['-v','error','-i',output,'-f','f32le','-ac','1','-ar','8000','pipe:1']);
  const samples=new Float32Array(pcm.buffer,pcm.byteOffset,Math.floor(pcm.length/4));
  const peak=(start,end)=>{let value=0;for(let i=start*8000;i<Math.min(end*8000,samples.length);i++)value=Math.max(value,Math.abs(samples[i]));return value;};
  for(const start of [0.2,25.2,50.2])assert.ok(peak(start,start+0.5)>0.02,'missing repeated tag at '+start);
  for(const start of [10,35])assert.ok(peak(start,start+1)<0.001,'tag leaks into quiet gap');
  assert.ok(peak(0,52)<0.96,'clipping');assert.ok(samples.length/8000>=51.9&&samples.length/8000<52.2);
  assert.throws(()=>preparePreview(original,tag,output,192),/sobrescriben/);
  assert.throws(()=>preparePreview(original,tag,join(dir,'other.mp3'),500),/Bitrate/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
