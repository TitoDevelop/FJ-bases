import {spawnSync} from 'node:child_process';
import {existsSync,statSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
const run=(command,args)=>{const result=spawnSync(command,args,{encoding:'utf8',timeout:180000,maxBuffer:4*1024*1024,windowsHide:true});if(result.error)throw new Error(command+': '+result.error.message);if(result.status!==0)throw new Error((result.stderr||command+' falló').slice(-1500));return result.stdout;};
export function preparePreview(original,tag,output,bitrate=192){
  if(![128,160,192,256].includes(Number(bitrate)))throw new Error('Bitrate permitido: 128, 160, 192 o 256 kbps');
  const source=resolve(original),signature=resolve(tag),destination=resolve(output);
  if(!destination.toLowerCase().endsWith('.mp3')||existsSync(destination))throw new Error('La salida debe ser un MP3 nuevo; no se sobrescriben archivos');
  for(const file of [source,signature])if(!existsSync(file)||statSync(file).size>500*1024*1024)throw new Error('Entrada ausente o mayor de 500 MB');
  const duration=file=>Number(JSON.parse(run('ffprobe',['-v','error','-show_entries','format=duration','-of','json',file])).format.duration);
  const sourceDuration=duration(source),tagDuration=duration(signature);
  if(!Number.isFinite(sourceDuration)||sourceDuration<=0||sourceDuration>1200)throw new Error('La instrumental debe durar como máximo 20 minutos');
  if(!Number.isFinite(tagDuration)||tagDuration<0.1||tagDuration>12)throw new Error('La firma debe durar entre 0,1 y 12 segundos');
  const taskDir=mkdtempSync(join(tmpdir(),'fj-watermark-'));
  try{
    const cycle=join(taskDir,'cycle.wav');
    run('ffmpeg',['-v','error','-n','-i',signature,'-af','apad=whole_dur=25','-t','25','-ac','2','-ar','44100',cycle]);
    run('ffmpeg',['-v','error','-n','-i',source,'-stream_loop','-1','-i',cycle,'-filter_complex','[0:a]volume=0.8[music];[1:a]volume=0.65[tag];[music][tag]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.90:level=false[out]','-map','[out]','-codec:a','libmp3lame','-b:a',String(bitrate)+'k','-ac','2','-ar','44100',destination]);
    if(statSync(destination).size>35*1024*1024)throw new Error('La preview supera 35 MB. Reduce bitrate o duración.');
    return destination;
  }catch(error){if(existsSync(destination))rmSync(destination);throw error;}finally{rmSync(taskDir,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{if(process.argv.length<5)throw new Error('Uso: npm run watermark -- original.wav firma.wav preview.mp3 [192]');console.log('Preview creada: '+preparePreview(...process.argv.slice(2)));console.log('Escucha el MP3 y confirma la marca antes de publicarlo.');}catch(error){console.error(error.message);process.exitCode=1;}
}
