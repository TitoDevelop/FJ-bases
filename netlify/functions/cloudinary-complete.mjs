import {endpoint,json} from '../lib/server.mjs';
import {POLICY} from '../lib/policy.mjs';
export async function completeUpload(body,{db,cloudinary,env,uid}){
  if(!body||Object.keys(body).length!==1||typeof body.ticketId!=='string'||!/^[a-f0-9-]{36}$/.test(body.ticketId))return json({error:'Referencia de subida no válida'},400);
  const ref=db.collection('mediaUploads').doc(body.ticketId);const snapshot=await ref.get();
  if(!snapshot.exists||snapshot.data().uid!==uid)return json({error:'Subida no autorizada'},403);
  const ticket=snapshot.data();const policy=POLICY[ticket.kind];
  if(!policy)return json({error:'Tipo de subida no válido'},400);
  const asset=await cloudinary.api.resource(ticket.publicId,{resource_type:ticket.resourceType,media_metadata:ticket.kind==='previews'});
  if(asset.public_id!==ticket.publicId||asset.resource_type!==policy.resourceType)return json({error:'Cloudinary devolvió un archivo distinto al autorizado'},415);
  if(!policy.formats.split(',').includes(asset.format))return json({error:'Formato no admitido: '+String(asset.format||'desconocido')+'. Formatos permitidos: '+policy.formats},415);
  if(!Number.isSafeInteger(asset.bytes)||asset.bytes<1)return json({error:'Cloudinary no ha devuelto un tamaño de archivo válido. Reintenta la comprobación.'},502);
  if(asset.bytes>policy.limit)return json({error:'El archivo ocupa '+(asset.bytes/1048576).toFixed(2)+' MB y supera el máximo de '+policy.limit/1048576+' MB'},415);
  let url;
  try{url=new URL(asset.secure_url);}catch{return json({error:'Cloudinary no ha devuelto una URL válida'},415);}
  if(url.protocol!=='https:'||url.hostname!=='res.cloudinary.com'||!url.pathname.startsWith('/'+env.CLOUDINARY_CLOUD_NAME+'/'))return json({error:'La URL del archivo no pertenece a la cuenta de Cloudinary configurada'},415);
  if(ticket.kind==='previews'){
    if(!Number.isFinite(asset.duration)||asset.duration<=0)return json({error:'Cloudinary no ha devuelto una duración válida para el MP3. Reintenta la comprobación.'},502);
    if(asset.duration>1200)return json({error:'La preview dura '+(asset.duration/60).toFixed(2)+' minutos y supera el máximo de 20 minutos'},415);
  }
  await ref.update({verified:true});
  return json({url:url.href,publicId:ticket.publicId,ticketId:body.ticketId});
}
export default endpoint(completeUpload);
