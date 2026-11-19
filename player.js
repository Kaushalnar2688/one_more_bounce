import { collidesAt } from './world.js';

export class Player {
  constructor(THREE, camera, renderer, world, callbacks) {
    this.THREE=THREE;this.camera=camera;this.renderer=renderer;this.world=world;this.callbacks=callbacks;
    this.position=new THREE.Vector3(0,1.67,27.2);this.velocity=new THREE.Vector3();
    this.yaw=0;this.pitch=0;this.grounded=true;this.isHiding=false;this.hideTarget=null;
    this.keys={};this.stamina=100;this.sprinting=false;this.crouching=false;this.flashlightOn=true;
    this.sensitivity=1;this.walkBob=0;this.stepTimer=0;this.lastStep=0;this.noise=0;this.jumpCooldown=0;
    this.camera.position.copy(this.position);this.camera.rotation.order='YXZ';
    this.flashlight=new THREE.SpotLight(0xe1eadf,52,26,Math.PI/7,.58,1.3);
    this.flashlight.position.copy(this.camera.position);this.flashlight.castShadow=true;this.flashlight.shadow.mapSize.set(512,512);this.flashlight.shadow.bias=-.0003;
    this.flashTarget=new THREE.Object3D();this.flashTarget.position.set(0,0,-1);this.camera.add(this.flashTarget);this.flashlight.target=this.flashTarget;this.camera.add(this.flashlight);
    this.flashAmbient=new THREE.PointLight(0xa1b5aa,.12,2);this.flashAmbient.position.set(0,0,0);this.camera.add(this.flashAmbient);
    this._onMouse=e=>{if(document.pointerLockElement!==this.renderer.domElement||this.isHiding)return;this.yaw-=e.movementX*.0021*this.sensitivity;this.pitch-=e.movementY*.0021*this.sensitivity;this.pitch=Math.max(-1.45,Math.min(1.45,this.pitch));};
    this._onKeyDown=e=>{this.keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();};
    this._onKeyUp=e=>{this.keys[e.code]=false;};
    document.addEventListener('mousemove',this._onMouse);document.addEventListener('keydown',this._onKeyDown);document.addEventListener('keyup',this._onKeyUp);
    this._bindLook();
  }
  _bindLook(){this.camera.rotation.set(this.pitch,this.yaw,0);}
  lock(){if(this.renderer.domElement.requestPointerLock)this.renderer.domElement.requestPointerLock();}
  unlock(){if(document.pointerLockElement)document.exitPointerLock();}
  setSensitivity(v){this.sensitivity=v;}
  setFlashlight(on){this.flashlightOn=on;this.flashlight.visible=on;this.flashAmbient.intensity=on?.12:0;this.callbacks.onFlashlight?.(on);}
  toggleFlashlight(){this.setFlashlight(!this.flashlightOn);}
  interactHide(hide){
    this.isHiding=hide;
    if(hide){this.hideTarget=hide;this.position.set(hide.camera.x,hide.camera.y,hide.camera.z);this.velocity.set(0,0,0);this.sprinting=false;this.callbacks.onHide?.(true);this.unlock();}
    else {const exit=this.hideTarget;this.isHiding=false;this.hideTarget=null;if(exit)this.position.set(exit.position.x,1.67,exit.position.z);else this.position.y=1.67;this.callbacks.onHide?.(false);}
    this.camera.position.copy(this.position);this._bindLook();
  }
  update(dt){
    if(this.isHiding){this.camera.position.copy(this.position);return;}
    this.jumpCooldown=Math.max(0,this.jumpCooldown-dt);
    const forward=new this.THREE.Vector3(-Math.sin(this.yaw),0,-Math.cos(this.yaw));
    const right=new this.THREE.Vector3(Math.cos(this.yaw),0,-Math.sin(this.yaw));
    const move=new this.THREE.Vector3();
    if(this.keys.KeyW||this.keys.ArrowUp)move.add(forward);
    if(this.keys.KeyS||this.keys.ArrowDown)move.sub(forward);
    if(this.keys.KeyD||this.keys.ArrowRight)move.add(right);
    if(this.keys.KeyA||this.keys.ArrowLeft)move.sub(right);
    const moving=move.lengthSq()>.001;
    if(moving)move.normalize();
    this.crouching=!!(this.keys.ControlLeft||this.keys.ControlRight);
    this.sprinting=!!(this.keys.ShiftLeft||this.keys.ShiftRight)&&moving&&!this.crouching&&this.stamina>1;
    let speed=this.crouching?2.05:(this.sprinting?6.0:3.65);
    if(this.sprinting)this.stamina=Math.max(0,this.stamina-26*dt);else this.stamina=Math.min(100,this.stamina+16*dt);
    const targetX=move.x*speed,targetZ=move.z*speed;
    const smoothing=this.grounded?13:4;
    this.velocity.x+=(targetX-this.velocity.x)*Math.min(1,smoothing*dt);
    this.velocity.z+=(targetZ-this.velocity.z)*Math.min(1,smoothing*dt);
    if(!moving){this.velocity.x*=Math.pow(.0008,dt);this.velocity.z*=Math.pow(.0008,dt);}
    if(this.keys.Space&&this.grounded&&this.jumpCooldown<=0){this.velocity.y=5.15;this.grounded=false;this.jumpCooldown=.28;this.callbacks.onNoise?.(this.position,3.6,'jump');}
    const nextX=this.position.x+this.velocity.x*dt;
    if(!collidesAt(this.world,nextX,this.position.z,.38))this.position.x=nextX;else this.velocity.x=0;
    const nextZ=this.position.z+this.velocity.z*dt;
    if(!collidesAt(this.world,this.position.x,nextZ,.38))this.position.z=nextZ;else this.velocity.z=0;
    this.velocity.y-=15.8*dt;this.position.y+=this.velocity.y*dt;
    const groundY=this._trampolineGround(this.position.x,this.position.z);
    if(this.position.y<=groundY+1.67&&this.velocity.y<=0){
      if(!this.grounded&&this.velocity.y<-2)this.callbacks.onLanding?.(this.position,Math.min(5,Math.abs(this.velocity.y)*.55));
      this.position.y=groundY+1.67;this.velocity.y=0;this.grounded=true;
    }else this.grounded=false;
    // Spring bounce from trampoline surfaces.
    if(this.grounded&&moving){
      const tramp=this.world.trampolines.find(t=>Math.abs(this.position.x-t.x)<t.width*.48&&Math.abs(this.position.z-t.z)<t.depth*.48);
      if(tramp&&this.jumpCooldown<=0){this.velocity.y=8.7;this.grounded=false;this.jumpCooldown=.4;tramp.active=true;tramp.phase=0;this.callbacks.onBounce?.(this.position,6.2);}
    }
    this.position.x=Math.max(-38.3,Math.min(38.3,this.position.x));this.position.z=Math.max(-30.3,Math.min(30.3,this.position.z));
    this.walkBob=moving&&this.grounded?this.walkBob+dt*(this.sprinting?14:9):this.walkBob*.85;
    this.camera.position.set(this.position.x,this.position.y+(this.grounded?Math.sin(this.walkBob)*.025:0),this.position.z);
    this.camera.rotation.set(this.pitch,this.yaw,0);
    this.stepTimer+=dt;
    if(moving&&this.grounded&&this.stepTimer>(this.sprinting?.28:this.crouching?.72:.48)){
      this.stepTimer=0;const amount=this.sprinting?2.8:(this.crouching?.45:1.15);this.callbacks.onFootstep?.(this.position,amount);
    }
    this.noise=this.sprinting&&moving?2.6:(this.crouching?.25:(moving?1.0:0));
  }
  _trampolineGround(x,z){
    const t=this.world.trampolines.find(t=>Math.abs(x-t.x)<t.width*.48&&Math.abs(z-t.z)<t.depth*.48);
    return t?1.0:0;
  }
  getForward(){return new this.THREE.Vector3(-Math.sin(this.yaw),0,-Math.cos(this.yaw));}
  getEyePosition(){return this.camera.position.clone();}
  dispose(){document.removeEventListener('mousemove',this._onMouse);document.removeEventListener('keydown',this._onKeyDown);document.removeEventListener('keyup',this._onKeyUp);}
}
