import {endpoint,json} from '../lib/server.mjs';
export async function cleanupUpload(body,{db,cloudinary,uid}){
  if(!body||Object.keys(body).length!==1||typeof body.ticketId!=='string'||!/^[a-f0-9-]{36}$/.test(body.ticketId))return json({error:'Referencia de subida no válida'},400);
  const ref=db.collection('mediaUploads').doc(body.ticketId);const snapshot=await ref.get();
  if(!snapshot.exists)return json({error:'Subida no encontrada'},404);
  const asset=snapshot.data();
  if(asset.uid!==uid||!/^fernando-jover\/(covers|previews)\/[a-f0-9-]{36}$/.test(asset.publicId)||!['image','video'].includes(asset.resourceType))return json({error:'Operación no permitida'},403);
  // Las referencias guardadas siempre se conservan. No se aceptan public IDs del navegador.
  for(const field of ['previewPublicId','coverPublicId']){
    const referenced=await db.collection('beats').where(field,'==',asset.publicId).limit(1).get();
    if(!referenced.empty)return json({error:'El archivo está utilizado por una instrumental'},409);
  }
  const result=await cloudinary.uploader.destroy(asset.publicId,{resource_type:asset.resourceType,invalidate:true});
  if(!['ok','not found'].includes(result.result))throw new Error('Cloudinary cleanup failed');
  await ref.delete();return json({ok:true});
}
export default endpoint(cleanupUpload);
