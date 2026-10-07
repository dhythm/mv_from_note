import {bundle} from '@remotion/bundler';
import {getCompositions,renderMedia,renderStill} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';
const mode=process.argv[2]||'prototypes';
const serveUrl=await bundle({entryPoint:path.resolve('src/Root.tsx'),outDir:path.resolve('.remotion/bundle')});
const composition=(await getCompositions(serveUrl)).find(c=>c.id==='Schedule');
const common={composition,serveUrl,concurrency:3};
fs.mkdirSync('out/review',{recursive:true});
if(mode==='prototypes'){
 for(const [name,frameRange] of [['opening',[0,659]],['split',[2760,3899]],['ending',[5010,5939]]]){
  console.log(`Rendering prototype ${name}`);
  await renderMedia({...common,codec:'h264',crf:20,outputLocation:`out/review/${name}.mp4`,frameRange});
  console.log(`Complete ${name}`);
 }
}else if(mode==='stills'){
 for(const [name,frame] of [['opening',420],['shift',840],['impact',1500],['shorten',2340],['split',3240],['record',4080],['options',4800],['ending',5730]]){
  await renderStill({...common,frame,output:`out/review/${name}.png`});
  console.log(`Still ${name}`);
 }
}else{
 let last=-1;
 await renderMedia({...common,codec:'h264',crf:18,outputLocation:'out/schedule-198s.mp4',onProgress:({progress})=>{const p=Math.floor(progress*10);if(p!==last){last=p;console.log(`Full render ${p*10}%`);}}});
 console.log('Complete full video');
}
