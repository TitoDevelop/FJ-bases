import {endpoint,json} from '../lib/server.mjs';
import {POLICY} from '../lib/policy.mjs';
export async function completeUpload(body,{db,cloudinary,env,uid}){
  if(!body||Object.keys(body).length!==1||typeof body.ticketId!=='string'||!/^[a-f0-9-]{36}$/.test(body.ticketId))return json({error:'Referencia de subida no válida'},400);
  const ref=db.collection('mediaUploads').doc(body.ticketId);const snapshot=await ref.get();
  if(!snapshot.exists||snapshot.data().uid!==uid)return json({error:'Subida no autorizada'},403);
  const ticket=snapshot.data();const policy=POLICY[ticket.kind];
  if(!policy)return json({error:'Tipo de subida no válido'},400);
  const asset=await cloudinary.api.resource(ticket.publicId,{resource_type:ticket.resourceType});
  const url=new URL(asset.secure_url);
  if(asset.public_id!==ticket.publicId||asset.resource_type!==policy.resourceType||!policy.formats.split(',').includes(asset.format)||asset.bytes<1||asset.bytes>policy.limit||url.protocol!=='https:'||url.hostname!=='res.cloudinary.com'||!url.pathname.startsWith('/'+env.CLOUDINARY_CLOUD_NAME+'/')||(ticket.kind==='previews'&&(!Number.isFinite(asset.duration)||asset.duration>1200)))return json({error:'El archivo real no cumple los límites de formato, tamaño o duración (20 minutos)'},415);
  await ref.update({verified:true});
  return json({url:url.href,publicId:ticket.publicId,ticketId:body.ticketId});
}
export default endpoint(completeUpload);
