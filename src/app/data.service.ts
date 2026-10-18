import { Injectable } from '@angular/core';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { Auth, getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { Firestore, getFirestore, collection, query, where, getDocs, doc, setDoc, deleteDoc, serverTimestamp, deleteField, Timestamp } from 'firebase/firestore';
import { environment } from '../environments/environment';
import { Beat } from './beat.model';

@Injectable({providedIn: 'root'})
export class DataService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  get configured(): boolean { return !!environment.firebase.apiKey && !!environment.firebase.projectId && !!environment.firebase.appId; }
  constructor() {
    if(this.configured){
      this.app = getApps().length ? getApp() : initializeApp(environment.firebase);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      void this.initializeAnalytics(this.app);
    }
  }
  private async initializeAnalytics(app: FirebaseApp): Promise<void> {
    if (typeof window === 'undefined' || !environment.firebase.measurementId) return;
    try {
      if (await isSupported()) getAnalytics(app);
    } catch (error) {
      console.warn('No se pudo inicializar Firebase Analytics', error);
    }
  }
  private get database(): Firestore { if (!this.db) throw new Error('Configura Firebase en environment.ts'); return this.db; }
  private get authentication(): Auth { if(!this.auth) throw new Error('Configura Firebase'); return this.auth; }
  async currentUserReady(): Promise<void> {
    if (!this.auth) return;
    await new Promise<void>(resolve => { const unsubscribe = onAuthStateChanged(this.authentication, () => { unsubscribe(); resolve(); }, () => { unsubscribe(); resolve(); }); });
  }
  private async load(all:boolean):Promise<Beat[]> {
    const coll=collection(this.database,'beats');
    const q=all?query(coll):query(coll,where('published','==',true));
    const snap=await getDocs(q);
    return snap.docs.map(d=>{
      const raw=d.data();
      return {...raw,id:d.id,musical_key:raw['musical_key']??raw['musicalKey']??'',created_at:raw['created_at']??raw['createdAt']?.toDate?.().toISOString()??''} as Beat;
    }).sort((a,b)=>b.created_at.localeCompare(a.created_at));
  }
  publicBeats():Promise<Beat[]> {return this.load(false);}
  async allBeats():Promise<Beat[]> {if(!(await this.isAdmin())) throw new Error('Acceso no autorizado');return this.load(true);}
  async login(email:string,password:string):Promise<void> {
    if (!environment.adminUid) throw new Error('Configura el UID del administrador en environment.ts');
    const result=await signInWithEmailAndPassword(this.authentication,email.trim(),password);
    if(result.user.uid!==environment.adminUid){await signOut(this.authentication);throw new Error('Esta cuenta no es administradora');}
  }
  async logout():Promise<void> {await signOut(this.authentication);}
  async isAdmin():Promise<boolean> {return !!this.auth?.currentUser && this.auth.currentUser.uid===environment.adminUid;}
  async idToken():Promise<string> {
    if(!(await this.isAdmin()))throw new Error('Acceso no autorizado');
    return this.authentication.currentUser!.getIdToken();
  }
  async save(payload:Partial<Beat>):Promise<void> {
    if(!(await this.isAdmin())) throw new Error('Acceso no autorizado');
    if(!payload.title?.trim()||!payload.genre||!Number.isFinite(Number(payload.bpm))||Number(payload.bpm)<1||Number(payload.bpm)>300)throw new Error('Revisa título, género y BPM (1–300)');
    if(payload.price!=null&&(!Number.isFinite(Number(payload.price))||Number(payload.price)<0))throw new Error('El precio debe ser un número positivo');
    if(payload.published&&(!payload.previewProtected||!this.previewUrl(payload as Beat)))throw new Error('Para publicar necesitas una preview con marca de agua confirmada');
    const id=payload.id||crypto.randomUUID();
    const saved={title:payload.title.trim(),genre:payload.genre,bpm:Number(payload.bpm),musical_key:payload.musical_key||'',
      description:payload.description||'',published:payload.published===true,featured:payload.featured===true,
      price:payload.price==null?deleteField():Number(payload.price),
      coverUrl:payload.coverUrl||'',coverPublicId:payload.coverPublicId||'',
      previewUrl:payload.previewUrl||'',previewPublicId:payload.previewPublicId||'',previewProtected:payload.previewProtected===true,
      created_at:payload.created_at||new Date().toISOString(),updatedAt:serverTimestamp(),
      ...(!payload.createdAt?{createdAt:payload.created_at?Timestamp.fromDate(new Date(payload.created_at)):serverTimestamp()}:{})};
    await setDoc(doc(this.database,'beats',id),saved,{merge:true});
  }
  async remove(id:string):Promise<void> {if(!(await this.isAdmin()))throw new Error('Acceso no autorizado');await deleteDoc(doc(this.database,'beats',id));}
  private mediaUrl(url:string|undefined,key:string|null|undefined):string {
    if(url){try {const parsed=new URL(url);return parsed.protocol==='https:'?parsed.href:'';}catch{return '';}}
    if(!key||!environment.legacyMediaBaseUrl||! /^(covers|previews)\/[a-f0-9-]+\.(mp3|jpg|png|webp)$/.test(key))return '';
    return environment.legacyMediaBaseUrl.replace(/\/$/,'')+'/public/'+key;
  }
  coverUrl(beat:Beat):string {return this.mediaUrl(beat.coverUrl,beat.cover_key);}
  previewUrl(beat:Beat):string {return this.mediaUrl(beat.previewUrl,beat.preview_key);}
}
