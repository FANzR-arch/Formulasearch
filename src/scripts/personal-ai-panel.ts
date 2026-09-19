/** BorderGlow pointer geometry adapted from React Bits; drag uses native pointer capture. */
export function mountPanelInteraction(card:HTMLDialogElement){
 const header=card.querySelector<HTMLElement>('.pai-header')!;
 const controller=new AbortController(),options={signal:controller.signal};
 const key='pai-panel-position';let dragging:{id:number;dx:number;dy:number}|undefined;
 header.tabIndex=0;header.setAttribute('aria-label','拖动聊天窗口 / Move chat window');header.title='拖动调整位置；方向键移动，双击复位 / Drag or use arrow keys; double-click to reset';
 const clamp=(v:number,max:number)=>Math.max(8,Math.min(v,Math.max(8,max)));
 const place=(x:number,y:number)=>{const r=card.getBoundingClientRect();card.style.left=clamp(x,innerWidth-r.width-8)+'px';card.style.top=clamp(y,innerHeight-r.height-8)+'px';card.style.right='auto';card.style.bottom='auto';};
 const save=()=>{const r=card.getBoundingClientRect();try{sessionStorage.setItem(key,JSON.stringify({x:r.left/Math.max(1,innerWidth-r.width),y:r.top/Math.max(1,innerHeight-r.height)}));}catch{}};
 const restore=()=>{try{const p=JSON.parse(sessionStorage.getItem(key)||'null');if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)){const r=card.getBoundingClientRect();place(p.x*(innerWidth-r.width),p.y*(innerHeight-r.height));}}catch{}};
 const pointer=(x:number,y:number)=>{if(!card.open||card.dataset.morphing)return;const r=card.getBoundingClientRect(),dx=x-r.left-r.width/2,dy=y-r.top-r.height/2;const edge=Math.min(1,Math.max(Math.abs(dx)/(r.width/2),Math.abs(dy)/(r.height/2)));const angle=Math.atan2(dy,dx)*180/Math.PI+90;card.style.setProperty('--edge-proximity',(edge*100).toFixed(3));card.style.setProperty('--cursor-angle',angle+'deg');card.style.setProperty('--glow-hue',String((angle+360)%360));const glass=card.querySelector<HTMLElement>('.pai-glass');glass?.style.setProperty('--glass-light-x',((x-r.left)/r.width*100)+'%');glass?.style.setProperty('--glass-light-y',((y-r.top)/r.height*100)+'%');};
 card.addEventListener('pointermove',e=>pointer(e.clientX,e.clientY),options);
 header.addEventListener('pointerdown',e=>{if(card.dataset.morphing||e.button!==0||(e.target as Element).closest('button,a,input'))return;const r=card.getBoundingClientRect();dragging={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};header.setPointerCapture(e.pointerId);card.dataset.dragging='';header.focus({preventScroll:true});e.preventDefault();},options);
 header.addEventListener('pointermove',e=>{if(dragging?.id!==e.pointerId)return;place(e.clientX-dragging.dx,e.clientY-dragging.dy);},options);
 const end=()=>{if(!dragging)return;const id=dragging.id;dragging=undefined;delete card.dataset.dragging;if(header.hasPointerCapture(id))header.releasePointerCapture(id);save();};
 header.addEventListener('pointerup',end,options);header.addEventListener('pointercancel',end,options);header.addEventListener('lostpointercapture',end,options);card.addEventListener('close',end,options);
 header.addEventListener('dblclick',e=>{if((e.target as Element).closest('button'))return;for(const k of ['left','top','right','bottom'])card.style.removeProperty(k);try{sessionStorage.removeItem(key);}catch{}},options);
 header.addEventListener('keydown',e=>{if(e.target!==header||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const r=card.getBoundingClientRect(),step=e.shiftKey?50:10;place(r.left+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),r.top+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0));save();},options);
 window.addEventListener('resize',()=>{if(card.open){restore();const r=card.getBoundingClientRect();place(r.left,r.top);}},options);
 let motion:Animation|undefined, shell:HTMLElement|undefined;
 const cancelMotion=()=>{motion?.cancel();motion=undefined;shell?.remove();shell=undefined;delete card.dataset.morphing;};
 const transition=async(trigger:HTMLElement,closing=false)=>{
  cancelMotion();
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){
   const a=card.animate([{opacity:closing?1:0},{opacity:closing?0:1}],{duration:100,fill:'both'});motion=a;await a.finished.catch(()=>{});if(motion===a){a.cancel();motion=undefined;}return;
  }
  const r=card.getBoundingClientRect(),t=trigger.getBoundingClientRect(),style=getComputedStyle(card);
  const drop=document.createElement('div');drop.className='pai-flight-drop';drop.setAttribute('aria-hidden','true');
  Object.assign(drop.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',background:getComputedStyle(document.documentElement).getPropertyValue('--paper'),border:style.border,boxShadow:style.boxShadow,borderRadius:style.borderRadius});
  document.body.append(drop);shell=drop;card.dataset.morphing='true';
  const dx=t.left+t.width/2-r.left-r.width/2,dy=t.top+t.height/2-r.top-r.height/2;
  // One continuously sampled curve: no segment ends that brake to zero mid-flight.
  const lift=Math.max(0,Math.min(38,t.top+t.height/2-28));
  const side=Math.sign(-dx||1)*Math.min(64,innerWidth*.09);
  const bezier=(a:number,b:number,c:number,d:number,u:number)=>a*(1-u)**3+3*b*(1-u)**2*u+3*c*(1-u)*u*u+d*u**3;
  const pose=(x:number,y:number,sx:number,sy:number,angle=0)=>'translate('+x+'px,'+y+'px) rotate('+angle+'deg) scale('+sx+','+sy+')';
  const radius=parseFloat(style.borderRadius)||24;
  const opening:Keyframe[]=Array.from({length:73},(_,i)=>{
   const u=i/72,travel=1-(1-u)**3,grow=1-(1-u)**3;
   const x=bezier(dx,dx+side,side*.22,0,travel);
   const y=bezier(dy,dy-lift,-r.height*.18,0,travel);
   const stretch=.025*Math.sin(Math.PI*u)*(1-u);
   const settle=0;
   const sx=(32/r.width+(1-32/r.width)*grow)*(1-stretch+settle);
   const sy=(32/r.height+(1-32/r.height)*grow)*(1+stretch-settle);
   return {transform:pose(x,y,sx,sy,-3*Math.sign(side)*Math.sin(Math.PI*u)*(1-u)),borderRadius:(r.height*.5*(1-grow)+radius*grow)+'px',opacity:Math.min(1,u*8),offset:u};
  });
  const returning=opening.slice().reverse().map((frame,i)=>({...frame,offset:i/72,opacity:i===72?0:1}));
  const a=drop.animate(closing?returning:opening,{duration:closing?300:520,easing:'linear',fill:'both'});motion=a;
  await a.finished.catch(()=>{});if(motion!==a)return;
  if(!closing){
   delete card.dataset.morphing;
   const fade=drop.animate([{opacity:1},{opacity:0}],{duration:160,easing:'ease-out',fill:'both'});motion=fade;
   await fade.finished.catch(()=>{});if(motion!==fade)return;
  }
  // Keep the closing card hidden until its owner closes the native dialog.
  motion=undefined;shell=undefined;drop.remove();if(!closing)delete card.dataset.morphing;
 };
 card.addEventListener('close',cancelMotion,options);
 window.addEventListener('pagehide',()=>{end();cancelMotion();controller.abort();},{once:true});
 return {restore,pointer,transition};
}
