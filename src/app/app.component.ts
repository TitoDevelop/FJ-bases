import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule, Play, Pause, Search, ArrowUpRight, Instagram, Music2, Headphones, Menu, X, SlidersHorizontal, Disc3, ArrowRight, Volume2, ShieldCheck, LogOut, Plus, Trash2, Pencil, LoaderCircle, Mail, LockKeyhole, Check, UploadCloud, ExternalLink } from 'lucide-angular';
import { Beat, demoBeats } from './beat.model';
import { DataService } from './data.service';
import { CloudinaryService, MediaKind } from './cloudinary.service';
import { environment } from '../environments/environment';

@Component({selector:'app-site',standalone:true,imports:[CommonModule,FormsModule,LucideAngularModule],templateUrl:'./app.component.html'})
export class AppComponent implements OnInit,OnDestroy {
 icons={Play,Pause,Search,ArrowUpRight,Instagram,Music2,Headphones,Menu,X,SlidersHorizontal,Disc3,ArrowRight,Volume2,ShieldCheck,LogOut,Plus,Trash2,Pencil,LoaderCircle,Mail,LockKeyhole,Check,UploadCloud,ExternalLink};
 data=inject(DataService);private media=inject(CloudinaryService);private router=inject(Router);private route=inject(ActivatedRoute);
 beats:Beat[]=demoBeats;filtered:Beat[]=demoBeats;
 genres=['Todos','Trap','R&B','Reggaeton','Drill','Afrobeat','Pop','Otros'];genre='Todos';query='';minBpm:number|null=null;maxBpm:number|null=null;
 keys=['','C','Cm','C#','C#m','D','Dm','D#','D#m','E','Em','F','Fm','F#','F#m','G','Gm','G#','G#m','A','Am','A#','A#m','B','Bm'];
 active:Beat|null=null;audio=new Audio();playing=false;progress=0;duration=0;
 admin=false;modal:'none'|'login'|'editor'='none';busy=false;error='';notice='';mobileNav=false;
 email='';password='';edit:Partial<Beat>=this.blank();previewFile:File|null=null;coverFile:File|null=null;
 uploadProgress=0;uploadLabel='';private uploadController:AbortController|null=null;
 pendingTickets:string[]=[];private editTickets:string[]=[];auditionUrl='';
 get configured(){return this.data.configured;}
 get instagram(){return environment.instagramUrl;}
 get emailLink(){return 'mailto:'+environment.contactEmail;}
 get whatsapp(){return environment.whatsappNumber?'https://wa.me/'+environment.whatsappNumber:'';}
 constructor(){
  try{const tickets=JSON.parse(sessionStorage.getItem('mediaUploadTickets')||'[]');if(Array.isArray(tickets))this.pendingTickets=tickets.filter((id:unknown)=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id));}catch{}
  this.audio.addEventListener('timeupdate',()=>this.progress=this.audio.currentTime);
  this.audio.addEventListener('loadedmetadata',()=>this.duration=Number.isFinite(this.audio.duration)?this.audio.duration:0);
  this.audio.addEventListener('ended',()=>{this.playing=false;this.active=null;});
  this.audio.addEventListener('pause',()=>this.playing=false);
  this.audio.addEventListener('play',()=>this.playing=true);
  this.audio.addEventListener('error',()=>{this.playing=false;this.error='No se pudo cargar la preview. Comprueba el enlace o prueba otra instrumental.';});
 }
 async ngOnInit(){
  if(this.configured){await this.data.currentUserReady();this.admin=this.route.snapshot.routeConfig?.path==='admin'&&await this.data.isAdmin();await this.refresh();}
  if(this.route.snapshot.queryParamMap.has('login'))this.modal='login';
 }
 ngOnDestroy(){this.uploadController?.abort();this.audio.pause();this.audio.src='';this.clearAudition();}
 async openAdmin(){if(!this.configured){this.notice='Configura Firebase para habilitar el panel';return;}if(this.admin)this.openEditor();else if(await this.data.isAdmin())await this.router.navigate(['/admin']);else this.modal='login';}
 async refresh(){try{this.beats=this.admin?await this.data.allBeats():await this.data.publicBeats();this.filter();}catch(e){this.beats=[];this.filter();this.showError(e);}}
 filter(){this.filtered=this.beats.filter(b=>(this.admin||b.published)&&(this.genre==='Todos'||b.genre===this.genre)&&(this.minBpm==null||b.bpm>=this.minBpm)&&(this.maxBpm==null||b.bpm<=this.maxBpm)&&(b.title+' '+b.genre+' '+(b.description||'')).toLowerCase().includes(this.query.toLowerCase()));}
 cover(b:Beat){return this.data.coverUrl(b);}
 formatTime(n:number){if(!Number.isFinite(n))return '0:00';return Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');}
 async toggle(b:Beat){
  if(this.active?.id===b.id){if(this.playing)this.audio.pause();else await this.audio.play().catch(()=>this.error='Error al reproducir');return;}
  const url=this.data.previewUrl(b);if(!url){this.notice='Esta instrumental no tiene una preview disponible.';return;}
  this.audio.pause();this.active=b;this.progress=0;this.duration=0;this.audio.src=url;this.audio.load();await this.audio.play().catch(()=>this.error='No se pudo reproducir el audio');
 }
 seek(ev:Event){if(Number.isFinite(this.audio.duration))this.audio.currentTime=Number((ev.target as HTMLInputElement).value);}
 contactMessage(b?:Beat){return b?'Hola, Fernando. He escuchado la instrumental '+b.title+' y me gustaría conocer las condiciones para utilizarla en mi próximo proyecto.':'Hola, Fernando. Me gustaría hablar sobre una producción musical.';}
 whatsappFor(b:Beat){return this.whatsapp+'?text='+encodeURIComponent(this.contactMessage(b));}
 contact(b?:Beat){window.location.href='mailto:'+environment.contactEmail+'?subject='+encodeURIComponent(b?'Consulta sobre el beat: '+b.title:'Consulta musical — Fernando Jover')+'&body='+encodeURIComponent(this.contactMessage(b));}
 openEditor(b?:Beat){if(this.busy)return;if(this.editTickets.length){this.notice='Reintenta guardar o descarta las subidas pendientes antes de cambiar de instrumental.';this.modal='editor';return;}this.error='';this.notice='';this.previewFile=this.coverFile=null;this.clearAudition();this.edit=b?{...b}:this.blank();this.modal='editor';}
 blank():Partial<Beat>{return {title:'',genre:'Trap',bpm:100,musical_key:'Am',description:'',published:false,featured:false,previewProtected:false};}
 async login(){this.busy=true;this.error='';try{await this.data.login(this.email,this.password);this.password='';this.modal='none';await this.router.navigate(['/admin']);}catch(e){this.showError(e);}finally{this.busy=false;}}
 async logout(){if(this.busy)return;this.audio.pause();await this.data.logout();await this.router.navigate(['/']);}
 private clearAudition(){if(this.auditionUrl.startsWith('blob:'))URL.revokeObjectURL(this.auditionUrl);this.auditionUrl='';}
 pick(ev:Event,kind:'preview'|'cover'){
  const input=ev.target as HTMLInputElement;const file=input.files?.[0]||null;if(!file)return;
  try{this.media.validate(file,kind==='preview'?'previews':'covers');if(kind==='preview'){this.previewFile=file;this.edit.previewProtected=false;this.clearAudition();this.auditionUrl=URL.createObjectURL(file);}else this.coverFile=file;this.error='';}catch(e){input.value='';this.showError(e);}
 }
 private rememberTicket=(ticket:string)=>{this.pendingTickets.push(ticket);this.editTickets.push(ticket);this.persistTickets();};
 private persistTickets(){try{sessionStorage.setItem('mediaUploadTickets',JSON.stringify(this.pendingTickets));}catch{}}
 cancelUpload(){this.uploadController?.abort();}
 async cleanupPending(){
  if(this.busy||!confirm('¿Descartar las subidas pendientes que no están guardadas? Los archivos utilizados por instrumentales se conservarán.'))return;
  this.busy=true;this.error='';
  try{const token=await this.data.idToken();for(const ticket of [...this.pendingTickets]){try{await this.media.cleanup(ticket,token);}catch(error){if(!(error instanceof Error)||!error.message.includes('utilizado'))throw error;}this.pendingTickets=this.pendingTickets.filter(id=>id!==ticket);this.persistTickets();}this.editTickets=[];this.previewFile=this.coverFile=null;this.clearAudition();this.edit=this.blank();this.modal='none';this.notice='Subidas pendientes descartadas.';}catch(error){this.showError(error);}finally{this.busy=false;}
 }
 async save(){
  if(this.busy)return;
  if(!this.edit.title?.trim()||!this.edit.genre||!Number.isFinite(Number(this.edit.bpm))||Number(this.edit.bpm)<1||Number(this.edit.bpm)>300){this.error='Revisa título, género y BPM (1–300)';return;}
  if(this.edit.price!=null&&(!Number.isFinite(Number(this.edit.price))||Number(this.edit.price)<0)){this.error='El precio debe ser positivo';return;}
  if((this.previewFile||this.edit.published)&&!this.edit.previewProtected){this.error='Escucha la preview y confirma que tiene marca de agua audible';return;}
  if(this.edit.published&&!this.previewFile&&!this.data.previewUrl(this.edit as Beat)){this.error='Añade una preview MP3 protegida antes de publicar';return;}
  this.busy=true;this.error='';this.uploadController=new AbortController();this.uploadProgress=0;
  try{
   const token=await this.data.idToken();
   const upload=async(file:File,kind:MediaKind)=>this.media.upload(file,kind,token,value=>this.uploadProgress=value,this.uploadController!.signal,this.rememberTicket);
   if(this.coverFile){this.uploadLabel='Subiendo portada';const asset=await upload(this.coverFile,'covers');this.edit.coverUrl=asset.url;this.edit.coverPublicId=asset.publicId;this.coverFile=null;}
   if(this.previewFile){this.uploadLabel='Subiendo preview protegida';this.uploadProgress=0;const asset=await upload(this.previewFile,'previews');this.edit.previewUrl=asset.url;this.edit.previewPublicId=asset.publicId;this.previewFile=null;}
   this.uploadLabel='Guardando instrumental';if(this.uploadController.signal.aborted)throw new Error('Operación cancelada');
   // Mantener el mismo ID si la respuesta de Firestore se pierde y se reintenta.
   this.edit.id ||= crypto.randomUUID();
   await this.data.save(this.edit);
   const usedTickets=this.editTickets.filter(ticket=>this.edit.coverPublicId?.endsWith('/'+ticket)||this.edit.previewPublicId?.endsWith('/'+ticket));
   this.pendingTickets=this.pendingTickets.filter(ticket=>!usedTickets.includes(ticket));this.persistTickets();this.editTickets=[];
   this.modal='none';this.clearAudition();await this.refresh();this.notice='Instrumental guardada correctamente.';
  }catch(e){this.showError(e);if(this.editTickets.length)this.error+=' Puedes reintentar guardar o descartar las subidas pendientes.';}finally{this.busy=false;this.uploadController=null;this.uploadLabel='';}
 }
 async remove(b:Beat){if(this.busy||!confirm('¿Eliminar '+b.title+' del catálogo? Los archivos se conservan en Cloudinary.'))return;try{if(this.active?.id===b.id){this.audio.pause();this.active=null;}await this.data.remove(b.id);await this.refresh();this.notice='Instrumental eliminada del catálogo.';}catch(e){this.showError(e);}}
 showError(e:unknown){this.error=e instanceof Error?e.message:String(e);}
 closeModal(){if(!this.busy){this.modal='none';this.error='';}}
}
