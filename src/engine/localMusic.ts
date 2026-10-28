/** Local-only background music persistence.
 * Audio selected by the visitor is stored in their own browser, not uploaded
 * to GitHub, RAVIN, Supabase, or ARRAY's servers.
 */
export const MUSIC_DB_NAME='ravin-array-local-media';
const STORE_NAME='music';
const CURRENT_KEY='background';
export const DEFAULT_MUSIC_VOLUME=.18;
export const MUSIC_VOLUME_PREF='ravin-array-music-volume-v1';

export function clampMusicVolume(volume:number):number {
  if(!Number.isFinite(volume)) return DEFAULT_MUSIC_VOLUME;
  return Math.min(1,Math.max(0,volume));
}

export function isAudioFile(file:Pick<File,'type'|'name'|'size'>):boolean {
  return file.size>0 && file.size<=80*1024*1024
    && (file.type.startsWith('audio/') || /\.(mp3|m4a|ogg|wav|aac)$/i.test(file.name));
}

type LocalTrack={blob:Blob;name:string};

function openMusicDb():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    if(typeof indexedDB==='undefined') return reject(new Error('Local storage is unavailable.'));
    const request=indexedDB.open(MUSIC_DB_NAME,1);
    request.onupgradeneeded=()=>{
      if(!request.result.objectStoreNames.contains(STORE_NAME))
        request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error ?? new Error('Music storage failed.'));
  });
}
async function transaction<T>(mode:IDBTransactionMode,action:(store:IDBObjectStore,resolve:(value:T)=>void,reject:(error:Error)=>void)=>void):Promise<T>{
  const db=await openMusicDb();
  return new Promise<T>((resolve,reject)=>{
    let settled=false;
    const done=(value:T)=>{if(!settled){settled=true;resolve(value);}};
    const fail=(error:Error)=>{if(!settled){settled=true;reject(error);}};
    try{
      const tx=db.transaction(STORE_NAME,mode);
      tx.oncomplete=()=>db.close();
      tx.onerror=()=>{fail(tx.error??new Error('Local music storage failed.'));db.close();};
      tx.onabort=()=>{fail(tx.error??new Error('Local music storage aborted.'));db.close();};
      action(tx.objectStore(STORE_NAME),done,fail);
    }catch(error){
      db.close();
      fail(error instanceof Error?error:new Error('Local storage operation failed.'));
    }
  });
}

export async function loadSavedTrack():Promise<LocalTrack|null>{
  return transaction<LocalTrack|null>('readonly',(store,resolve,reject)=>{
    const request=store.get(CURRENT_KEY);
    request.onsuccess=()=>{
      const data=request.result as LocalTrack|undefined;
      resolve(data?.blob instanceof Blob && typeof data.name==='string'?data:null);
    };
    request.onerror=()=>reject(request.error??new Error('Unable to read locally saved track.'));
  });
}

export async function saveLocalTrack(blob:Blob,name:string):Promise<void>{
  return transaction<void>('readwrite',(store,resolve,reject)=>{
    const request=store.put({blob,name} satisfies LocalTrack,CURRENT_KEY);
    request.onsuccess=()=>resolve();
    request.onerror=()=>reject(request.error??new Error('Unable to save selected music.'));
  });
}

export async function clearLocalTrack():Promise<void>{
  return transaction<void>('readwrite',(store,resolve,reject)=>{
    const request=store.delete(CURRENT_KEY);
    request.onsuccess=()=>resolve();
    request.onerror=()=>reject(request.error??new Error('Unable to clear selected music.'));
  });
}
