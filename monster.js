import { findPath, collidesAt } from './world.js';

export class Bouncer {
  constructor(THREE,scene,world,player,audio,onKill){
    this.THREE=THREE;this.scene=scene;this.world=world;this.player=player;this.audio=audio;this.onKill=onKill;
    this.group=new THREE.Group();this.group.position.set(1,0,-27);scene.add(this.group);
    const skin=new THREE.MeshStandardMaterial({color:0xaaa99c,roughness:.95});
    const shadowSkin=new THREE.MeshStandardMaterial({color:0x4a4b47,roughness:1});
    const black=new THREE.MeshBasicMaterial({color:0x050606});
    const eye=new THREE.MeshBasicMaterial({color:0x8d2d26});
    const add=(geo,mat,x,y,z,sx=1,sy=1,sz=1)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;this.group.add(m);return m;};
    this.torso=add(new THREE.CapsuleGeometry(.33,1.65,5,8),skin,0,2.5,0,.8,1.3,.7);
    this.neck=add(new THREE.CylinderGeometry(.13,.2,.65,8),shadowSkin,0,3.72,0);
    this.head=add(new THREE.SphereGeometry(.42,12,10),skin,0,4.12,0,.78,1.15,.68);
    this.face=add(new THREE.SphereGeometry(.31,10,8),black,0,4.08,-.27,.8,.9,.55);
    add(new THREE.SphereGeometry(.045,8,8),eye,-.12,4.17,-.51,1,1,1);
    add(new THREE.SphereGeometry(.045,8,8),eye,.12,4.17,-.51,1,1,1);
    this.leftArm=new THREE.Group();this.leftArm.position.set(-.34,3.23,0);this.group.add(this.leftArm);
    this.rightArm=new THREE.Group();this.rightArm.position.set(.34,3.23,0);this.group.add(this.rightArm);
    const armGeo=new THREE.CapsuleGeometry(.13,1.55,4,7);
    const la=new THREE.Mesh(armGeo,skin);la.position.set(-.12,-.95,0);la.rotation.z=-.15;la.scale.set(.85,1.25,.8);this.leftArm.add(la);
    const ra=new THREE.Mesh(armGeo,skin);ra.position.set(.12,-.95,0);ra.rotation.z=.15;ra.scale.set(.85,1.25,.8);this.rightArm.add(ra);
    this.leftLeg=new THREE.Group();this.leftLeg.position.set(-.2,1.55,0);this.group.add(this.leftLeg);
    this.rightLeg=new THREE.Group();this.rightLeg.position.set(.2,1.55,0);this.group.add(this.rightLeg);
    const legGeo=new THREE.CapsuleGeometry(.16,1.2,4,7);
    const ll=new THREE.Mesh(legGeo,skin);ll.position.y=-.78;this.leftLeg.add(ll);
    const rl=new THREE.Mesh(legGeo,skin);rl.position.y=-.78;this.rightLeg.add(rl);
    add(new THREE.ConeGeometry(.19,.5,6),shadowSkin,-.12,.08,-.05,1,1,1).rotation.x=-Math.PI/2;
    this.group.visible=false;
    this.state='DORMANT';this.target=new THREE.Vector3(0,0,-22);this.lastKnown=new THREE.Vector3(0,0,-22);this.home=new THREE.Vector3(1,0,-27);
    this.path=[];this.pathTimer=0;this.stateTimer=0;this.wanderTimer=0;this.anim=0;this.lastNoiseAt=0;this.lastVocal=0;this.investigateTime=0;this.lostSight=0;this.active=false;this.hearingEvents=[];
  }
  wake(){this.active=true;this.group.visible=true;}
  hear(position,loudness,kind='sound'){
    if(!this.active)return;
    const pos=new this.THREE.Vector3(position.x,0,position.z);
    const distance=this.group.position.distanceTo(pos);
    const radius=6+loudness*5;
    if(distance<radius){this.hearingEvents.push({pos,loudness,kind,time:performance.now()});}
  }
  _setState(state,target){
    this.state=state;this.stateTimer=0;this.target=target?target.clone():this.target;
    this.pathTimer=0;
    if(state==='HUNT')this.audio?.monster();
  }
  _canSeePlayer(){
    if(this.player.isHiding)return false;
    const p=this.player.position,dx=p.x-this.group.position.x,dz=p.z-this.group.position.z;
    const dist=Math.hypot(dx,dz);if(dist>22||dist<.1)return false;
    const forward=new this.THREE.Vector3(-Math.sin(this.group.rotation.y),0,-Math.cos(this.group.rotation.y));
    const to=new this.THREE.Vector3(dx,0,dz).normalize();
    const facing=forward.dot(to);
    if(facing<-.35&&dist>4)return false;
    // Sample the line for walls and large obstacles.
    for(let i=1;i<8;i++){const t=i/8;if(collidesAt(this.world,this.group.position.x+dx*t,this.group.position.z+dz*t,.22))return false;}
    return true;
  }
  _refreshPath(target){this.path=findPath(this.world,{x:this.group.position.x,z:this.group.position.z},target);this.pathTimer=1.15;}
  _moveToward(target,speed,dt){
    this.pathTimer-=dt;if(this.pathTimer<=0||!this.path.length)this._refreshPath(target);
    let waypoint=this.path[0];
    while(waypoint&&Math.hypot(waypoint.x-this.group.position.x,waypoint.z-this.group.position.z)<1.15){this.path.shift();waypoint=this.path[0];}
    if(!waypoint)waypoint=target;
    const dx=waypoint.x-this.group.position.x,dz=waypoint.z-this.group.position.z,len=Math.hypot(dx,dz)||1;
    const vx=dx/len*speed*dt,vz=dz/len*speed*dt;
    let nx=this.group.position.x+vx,nz=this.group.position.z+vz;
    if(collidesAt(this.world,nx,this.group.position.z,.35)){nx=this.group.position.x;if(!collidesAt(this.world,this.group.position.x,nz,.35)){}else nz=this.group.position.z;}
    if(collidesAt(this.world,this.group.position.x,nz,.35))nz=this.group.position.z;
    this.group.position.x=nx;this.group.position.z=nz;
    if(Math.abs(dx)+Math.abs(dz)>.04)this.group.rotation.y=Math.atan2(-dx,-dz);
  }
  update(dt){
    if(!this.active)return;
    this.anim+=dt;this.stateTimer+=dt;
    // New sound events only attract it when the source is reasonably close.
    if(this.hearingEvents.length){const e=this.hearingEvents.shift();this.lastKnown.copy(e.pos);this._setState('INVESTIGATE',e.pos);}
    const sees=this._canSeePlayer();
    if(sees){this.lastKnown.set(this.player.position.x,0,this.player.position.z);this.lostSight=0;if(this.state!=='HUNT')this._setState('HUNT',this.lastKnown);}
    else if(this.state==='HUNT')this.lostSight+=dt;
    if(this.state==='DORMANT'){
      this.group.visible=true;this.wanderTimer-=dt;
      if(this.wanderTimer<=0){this.target.set((Math.random()-.5)*22,0,-18+Math.random()*12);this.wanderTimer=5+Math.random()*6;}
      this._moveToward(this.target,.65,dt);
      if(this.stateTimer>24){this.group.visible=Math.random()>.25;this.stateTimer=0;}
    }else if(this.state==='INVESTIGATE'){
      this.group.visible=true;this._moveToward(this.target,2.35,dt);
      if(this.group.position.distanceTo(this.target)<2.2||this.stateTimer>8){this._setState('SEARCH',this.target);this.stateTimer=0;}
    }else if(this.state==='HUNT'){
      this.group.visible=true;
      const dist=this.group.position.distanceTo(this.player.position);
      if(this.player.isHiding){this._setState('SEARCH',this.lastKnown);this.stateTimer=0;}
      else {
        this._moveToward(this.player.position,dist<5?5.7:5.1,dt);
        if(dist<1.45){this.onKill?.('The Bouncer caught you.');}
        if(this.lostSight>2.8){this._setState('SEARCH',this.lastKnown);this.stateTimer=0;}
      }
    }else if(this.state==='SEARCH'){
      this.group.visible=true;
      const drift=new this.THREE.Vector3(this.target.x+Math.sin(this.stateTimer*2)*2,0,this.target.z+Math.cos(this.stateTimer*1.4)*2);
      this._moveToward(drift,1.75,dt);
      if(this.stateTimer>8){this._setState('RETURN',this.home);}
      // Check hides. It can inspect a hiding spot but does not magically know which one contains the player.
      if(this.player.isHiding&&this.group.position.distanceTo(this.player.position)<2.2&&this.stateTimer>1.1&&!this.inspectedHide){this.inspectedHide=true;this.audio?.creak();}
      if(!this.player.isHiding)this.inspectedHide=false;
    }else if(this.state==='RETURN'){
      this._moveToward(this.home,1.25,dt);
      if(this.group.position.distanceTo(this.home)<2){this._setState('DORMANT');this.wanderTimer=3;}
    }
    const walking=this.state==='HUNT'?1.65:(this.state==='DORMANT'?.42:1.0);
    this.leftArm.rotation.x=Math.sin(this.anim*5)*.48*walking;this.rightArm.rotation.x=-Math.sin(this.anim*5)*.48*walking;
    this.leftLeg.rotation.x=-Math.sin(this.anim*5)*.38*walking;this.rightLeg.rotation.x=Math.sin(this.anim*5)*.38*walking;
    this.torso.rotation.z=Math.sin(this.anim*2.1)*.035;
    this.head.rotation.z=Math.sin(this.anim*3.4)*.045;
    if(this.state!=='DORMANT'&&performance.now()-this.lastVocal>6500+Math.random()*6000){this.lastVocal=performance.now();this.audio?.monster();}
  }
  getDistance(){return this.group.position.distanceTo(this.player.position);}
}
