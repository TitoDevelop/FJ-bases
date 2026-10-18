import {randomUUID} from 'node:crypto';
import {endpoint,json} from '../lib/server.mjs';
import {validateUpload} from '../lib/policy.mjs';
export async function signUpload(body,{db,cloudinary,env,uid}){
  const policy=validateUpload(body);
  const ticketId=randomUUID();
  const params={timestamp:Math.floor(Date.now()/1000),upload_preset:'fernando_jover_beats',asset_folder:'fernando-jover',public_id:'fernando-jover/'+body.kind+'/'+ticketId,overwrite:false,allowed_formats:policy.formats};
  await db.collection('mediaUploads').doc(ticketId).set({uid,kind:body.kind,publicId:params.public_id,resourceType:policy.resourceType,createdAt:new Date(),expiresAt:new Date(Date.now()+3600000)});
  const signature=cloudinary.utils.api_sign_request(params,env.CLOUDINARY_API_SECRET);
  return json({cloudName:env.CLOUDINARY_CLOUD_NAME,apiKey:env.CLOUDINARY_API_KEY,resourceType:policy.resourceType,signature,ticketId,params});
}
export default endpoint(signUpload);
