export interface Beat {
 id:string; title:string; genre:string; bpm:number; musical_key:string;
 description:string|null; cover_key:string|null; preview_key:string|null;
 master_key:string|null; published:boolean; featured:boolean;
 created_at:string;
}
export const demoBeats: Beat[] = [
 {id:'demo-1',title:'AFTER HOURS',genre:'Trap',bpm:140,musical_key:'Am',description:'Dark tones / late night energy',cover_key:null,preview_key:null,master_key:null,published:true,featured:true,created_at:''},
 {id:'demo-2',title:'SLOW MOTION',genre:'R&B',bpm:86,musical_key:'Fm',description:'Warm keys / velvet mood',cover_key:null,preview_key:null,master_key:null,published:true,featured:false,created_at:''},
 {id:'demo-3',title:'NO SIGNAL',genre:'Drill',bpm:146,musical_key:'Dm',description:'Cold percussion / heavy bass',cover_key:null,preview_key:null,master_key:null,published:true,featured:false,created_at:''},
 {id:'demo-4',title:'PARA SIEMPRE',genre:'Reggaeton',bpm:98,musical_key:'Gm',description:'Summer after midnight',cover_key:null,preview_key:null,master_key:null,published:true,featured:false,created_at:''},
 {id:'demo-5',title:'BLUE ROOM',genre:'R&B',bpm:76,musical_key:'Cm',description:'Atmospheric / soulful',cover_key:null,preview_key:null,master_key:null,published:true,featured:false,created_at:''},
 {id:'demo-6',title:'LUCES',genre:'Trap',bpm:132,musical_key:'F#m',description:'Space / cinematic',cover_key:null,preview_key:null,master_key:null,published:true,featured:false,created_at:''},
];
