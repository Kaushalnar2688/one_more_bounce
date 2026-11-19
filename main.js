import * as THREE from 'three';
import { buildWorld } from './world.js';
import { Player } from './player.js';
import { Bouncer } from './monster.js';
import { AudioEngine } from './audio.js';
import { ObjectiveManager } from './objectives.js';
import { GameUI } from './ui.js';

const canvas=document.getElementById('game-canvas');
const ui=new GameUI();
const audio=new AudioEngine();
let renderer,scene,camera,world,player,monster,objectives;
let running=false,paused=false,started=false,ending=false,gameOver=false;
let lastTime=performance.now(),elapsed=0,gameClock=0,scareTimer=0,scareFlags=new Set(),shake=0,finaleTimer=0;
let currentTarget=null,hideTarget=null;

function showError(message){const box=document.getElementById('error-box');box.textContent=message;box.classList.remove('hidden');}
function init(){
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.setSize(window.innerWidth,window.innerHeight);
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
    scene=new THREE.Scene();scene.background=new THREE.Color(0x101719);scene.fog=new THREE.FogExp2(0x101719,.018);
    camera=new THREE.PerspectiveCamera(74,window.innerWidth/window.innerHeight,.08,130);
    const hemi=new THREE.HemisphereLight(0x829197,0x252724,.42);scene.add(hemi);
    const moon=new THREE.DirectionalLight(0x9aa9a6,.42);moon.position.set(-20,30,-15);moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);moon.shadow.camera.left=-45;moon.shadow.camera.right=45;moon.shadow.camera.top=45;moon.shadow.camera.bottom=-45;scene.add(moon);
    world=buildWorld(THREE,scene);
    player=new Player(THREE,camera,renderer,world,{
      onNoise:(p,l,k)=>{monster?.hear(p,l,k);},
      onFootstep:(p,l)=>{const surface=(p.z<-3&&Math.abs(p.x)<20)?'rubber':(p.z>10?'tile':'concrete');audio.footstep(l,surface);monster?.hear(p,l,'footstep');},
      onBounce:(p,l)=>{audio.bounce(l);monster?.hear(p,l,'trampoline');shake=.13;},
      onLanding:(p,l)=>{audio.landing(l);monster?.hear(p,l,'landing');},
      onFlashlight:on=>ui.flashlight(on),
      onHide:on=>{ui.hide(on);if(on){audio.setHeartbeat(0);ui.toast('HOLD YOUR BREATH.');}else{ui.toast('BACK OUT IN THE OPEN.');}}
    });
    monster=new Bouncer(THREE,scene,world,player,audio,reason=>killPlayer(reason));
    objectives=new ObjectiveManager(THREE,scene,world,player,audio,monster,ui);
    ui.setFinalCallback(()=>startEndingSequence());
    ui.setPuzzleCloseCallback(()=>{if(started&&!paused&&!ending&&!gameOver&&!player.isHiding)player.lock();});
    window.addEventListener('resize',onResize);
    bindUI();
    animate();
    setTimeout(()=>document.getElementById('loading-screen').classList.add('done'),700);
  }catch(err){console.error(err);showError('The game could not initialize. Check that WebGL is enabled and that the Three.js CDN is reachable. '+err.message);}
}
function onResize(){if(!renderer)return;camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);}
function bindUI(){
  document.getElementById('new-game').addEventListener('click',()=>{
    audio.init();audio.restore();ui.hideScreens();document.getElementById('intro-card').classList.add('show');document.body.classList.add('cinematic');
  });
  document.getElementById('begin-shift').addEventListener('click',()=>{
    document.getElementById('intro-card').classList.remove('show');document.body.classList.remove('cinematic');startGame();player.lock();
  });
  document.getElementById('open-settings-title').addEventListener('click',()=>ui.showScreen('settings-screen'));
  document.getElementById('close-settings').addEventListener('click',()=>ui.showScreen('title-screen'));
  document.getElementById('resume-game').addEventListener('click',()=>{paused=false;ui.showHUD();ui.hideScreens();player.lock();audio.restore();});
  document.getElementById('restart-game').addEventListener('click',()=>location.reload());
  document.getElementById('retry-game').addEventListener('click',()=>location.reload());
  document.getElementById('play-again-ending').addEventListener('click',()=>location.reload());
  document.getElementById('close-puzzle').addEventListener('click',()=>ui.closePuzzle());
  document.getElementById('sensitivity').addEventListener('input',e=>{player.setSensitivity(Number(e.target.value));document.getElementById('sensitivity-value').textContent=Number(e.target.value).toFixed(1);});
  document.getElementById('volume').addEventListener('input',e=>{audio.setVolume(Number(e.target.value));document.getElementById('volume-value').textContent=Math.round(Number(e.target.value)*100)+'%';});
  document.addEventListener('pointerlockchange',()=>{
    if(!started||ending||gameOver||ui.isPuzzleOpen()||player?.isHiding)return;
    if(document.pointerLockElement!==canvas&&!paused){paused=true;ui.hideHUD();ui.showScreen('pause-screen');audio.silence();}
  });
  document.addEventListener('keydown',e=>{
    if(e.code==='Escape'&&ui.isPuzzleOpen()){ui.closePuzzle();return;}
    if(ui.isPuzzleOpen())return;
    if(!started||paused||ending||gameOver)return;
    if(e.code==='KeyE'){
      if(player.isHiding){player.interactHide(null);player.lock();return;}
      if(currentTarget){objectives.interact(currentTarget);if(ui.isPuzzleOpen())player.unlock();return;}
      if(hideTarget){player.interactHide(hideTarget);return;}
    }
    if(e.code==='KeyF'&&!e.repeat)player.toggleFlashlight();
  });
}
function startGame(){
  started=true;running=true;paused=false;gameOver=false;ending=false;gameClock=0;elapsed=0;scareTimer=8;ui.showHUD();ui.hideScreens();ui.toast('SHIFT STARTED · 11:48 PM');ui.message('COMPLETE THE CLOSING CHECKLIST.',1800);
}
function killPlayer(reason){if(gameOver||ending)return;gameOver=true;running=false;player.unlock();ui.hideHUD();document.getElementById('death-message').textContent=reason||'Something heard you.';ui.showScreen('gameover-screen');audio.sting();}
function startEndingSequence(){
  if(ending)return;ending=true;running=false;player.unlock();ui.hideHUD();document.body.classList.add('cinematic');audio.silence();
  ui.message('THE EXIT OPENS.',1600);
  // Brief escape drive-away vignette in the parking lot: camera shifts outside the glass doors.
  const start=performance.now();const initial=camera.position.clone();const end=new THREE.Vector3(34,2.2,38);
  function escapeShot(){const t=Math.min(1,(performance.now()-start)/3400);camera.position.lerpVectors(initial,end,t);camera.lookAt(34,1.5,29);renderer.render(scene,camera);
    if(t<1)requestAnimationFrame(escapeShot);else{document.body.classList.remove('cinematic');ui.showScreen('ending-screen');audio.restore();audio.distantBounce();}}
  requestAnimationFrame(escapeShot);
}

