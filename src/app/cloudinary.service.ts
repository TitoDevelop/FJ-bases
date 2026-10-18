import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

export type MediaKind = 'covers' | 'previews';
export interface UploadedMedia { url:string; publicId:string; ticketId:string; }
interface SignedUpload { cloudName:string; apiKey:string; resourceType:'image'|'video'; signature:string; ticketId:string; params:Record<string,string|number|boolean>; }
@Injectable({providedIn:'root'})
export class CloudinaryService {
  validate(file:File,kind:MediaKind):void {
    const image = kind === 'covers';
    const valid = image ? /\.(jpg|jpeg|png|webp)$/i.test(file.name) && ['image/jpeg','image/png','image/webp'].includes(file.type) : /\.mp3$/i.test(file.name) && file.type === 'audio/mpeg';
    if (!valid) throw new Error(image?'Selecciona una portada JPG, PNG o WebP':'Selecciona una preview MP3 protegida (no WAV)');
    if (!file.size || file.size > (image?8:35)*1024*1024) throw new Error(image?'La portada debe ocupar entre 1 byte y 8 MB':'El MP3 debe ocupar entre 1 byte y 35 MB');
  }
  private async request(action:string,token:string,body:unknown,signal?:AbortSignal):Promise<any> {
    const response = await fetch(environment.cloudinary.functionsBase+'/'+action,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal});
    const data = await response.json().catch(()=>({error:'Respuesta no válida del servidor. Usa Netlify Dev para probar las subidas.'}));
    if (!response.ok) throw new Error(data.error || 'No se pudo autorizar la operación');
    return data;
  }
  async upload(file:File,kind:MediaKind,token:string,onProgress:(value:number)=>void,signal:AbortSignal,onTicket:(id:string)=>void):Promise<UploadedMedia> {
    this.validate(file,kind);
    const signed:SignedUpload = await this.request('cloudinary-sign',token,{kind,name:file.name,type:file.type,size:file.size},signal);
    onTicket(signed.ticketId);
    if (signed.cloudName !== environment.cloudinary.cloudName) throw new Error('Cloudinary del servidor no coincide con la configuración de la web');
    const form = new FormData();
    Object.entries(signed.params).forEach(([key,value])=>form.append(key,String(value)));
    form.append('api_key',signed.apiKey); form.append('signature',signed.signature); form.append('file',file);
    return new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest();
      const abort=()=>xhr.abort();
      const finish=()=>signal.removeEventListener('abort',abort);
      signal.addEventListener('abort',abort,{once:true});
      xhr.open('POST','https://api.cloudinary.com/v1_1/'+encodeURIComponent(signed.cloudName)+'/'+signed.resourceType+'/upload');
      xhr.timeout=180000;
      xhr.upload.onprogress=event=>{if(event.lengthComputable)onProgress(Math.round(event.loaded/event.total*100));};
      xhr.onload=async()=>{
        finish();
        try {
          const data=JSON.parse(xhr.responseText);
          if(xhr.status<200||xhr.status>=300)throw new Error(data.error?.message||'Cloudinary rechazó la subida');
          const url=new URL(data.secure_url);
          if(url.protocol!=='https:'||url.hostname!=='res.cloudinary.com'||!url.pathname.startsWith('/'+signed.cloudName+'/')||data.public_id!==signed.params['public_id']||data.resource_type!==signed.resourceType)throw new Error('Respuesta inesperada de Cloudinary');
          const verified:UploadedMedia=await this.request('cloudinary-complete',token,{ticketId:signed.ticketId},signal);
          resolve(verified);
        } catch(error){reject(error);}
      };
      xhr.onerror=()=>{finish();reject(new Error('Error de red al subir. Reintenta la operación.'));};
      xhr.ontimeout=()=>{finish();reject(new Error('La subida superó los 3 minutos. Reintenta.'));};
      xhr.onabort=()=>{finish();reject(new Error('Subida cancelada'));};
      if(signal.aborted){finish();reject(new Error('Subida cancelada'));return;}
      xhr.send(form);
    });
  }
  async cleanup(ticketId:string,token:string):Promise<void> {await this.request('cloudinary-cleanup',token,{ticketId});}
}
