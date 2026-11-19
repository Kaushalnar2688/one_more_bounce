export class GameUI {
  constructor(){
    this.el=id=>document.getElementById(id);
    this.finalCallback=null;this.puzzleCloseCallback=null;this.toastTimer=0;this.messageTimer=0;this.puzzleOpen=false;this.puzzleSubmit=null;this.hideOverlay=this.el('hide-overlay');
  }
  showScreen(id){document.querySelectorAll('.screen').forEach(e=>e.classList.remove('active'));if(id)this.el(id)?.classList.add('active');}
  hideScreens(){document.querySelectorAll('.screen').forEach(e=>e.classList.remove('active'));}
  showHUD(){this.el('hud').classList.remove('hidden');}
  hideHUD(){this.el('hud').classList.add('hidden');}
  objective(title,sub){this.el('objective-text').textContent=title;this.el('objective-subtext').textContent=sub;}
  toast(text){const e=this.el('toast');e.textContent=text;e.classList.add('show');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>e.classList.remove('show'),2600);}
  message(text,duration=1800){const e=this.el('center-message');e.textContent=text;e.style.whiteSpace='pre-line';e.style.opacity='1';clearTimeout(this.messageTimer);this.messageTimer=setTimeout(()=>e.style.opacity='0',duration);}
  prompt(text){this.el('interaction-prompt').innerHTML=text?`<b>[E]</b> ${text}`:'';}
  stamina(value){this.el('stamina-fill').style.width=`${Math.max(0,Math.min(100,value))}%`;}
  flashlight(on){this.el('flashlight-status').textContent=on?'▰ FLASHLIGHT ON':'▱ FLASHLIGHT OFF';}
  noise(level){const e=this.el('noise-status');let txt='QUIET',cl='';if(level>2){txt='LOUD';cl='alert';}else if(level>1){txt='AUDIBLE';cl='';}e.textContent=txt;e.className=`noise-status ${cl}`;}
  clock(text){this.el('clock').textContent=text;}
  hide(on){this.hideOverlay.classList.toggle('show',on);}
  heartbeat(value){this.el('heartbeat').style.opacity=String(Math.max(0,Math.min(.5,value*.5)));}
  isPuzzleOpen(){return this.puzzleOpen;}
  _openPuzzle(eyebrow,title,desc){this.puzzleOpen=true;this.el('puzzle-eyebrow').textContent=eyebrow;this.el('puzzle-title').textContent=title;this.el('puzzle-description').textContent=desc;this.el('puzzle-content').innerHTML='';this.el('puzzle-feedback').textContent='';this.el('puzzle-modal').classList.remove('hidden');this.el('submit-puzzle').disabled=false;}
  openKeypad(title,desc,code,onSuccess){
    this._openPuzzle('SECURITY ACCESS',title,desc);
    const wrap=document.createElement('div');wrap.className='puzzle-row';
    const input=document.createElement('input');input.type='text';input.inputMode='numeric';input.maxLength=4;input.placeholder='4-DIGIT CODE';input.autocomplete='off';input.id='keypad-input';
    wrap.append(input);this.el('puzzle-content').append(wrap);
    const check=()=>{if(input.value.trim()===code){this.el('puzzle-feedback').textContent='ACCESS GRANTED';onSuccess();}else{this.el('puzzle-feedback').textContent='ACCESS DENIED';input.value='';input.focus();}};
    this.puzzleSubmit=check;this.el('submit-puzzle').textContent='ENTER CODE';this.el('submit-puzzle').onclick=check;
    input.addEventListener('keydown',e=>{if(e.key==='Enter')check();});input.focus();
  }
  openWirePuzzle(onSuccess){
    this._openPuzzle('GENERATOR · PHASE ALIGNMENT','POWER ROUTING','The maintenance label is still readable: RED → BLUE → YELLOW. Route the three phases in that order.');
    const chosen=[];const slots=document.createElement('div');slots.className='puzzle-grid';
    const colors=[['RED','#a8463b'],['BLUE','#3c718b'],['YELLOW','#bd9846']];
    const render=()=>{slots.innerHTML='';for(let i=0;i<3;i++){const b=document.createElement('button');b.className='puzzle-choice'+(chosen[i]?' selected':'');b.textContent=chosen[i]||`PHASE ${i+1}`;b.style.borderColor=chosen[i]?colors.find(c=>c[0]===chosen[i])[1]:'';b.onclick=()=>{chosen.splice(i,1);render();};slots.append(b);}};
    render();this.el('puzzle-content').append(slots);
    const picks=document.createElement('div');picks.className='puzzle-grid';
    colors.forEach(([name,color])=>{const b=document.createElement('button');b.className='puzzle-choice';b.textContent=name;b.style.borderColor=color;b.onclick=()=>{if(chosen.length<3){chosen.push(name);render();}};picks.append(b);});
    this.el('puzzle-content').append(picks);
    const check=()=>{if(chosen.join(',')==='RED,BLUE,YELLOW'){this.el('puzzle-feedback').textContent='PHASES STABLE';onSuccess();}else{this.el('puzzle-feedback').textContent='CIRCUIT OVERLOAD — TRY AGAIN';chosen.length=0;render();}};
    this.puzzleSubmit=check;this.el('submit-puzzle').textContent='ROUTE POWER';this.el('submit-puzzle').onclick=check;
  }
  closePuzzle(relock=true){this.puzzleOpen=false;this.el('puzzle-modal').classList.add('hidden');this.el('puzzle-content').innerHTML='';this.el('submit-puzzle').onclick=null;this.prompt('');if(relock)this.puzzleCloseCallback?.();}
  setPuzzleCloseCallback(fn){this.puzzleCloseCallback=fn;}
  startFinale(){this.finalCallback?.();}
  setFinalCallback(fn){this.finalCallback=fn;}
}
