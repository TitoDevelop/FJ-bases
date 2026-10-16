// R2: previews y covers públicos; masters SOLO lectura interna, nunca GET público.
const allowed = {
 covers: ['image/jpeg','image/png','image/webp'],
 previews: ['audio/mpeg'],
 masters: ['audio/mpeg','audio/wav','audio/x-wav','audio/wave']
};
const limits = {covers: 8*1024*1024, previews: 35*1024*1024, masters: 100*1024*1024};
const json = (body,status=200,headers={}) => new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json',...headers}});
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin')||'';
  const cors={'Access-Control-Allow-Origin':origin===env.ALLOWED_ORIGIN?origin:'null','Access-Control-Allow-Headers':'Authorization,Content-Type,X-File-Name','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'};
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  const url=new URL(request.url);
  if(request.method==='GET' && url.pathname.startsWith('/public/')){
    const key=decodeURIComponent(url.pathname.slice('/public/'.length));
    if(!/^(previews|covers)\/[a-f0-9-]{36}\.(mp3|jpg|png|webp)$/.test(key))return json({error:'Not found'},404,cors);
    const obj=await env.MEDIA.get(key);if(!obj)return json({error:'Not found'},404,cors);
    const headers=new Headers(cors);obj.writeHttpMetadata(headers);headers.set('Cache-Control','public,max-age=3600');headers.set('Accept-Ranges','none');
    return new Response(obj.body,{headers});
  }
  if(request.method!=='POST'||url.pathname!=='/upload')return json({error:'Not found'},404,cors);
  if(origin!==env.ALLOWED_ORIGIN)return json({error:'Origen no permitido'},403,cors);
  const kind=url.searchParams.get('kind');if(!kind||!allowed[kind])return json({error:'Tipo no válido'},400,cors);
  const auth=request.headers.get('Authorization')||'';
  if(!auth.startsWith('Bearer '))return json({error:'Sin token'},401,cors);
  // Identity Toolkit valida el ID token de Firebase; no confiar en UID del cliente.
  const authRes=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_API_KEY)}`,{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:auth.slice(7)})
  });
  if(!authRes.ok)return json({error:'Sesión inválida'},401,cors);
  const authData=await authRes.json();
  const user=authData.users?.[0];
  if(!user?.localId || user.localId!==env.ADMIN_UID)return json({error:'No autorizado'},403,cors);
  const type=(request.headers.get('Content-Type')||'').split(';')[0].toLowerCase();
  const len=Number(request.headers.get('Content-Length')||0);
  if(!allowed[kind].includes(type))return json({error:'Formato no admitido'},415,cors);
  if(!len||len>limits[kind])return json({error:`Archivo vacío o mayor de ${Math.floor(limits[kind]/1048576)} MB`},413,cors);
  const ext=type==='image/jpeg'?'jpg':type==='image/png'?'png':type==='image/webp'?'webp':type==='audio/mpeg'?'mp3':'wav';
  const key=`${kind}/${crypto.randomUUID()}.${ext}`;
  await env.MEDIA.put(key,request.body,{httpMetadata:{contentType:type},customMetadata:{uploadedBy:user.localId}});
  return json({key},201,cors);
 }
};
