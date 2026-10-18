import {cert,getApps,initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {v2 as cloudinary} from 'cloudinary';
import {requireAdminUid} from './policy.mjs';
export const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function services(){
  const env=process.env;
  for(const key of ['FIREBASE_PROJECT_ID','FIREBASE_ADMIN_UID','FIREBASE_CLIENT_EMAIL','FIREBASE_PRIVATE_KEY','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'])if(!env[key])throw Object.assign(new Error('Configuración del servidor incompleta'),{status:503});
  const app=getApps().find(app=>app.name==='media-server')||initializeApp({projectId:env.FIREBASE_PROJECT_ID,credential:cert({projectId:env.FIREBASE_PROJECT_ID,clientEmail:env.FIREBASE_CLIENT_EMAIL,privateKey:env.FIREBASE_PRIVATE_KEY.replace(/\\n/g,'\n')})},'media-server');
  cloudinary.config({cloud_name:env.CLOUDINARY_CLOUD_NAME,api_key:env.CLOUDINARY_API_KEY,api_secret:env.CLOUDINARY_API_SECRET,secure:true});
  return {auth:getAuth(app),db:getFirestore(app),cloudinary,env};
}
export function endpoint(operation,dependencies=services){return async request=>{
  try{
    if(request.method!=='POST')return json({error:'Método no permitido'},405);
    const match=/^Bearer (\S+)$/.exec(request.headers.get('Authorization')||'');
    if(!match)return json({error:'Inicia sesión para continuar'},401);
    if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Se requiere JSON'},415);
    const raw=await request.text();if(raw.length>2048)return json({error:'Solicitud demasiado grande'},413);
    let body;try{body=JSON.parse(raw);}catch{return json({error:'JSON no válido'},400);}
    const context=dependencies();
    let token;try{token=await context.auth.verifyIdToken(match[1],true);}catch{return json({error:'Sesión no válida o caducada'},401);}
    requireAdminUid(token.uid,context.env.FIREBASE_ADMIN_UID);
    return await operation(body,{...context,uid:token.uid});
  }catch(error){const status=error.status||500; if(status===500)console.error('Media operation failed',error.code||error.name);return json({error:status===500?'No se pudo completar la operación multimedia':error.message},status);}
};}
