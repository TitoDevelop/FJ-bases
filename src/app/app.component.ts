import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { LucideAngularModule, Play, Pause, Search, ArrowUpRight, Instagram, Music2, Headphones, Menu, X, SlidersHorizontal, Disc3, ArrowRight, Volume2, ShieldCheck, LogOut, Plus, Trash2, Pencil, LoaderCircle, Mail, LockKeyhole, Check, UploadCloud, ExternalLink } from 'lucide-angular';
import { Beat, demoBeats } from './beat.model';
import { DataService } from './data.service';
import { environment } from '../environments/environment';

@Component({selector:'app-root',standalone:true,imports:[CommonModule,FormsModule,LucideAngularModule],templateUrl:'./app.component.html'})
export class AppComponent implements OnInit,OnDestroy {
 icons={Play,Pause,Search,ArrowUpRight,Instagram,Music2,Headphones,Menu,X,SlidersHorizontal,Disc3,ArrowRight,Volume2,ShieldCheck,LogOut,Plus,Trash2,Pencil,LoaderCircle,Mail,LockKeyhole,Check,UploadCloud,ExternalLink};
 data=inject(DataService);private sanitizer=inject(DomSanitizer);
 beats:Beat[]=demoBeats; filtered:Beat[]=demoBeats;
 genres=['Todos','Trap','R&B','Reggaeton','Drill','Afrobeat','Pop','Otros'];genre='Todos';query='';
 active:Beat|null=null;audio=new Audio();playing=false;progress=0;duration=0;
 admin=false;modal:'none'|'login'|'editor'='none';busy=false;error='';notice='';mobileNav=false;
 email='';password='';edit:Partial<Beat>=this.blank();previewFile:File|null=null;coverFile:File|null=null;masterFile:File|null=null;
 get configured(){return this.data.configured}
 get instagram(){return environment.instagramUrl}
 get emailLink(){return `mailto:${environment.contactEmail}`}
 get whatsapp(){return environment.whatsappNumber?`https://wa.me/${environment.whatsappNumber}`:''}
 constructor(){
  this.audio.addEventListener('timeupdate',()=>{this.progress=this.audio.currentTime;});
  this.audio.addEventListener('loadedmetadata',()=>{this.duration=Number.isFinite(this.audio.duration)?this.audio.duration:0;});
  this.audio.addEventListener('ended',()=>{this.playing=false;this.active=null;});
  this.audio.addEventListener('pause',()=>{this.playing=false;});
  this.audio.addEventListener('play',()=>{this.playing=true;});
 }
 async ngOnInit(){if(this.configured){await this.data.currentUserReady();this.admin=await this.data.isAdmin();await this.refresh();}}
 ngOnDestroy(){this.audio.pause();this.audio.src='';}
 async refresh(){try{this.beats=this.admin?await this.data.allBeats():await this.data.publicBeats();this.filter();}catch(e){this.showError(e);}}
 filter(){this.filtered=this.beats.filter(b=>(this.admin||b.published)&&(this.genre==='Todos'||b.genre===this.genre)&&(`${b.title} ${b.genre} ${b.description||''}`.toLowerCase().includes(this.query.toLowerCase())));}
 cover(b:Beat){return this.data.mediaUrl(b.cover_key)}
 formatTime(n:number){if(!Number.isFinite(n))return '0:00';return `${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`}
 async toggle(b:Beat){
  if(this.active?.id===b.id){if(this.playing)this.audio.pause();else await this.audio.play().catch(()=>this.error='Error al reproducir');return;}
  if(!b.preview_key){this.notice='Esta instrumental es una demo visual. Publica un MP3 con marca de agua desde el panel de administración.';return;}
  const url=this.data.mediaUrl(b.preview_key);if(!url){this.notice='Configura el Worker para reproducir el audio.';return;}
  this.active=b;this.audio.src=url;this.audio.load();await this.audio.play().catch(()=>this.error='No se pudo reproducir el audio');
 }
 seek(ev:Event){const value=Number((ev.target as HTMLInputElement).value);this.audio.currentTime=value;this.progress=value;}
 contact(b?:Beat){const subject=encodeURIComponent(b?`Consulta sobre el beat: ${b.title}`:'Consulta musical — Fernando Jover');const body=encodeURIComponent(b?`Hola Fernando, me interesa la instrumental «${b.title}». ¿Podemos hablar?`:'Hola Fernando, me gustaría hablar sobre una producción musical.');window.location.href=`mailto:${environment.contactEmail}?subject=${subject}&body=${body}`;}
 openEditor(b?:Beat){this.error='';this.notice='';this.previewFile=this.coverFile=this.masterFile=null;this.edit=b?{...b}:this.blank();this.modal='editor';}
 blank():Partial<Beat>{return {title:'',genre:'Trap',bpm:100,musical_key:'Am',description:'',published:false,featured:false,preview_key:null,cover_key:null,master_key:null};}
 async login(){this.busy=true;this.error='';try{await this.data.login(this.email,this.password);this.admin=true;this.modal='none';this.password='';await this.refresh();}catch(e){this.showError(e);}finally{this.busy=false;}}
 async logout(){this.audio.pause();await this.data.logout();this.admin=false;this.modal='none';await this.refresh();}
 pick(ev:Event,kind:'preview'|'cover'|'master'){const f=(ev.target as HTMLInputElement).files?.[0]||null;if(kind==='preview')this.previewFile=f;if(kind==='cover')this.coverFile=f;if(kind==='master')this.masterFile=f;}
 async save(){
  if(!this.edit.title?.trim()){this.error='Escribe un título';return;}
  this.busy=true;this.error='';try{
   const payload={...this.edit,title:this.edit.title.trim()};
   if(this.previewFile)payload.preview_key=await this.data.upload(this.previewFile,'previews');
   if(this.coverFile)payload.cover_key=await this.data.upload(this.coverFile,'covers');
   if(this.masterFile)payload.master_key=await this.data.upload(this.masterFile,'masters');
   await this.data.save(payload);this.modal='none';await this.refresh();this.notice='Instrumental guardada correctamente.';
  }catch(e){this.showError(e);}finally{this.busy=false;}
 }
 async remove(b:Beat){if(!confirm(`¿Eliminar «${b.title}» de la base de datos? (Los archivos R2 no se borran automáticamente)`))return;try{await this.data.remove(b.id);await this.refresh();this.notice='Instrumental eliminada de la base de datos.';}catch(e){this.showError(e);}}
 showError(e:unknown){this.error=e instanceof Error?e.message:String(e);}
 closeModal(){if(!this.busy){this.modal='none';this.error='';}}
}