function updateWorld(dt){
  // Fluorescent lights flicker independently; restored lights still have occasional failures.
  for(const f of world.flickerLights){
    const chance=f.base<1.5?.0015:.0007;
    if(Math.random()<chance){f.light.intensity=0;f.lamp.visible=false;setTimeout(()=>{f.light.intensity=f.base*(objectives.generatorOnline?1.55:1.0);f.lamp.visible=true;},70+Math.random()*180);}
  }
  for(const t of world.trampolines){if(t.active){t.phase+=dt*9;t.top.position.y=t.baseY-Math.sin(Math.min(Math.PI,t.phase))*0.22;if(t.phase>Math.PI){t.active=false;t.top.position.y=t.baseY;}}}
  const dustAttr=world.dust.geometry.attributes.position;const dustArray=dustAttr.array;for(let i=0;i<dustArray.length;i+=3){dustArray[i+1]+=(.015+((i/3)%5)*.002)*dt;if(dustArray[i+1]>7.7)dustArray[i+1]=.5+Math.random()*1.2;}dustAttr.needsUpdate=true;
  // Small dust motes, and occasional distant sounds to make empty space feel occupied.
  scareTimer-=dt;
  if(scareTimer<=0&&started&&!paused&&!ending){scareTimer=9+Math.random()*13;const p=player.position;const near=[[-24,11],[24,10],[0,-22],[34,-6]][Math.floor(Math.random()*4)];if(Math.hypot(p.x-near[0],p.z-near[1])>13){Math.random()<.25?audio.announcement():audio.distantBounce();}}
}
function updateScares(){
  if(!started||paused||player.isHiding||ending)return;
  const p=player.position;
  if(!scareFlags.has('party')&&p.x<-23&&p.z>12&&p.z<22){
    scareFlags.add('party');audio.sting();ui.message('HAPPY BIRTHDAY.',1100);shake=.45;
    // The creature appears behind a grimy party-room window, then slips away.
    const old=monster.group.position.clone();monster.group.position.set(-35,0,12);monster.group.visible=true;monster.group.rotation.y=Math.PI/2;
    setTimeout(()=>{if(monster.state==='DORMANT'){monster.group.visible=false;monster.group.position.copy(old);}},1150);
  }
  if(!scareFlags.has('locker')&&p.x<-30&&p.z<-2&&p.z>-10){
    scareFlags.add('locker');audio.creak();shake=.22;ui.message('...DID THAT LOCKER MOVE?',1300);
  }
  if(!scareFlags.has('arena')&&p.z<-3&&Math.abs(p.x)<6){
    scareFlags.add('arena');audio.distantBounce();ui.message('ONE MORE BOUNCE.',1400);
  }
  if(!scareFlags.has('generator')&&objectives.generatorOnline){scareFlags.add('generator');audio.sting();shake=.3;}
}
function updateHUD(dt){
  ui.stamina(player.stamina);ui.noise(player.noise);ui.flashlight(player.flashlightOn);
  const dist=monster.active?monster.getDistance():35;const danger=monster.state==='HUNT'?1:monster.state==='INVESTIGATE'?.55:Math.max(0,(12-dist)/12)*.45;
  audio.setHeartbeat(player.isHiding?Math.max(0,(5-dist)/5):danger);
  ui.heartbeat(danger);
  gameClock+=dt;
  const total=11*60+48+gameClock;const hh=Math.floor(total/3600)%24,mm=Math.floor((total%3600)/60);
  ui.clock(`${hh%12||12}:${String(mm).padStart(2,'0')} ${hh>=12?'PM':'AM'}`);
  if(player.isHiding&&monster.active&&dist<3.8&&Math.random()<.008)audio.creak();
}
function updateInteractions(){
  if(!started||paused||ui.isPuzzleOpen()||ending||gameOver||player.isHiding){currentTarget=null;ui.prompt('');return;}
  currentTarget=objectives.getTarget(camera,player);
  hideTarget=null;let best=3.0;
  for(const h of world.hides){const d=player.position.distanceTo(h.position);if(d<best){const dir=h.camera.clone().sub(camera.position).normalize();if(camera.getWorldDirection(new THREE.Vector3()).dot(dir)>.15){best=d;hideTarget=h;}}}
  if(currentTarget)ui.prompt(currentTarget.prompt);
  else if(hideTarget)ui.prompt(`HIDE ${hideTarget.name.toUpperCase()}`);
  else ui.prompt('');
}
function animate(){
  requestAnimationFrame(animate);
  const now=performance.now();const dt=Math.min(.04,(now-lastTime)/1000||0);lastTime=now;
  if(started&&running&&!paused&&!ending&&!gameOver){
    player.update(dt);monster.update(dt);updateWorld(dt);updateScares();updateHUD(dt);updateInteractions();
    // Apply short camera shake on impacts and scripted scares.
    if(shake>0){shake=Math.max(0,shake-dt);camera.position.x+=Math.sin(now*.04)*shake*.12;camera.position.y+=Math.cos(now*.052)*shake*.08;}
  }
  if(renderer&&scene&&camera)renderer.render(scene,camera);
}

init();
