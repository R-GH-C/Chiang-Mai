/* Shared, side-effect-free three-way merge for the Chiang Mai itinerary.
 * Missing patch keys mean "use the spreadsheet source value"; a tombstone is never
 * silently discarded. Both server and browser can consume this module.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.CMItineraryMerge=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const FIELDS=['date','time','type','title','zone','priority','arrangement','rain','packing','notes','mode','order'];
  const has=(obj,key)=>Object.prototype.hasOwnProperty.call(obj||{},key);
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  function project(row){
    if(!row)return null;
    return {id:row.id,custom:!!row.custom,deleted:!!row.deleted,patch:{...(row.patch||{})}};
  }
  function mergeRecord(base,mine,theirs){
    if(!mine||!theirs)return {record:null,conflicts:['missing-record']};
    const a=project(base),m=project(mine),t=project(theirs);
    const conflicts=[];
    if(m.custom!==t.custom && (!a||m.custom!==a.custom&&t.custom!==a.custom))conflicts.push('custom');
    const result={id:m.id,custom:m.custom,deleted:false,patch:{}};
    for(const key of ['deleted',...FIELDS]){
      const b=key==='deleted'?!!a?.deleted:a?.patch?.[key];
      const l=key==='deleted'?m.deleted:m.patch[key];
      const r=key==='deleted'?t.deleted:t.patch[key];
      const lc=!equal(l,b),rc=!equal(r,b);
      if(lc&&rc&&!equal(l,r))conflicts.push(key);
      const chosen=lc?l:r;
      if(key==='deleted') result.deleted=!!chosen;
      else if(chosen!==undefined)result.patch[key]=chosen;
    }
    if(m.deleted!==t.deleted){
      const survivor=m.deleted?t:m;
      if(!a||!equal(survivor.patch,a.patch))conflicts.push('deleted-vs-edit');
    }
    return {record:result,conflicts:[...new Set(conflicts)]};
  }
  function mergeSource(oldSource,newSource,overrides){
    const conflicts=[];
    const next=Object.fromEntries(Object.entries(overrides||{}).map(([id,r])=>[id,{...r,patch:{...(r.patch||{})}}]));
    for(const [id,old] of Object.entries(oldSource||{})){
      const incoming=newSource[id],override=next[id];
      if(!override)continue;
      if(!incoming){if(!override.deleted)conflicts.push({id,kind:'source-removed',fields:[]});continue;}
      for(const field of Object.keys(override.patch||{})){
        if(!equal(old[field],incoming[field])&&!equal(override.patch[field],incoming[field])){
          conflicts.push({id,kind:'source-changed',fields:[field]});
        }else if(equal(override.patch[field],incoming[field])){
          // An upstream revision has caught up with the user's edit.
          delete override.patch[field];
        }
      }
    }
    return {overrides:next,conflicts};
  }
  return {FIELDS,mergeRecord,mergeSource,project,equal,has};
});