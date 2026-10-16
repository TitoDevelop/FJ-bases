import { Injectable } from '@angular/core';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { Firestore, getFirestore, collection, query, where, orderBy, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { environment } from '../environments/environment';
import { Beat } from './beat.model';

@Injectable({providedIn: 'root'})
export class DataService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  get configured(): boolean { return !!environment.firebase.apiKey && !!environment.firebase.projectId && !!environment.firebase.appId && !!environment.adminUid; }
  constructor() {
    if(this.configured){
      this.app = getApps().length ? getApp() : initializeApp(environment.firebase);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
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
    const q=all?query(coll,orderBy('created_at','desc')):query(coll,where('published','==',true));
    const snap=await getDocs(q);
    return snap.docs.map(d=>({...(d.data() as Omit<Beat,'id'>),id:d.id})).sort((a,b)=>b.created_at.localeCompare(a.created_at));
  }
  publicBeats():Promise<Beat[]> {return this.load(false);}
  async allBeats():Promise<Beat[]> {if(!(await this.isAdmin())) throw new Error('Acceso no autorizado');return this.load(true);}
  async login(email:string,password:string):Promise<void> {
    const result=await signInWithEmailAndPassword(this.authentication,email,password);
    if(result.user.uid!==environment.adminUid){await signOut(this.authentication);throw new Error('Esta cuenta no es administradora');}
  }
  async logout():Promise<void> {await signOut(this.authentication);}
  async isAdmin():Promise<boolean> {return !!this.auth?.currentUser && this.auth.currentUser.uid===environment.adminUid;}
  async save(payload:Partial<Beat>):Promise<void> {
    if(!(await this.isAdmin())) throw new Error('Acceso no autorizado');
    const id=payload.id||crypto.randomUUID();
    const created_at=payload.created_at||new Date().toISOString();
    const saved:Beat={id,title:payload.title||'',genre:payload.genre||'Otros',bpm:Number(payload.bpm)||100,
      musical_key:payload.musical_key||'',description:payload.description||'',cover_key:payload.cover_key||null,
      preview_key:payload.preview_key||null,master_key:payload.master_key||null,
      published:payload.published===true,featured:payload.featured===true,created_at};
    await setDoc(doc(this.database,'beats',id),saved);
  }
  async remove(id:string):Promise<void> {if(!(await this.isAdmin())) throw new Error('Acceso no autorizado');await deleteDoc(doc(this.database,'beats',id));}
  mediaUrl(key:string|null):string {return key && environment.workerUrl ? `${environment.workerUrl.replace(/\/$/,'')}/public/${key}` : '';}
  async upload(file:File,kind:'previews'|'covers'|'masters'):Promise<string> {
    if(!environment.workerUrl) throw new Error('Configura la URL del Worker de R2');
    if(!(await this.isAdmin()))throw new Error('Acceso no autorizado');
    const token=await this.authentication.currentUser!.getIdToken();
    const response=await fetch(`${environment.workerUrl.replace(/\/$/,'')}/upload?kind=${kind}`,{
      method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':file.type||'application/octet-stream'},body:file
    });
    const result=await response.json() as {key?:string,error?:string};
    if(!response.ok||!result.key)throw new Error(result.error||'Error al subir archivo');
    return result.key;
  }
}
