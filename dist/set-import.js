import {parseSetInput,IMPORT_ERRORS} from './set-import-core.js';
const $=s=>document.querySelector(s),video=$('#qr-video');
const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
let stream=null,timer=null,generation=0,loading=false,lastInvalid='',lastInvalidAt=0,scanFrame=0;
function status(message,error=false){$('#scan-status').textContent=message;$('#scan-status').classList.toggle('error',error);}
function stop(){++generation;clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;video.hidden=true;$('#qr-placeholder').hidden=false;$('#scan-start').hidden=false;$('#scan-start').disabled=false;$('#scan-stop').hidden=true;loading=false;}
function accept(text){
  const result=parseSetInput(text);
  if(!result.ok){$('#set-result').hidden=true;status(IMPORT_ERRORS[result.reason],true);return false;}
  if(result.setNumber!=='60482'){$('#set-result').hidden=true;status(`세트 ${result.setNumber}를 읽었어요. 이번 시제품은 60482 소방차의 조립 정보를 지원해요.`,true);return false;}
  stop();$('#set-result').hidden=false;$('#set-input').value='60482';status('60482 소방차 설명서를 찾았어요. ‘이 설명서로 조립 시작’을 눌러주세요.');$('#start-set').focus({preventScroll:true});return true;
}
function decode(source,width,height,max=1280){
  const scale=Math.min(1,max/Math.max(width,height));canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);ctx.drawImage(source,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
  return window.jsQR(pixels.data,pixels.width,pixels.height,{inversionAttempts:'attemptBoth'})?.data||null;
}
async function scan(){
  stop();const token=++generation;loading=true;$('#scan-start').disabled=true;$('#scan-stop').hidden=false;status('카메라 연결을 기다리고 있어요.');
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('HTTPS 주소나 로컬 서버에서 카메라를 사용할 수 있어요. QR 사진 선택으로도 진행할 수 있어요.');
    const acquired=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:960}},audio:false});
    if(token!==generation){acquired.getTracks().forEach(t=>t.stop());return;}
    stream=acquired;video.srcObject=stream;await video.play();if(token!==generation)return;
    video.hidden=false;$('#qr-placeholder').hidden=true;$('#scan-start').hidden=true;loading=false;
    acquired.getVideoTracks()[0].addEventListener('ended',()=>{if(stream===acquired){stop();status('카메라 연결이 끝났어요. 다시 켜거나 사진을 선택해주세요.',true);}});
    status('설명서의 QR 전체가 화면 안에 들어오게 보여주세요. 반사를 피하면 잘 읽혀요.');
    const tick=()=>{
      if(token!==generation||!stream)return;
      if(video.readyState>=2){
        try{const text=decode(video,video.videoWidth,video.videoHeight,[900,1200,720][scanFrame++%3]);if(text){if(text!==lastInvalid||performance.now()-lastInvalidAt>4000){if(accept(text))return;lastInvalid=text;lastInvalidAt=performance.now();}}}catch{stop();status('QR을 읽는 중 문제가 생겼어요. 사진 선택이나 번호 입력으로 계속해주세요.',true);return;}
      }
      timer=setTimeout(tick,300);
    };tick();
  }catch(error){if(token!==generation)return;stop();status(error.name==='NotAllowedError'?'카메라 권한이 필요해요. 권한을 허용하거나 QR 사진을 선택해주세요.':error.message||'카메라를 연결하지 못했어요.',true);}
}
async function readFile(file){
  stop();const token=++generation;$('#set-result').hidden=true;if(!file)return;
  if(file.size>25*1024*1024){status('사진은 25MB 이하로 선택해주세요.',true);return;}
  status('사진에서 QR을 찾고 있어요.');let bitmap;
  try{bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});if(token!==generation)return;let text=null;for(const size of [900,1280,1800,1000,800,600]){text=decode(bitmap,bitmap.width,bitmap.height,size);if(text)break;}if(!text){status('사진에서 QR을 찾지 못했어요. 설명서의 QR이 크게 보이도록 다시 찍어주세요.',true);return;}accept(text);}
  catch{if(token===generation)status('이 사진을 열지 못했어요. JPG·PNG 사진으로 다시 선택해주세요.',true);}
  finally{bitmap?.close();$('#qr-file').value='';}
}
$('#scan-start').onclick=scan;$('#scan-stop').onclick=()=>{stop();status('촬영을 멈췄어요. 사진이나 번호로도 계속할 수 있어요.');};
$('#image-button').onclick=()=>$('#qr-file').click();$('#qr-file').onchange=e=>readFile(e.target.files[0]);
$('#set-form').onsubmit=e=>{e.preventDefault();stop();accept($('#set-input').value);};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(stream||loading)){stop();status('카메라를 멈췄어요. 돌아오면 다시 켜주세요.');}});window.addEventListener('pagehide',stop);
