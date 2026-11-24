import {FilesetResolver,HandLandmarker} from './vendor/vision_bundle.mjs';
let detector;
self.onmessage=async event=>{
 const m=event.data;
 if(m.type==='init'){
  try{
   const base=new URL('./vendor/',self.location.href);
   const vision=await FilesetResolver.forVisionTasks(new URL('wasm',base).href);
   // Module workers must use the SDK's ES-module loader and matching binary.
   vision.wasmLoaderPath=new URL('wasm/vision_wasm_module_internal.js',base).href;
   vision.wasmBinaryPath=new URL('wasm/vision_wasm_module_internal.wasm',base).href;
   detector=await HandLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:new URL('models/hand_landmarker.task',base).href,delegate:'CPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.5,minHandPresenceConfidence:.5,minTrackingConfidence:.5});
   const blank=new OffscreenCanvas(96,96);const ctx=blank.getContext('2d');ctx.fillStyle='#f5f5f5';ctx.fillRect(0,0,96,96);
   const probe=blank.transferToImageBitmap();
   try{detector.detectForVideo(probe,0);}finally{probe.close();}
   self.postMessage({type:'ready'});
  }catch(error){self.postMessage({type:'error',message:String(error.message||error)});}
 }
 if(m.type==='frame'){
  try{const result=detector.detectForVideo(m.image,m.time);self.postMessage({type:'result',landmarks:result.landmarks,time:m.time});}
  catch(error){self.postMessage({type:'frame-error',message:String(error.message||error)});}
  finally{m.image?.close();}
 }
};
