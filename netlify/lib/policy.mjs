export const POLICY={covers:{types:['image/jpeg','image/png','image/webp'],extension:/\.(jpe?g|png|webp)$/i,limit:8*1024*1024,resourceType:'image',formats:'jpg,png,webp'},previews:{types:['audio/mpeg'],extension:/\.mp3$/i,limit:35*1024*1024,resourceType:'video',formats:'mp3'}};
export function validateUpload(body) {
  if(!body||Object.keys(body).some(key=>!['kind','name','type','size'].includes(key)))throw Object.assign(new Error('Parámetros no permitidos'),{status:400});
  const policy=POLICY[body.kind];
  if(!Object.hasOwn(POLICY,body.kind)||!policy||typeof body.name!=='string'||!policy.extension.test(body.name)||!policy.types.includes(body.type))throw Object.assign(new Error('Formato no admitido'),{status:415});
  if(!Number.isSafeInteger(body.size)||body.size<1||body.size>policy.limit)throw Object.assign(new Error('Tamaño no admitido'),{status:413});
  return policy;
}
export function requireAdminUid(uid,expected) {
  if(!expected)throw Object.assign(new Error('Configuración del servidor incompleta'),{status:503});
  if(uid!==expected)throw Object.assign(new Error('Acceso reservado al administrador'),{status:403});
}
