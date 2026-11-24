// Only extract identifiers; never navigate to or retain the scanned URL/token.
export function parseSetInput(value) {
  const text=String(value??'').trim();
  if(!text||text.length>2048)return {ok:false,reason:'invalid'};
  if(/^\d{5}$/.test(text))return {ok:true,setNumber:text,source:'number'};
  let url;
  try{url=new URL(text);}catch{return {ok:false,reason:'invalid'};}
  if(!['https:','http:'].includes(url.protocol)||!['lego.com','www.lego.com'].includes(url.hostname.toLowerCase())||url.username||url.password||url.port)return {ok:false,reason:'not-lego'};
  if(/^\/productfeedback(?:-qr)?\/?$/i.test(url.pathname))return {ok:false,reason:'survey'};
  const qr=url.pathname.match(/^\/go\/\d+\/0*(\d{5})\/(\d{7})(?:\/[^/]+)?\/?$/i);
  if(qr)return {ok:true,setNumber:qr[1],manualId:qr[2],source:'qr'};
  const instruction=url.pathname.match(/^\/(?:[a-z]{2}-[a-z]{2}\/)?service\/building-?instructions\/(\d{5})\/?$/i);
  if(instruction)return {ok:true,setNumber:instruction[1],source:'instructions'};
  return {ok:false,reason:'not-instructions'};
}
export const IMPORT_ERRORS={
  invalid:'QR을 확인하지 못했어요. 설명서의 QR이 선명하게 보이도록 다시 찍어주세요.',
  'not-lego':'조립 설명서와 관련 없는 QR이에요. 설명서의 QR을 다시 찍어주세요.',
  survey:'설문용 QR을 찍었어요. 조립 안내를 시작하려면 설명서의 QR을 찍어주세요.',
  'not-instructions':'조립 설명서 QR이 아니에요. 설명서의 QR을 다시 찍어주세요.',
};
