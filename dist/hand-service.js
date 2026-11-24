export class HandService{
 constructor(onResult,onStatus){this.onResult=onResult;this.onStatus=onStatus;this.ready=false;this.busy=false;this.video=null;this.stopped=true;this.lastFrame=-1;this.lastSent=0;this.frameErrors=0;}
 async prepare(){
  if(this.ready)return;
  if(this.preparing)return this.preparing;
  this.onStatus('loading');
  this.preparing=new Promise((resolve,reject)=>{
   const worker=this.worker=new Worker(new URL('./hand-worker.js',import.meta.url),{type:'module'});
   const timeout=setTimeout(()=>fail(new Error('모델을 준비하는 시간이 초과됐어요. 새로고침 후 다시 준비해주세요.')),45000);
   const fail=error=>{clearTimeout(timeout);worker.terminate();this.worker=null;this.ready=false;this.preparing=null;this.onStatus('error',error.message);reject(error);};
   worker.onerror=error=>fail(new Error(error.message||'손 인식 파일을 불러오지 못했어요.'));
   worker.onmessage=event=>{
    const m=event.data;
    if(m.type==='ready'){clearTimeout(timeout);this.ready=true;this.onStatus('ready');resolve();}
    if(m.type==='error')fail(new Error(m.message));
    if(m.type==='result'){this.busy=false;this.frameErrors=0;if(!this.stopped)this.onResult(m.landmarks,m.time);}
    if(m.type==='frame-error'){this.busy=false;if(++this.frameErrors>3){this.stop();this.onStatus('error','손 인식을 중단했어요. 카메라와 인식 준비를 다시 확인해주세요.');}}
   };
   worker.postMessage({type:'init'});
  });
  return this.preparing;
 }
 async start(video){await this.prepare();if(!video?.srcObject)return;this.video=video;this.lastFrame=-1;this.stopped=false;this.tick();}
 async tick(){
  if(this.stopped)return;
  const video=this.video,now=performance.now();
  if(!document.hidden&&!this.busy&&video?.readyState>=2&&video.currentTime!==this.lastFrame&&now-this.lastSent>=65){
   this.lastFrame=video.currentTime;this.lastSent=now;this.busy=true;
   try{
    const scale=Math.min(1,960/video.videoWidth);const image=await createImageBitmap(video,{resizeWidth:Math.round(video.videoWidth*scale),resizeHeight:Math.round(video.videoHeight*scale)});
    if(this.stopped){image.close();this.busy=false;return;}
    this.worker.postMessage({type:'frame',image,time:performance.now()},[image]);
   }catch(error){this.busy=false;this.stop();this.onStatus('error','이 브라우저에서 영상 프레임을 읽지 못했어요. 다른 브라우저에서 다시 시도해주세요.');}
  }
  this.frameId=requestAnimationFrame(()=>this.tick());
 }
 stop(){this.stopped=true;this.video=null;cancelAnimationFrame(this.frameId);}
 dispose(){this.stop();this.worker?.terminate();this.worker=null;this.ready=false;}
}
