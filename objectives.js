export class ObjectiveManager {
  constructor(THREE,scene,world,player,audio,monster,ui){
    this.THREE=THREE;this.scene=scene;this.world=world;this.player=player;this.audio=audio;this.monster=monster;this.ui=ui;
    this.step=0;this.officeKey=false;this.noteRead=false;this.officeUnlocked=false;this.fuses=new Set();this.generatorOnline=false;this.keycard=false;this.exitReady=false;this.complete=false;
    this.targets=[];this.raycaster=new THREE.Raycaster();this.center=new THREE.Vector2(0,0);this.code='';this.wireSequence=[];this.lastTarget=null;
    this._buildTargets();this._setObjective(0);
  }
  _addTarget(name,x,y,z,prompt,handler,range=3.2){
    const mesh=new this.THREE.Mesh(new this.THREE.SphereGeometry(.48,8,8),new this.THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    mesh.position.set(x,y,z);mesh.name='target:'+name;mesh.userData.target=true;this.scene.add(mesh);
    const target={name,mesh,prompt,handler,range};this.targets.push(target);return target;
  }
  _buildTargets(){
    this._addTarget('electrical panel',-34,2.2,25.2,'RESTORE MAIN LIGHTS',()=>this._restoreLights());
    this._addTarget('party note',-31.5,2.35,17.1,'READ THE BIRTHDAY NOTE',()=>this._readNote());
    this._addTarget('party cabinet',-36,1.8,14.2,'UNLOCK THE CABINET',()=>this._openPartyCabinet());
    this._addTarget('office door',-19.7,1.5,1.6,'UNLOCK MANAGER OFFICE',()=>this._openOffice());
    this._addTarget('fuse A',-16.2,1.4,-26,'TAKE FUSE · A',()=>this._collectFuse('A'));
    this._addTarget('fuse B',-36.2,1.4,-8.5,'TAKE FUSE · B',()=>this._collectFuse('B'));
    this._addTarget('fuse C',22,1.4,13,'TAKE FUSE · C',()=>this._collectFuse('C'));
    this._addTarget('generator console',28,2.5,-7.1,'REPAIR GENERATOR',()=>this._openGeneratorPuzzle());
    this._addTarget('manager keycard',-27,2.5,2.3,'TAKE MANAGER KEYCARD',()=>this._takeKeycard());
    this._addTarget('emergency panel',33.5,2.6,28.8,'RESTART EMERGENCY EXIT',()=>this._openExitPuzzle());
    // A read-only note in the office gives context after the keycard is acquired.
    this._addTarget('office memo',-31,2.4,4.8,'READ THE INCIDENT MEMO',()=>this.ui.toast('INCIDENT LOG: “The thing only moves when the mats move.”'),3);
  }
  _setObjective(step){
    this.step=step;
    const o=[
      ['RESTORE THE LIGHTS','Find the electrical panel at reception.'],
      ['FIND THE OFFICE KEY','Search the party rooms. The booking note may help.'],
      ['RESTORE THE GENERATOR',`Find the three missing fuses. (${this.fuses.size}/3)`],
      ['FIND THE MANAGER KEYCARD','The office is open. Check the desk.'],
      ['RESTART THE EMERGENCY EXIT','Get to the emergency panel. Do not stop moving.'],
      ['GET OUT','Run.'],
    ][step];
    this.ui.objective(o[0],o[1]);
  }
  refreshObjective(){if(this.step===2)this.ui.objective('RESTORE THE GENERATOR',`Find the three missing fuses. (${this.fuses.size}/3)`);}
  _restoreLights(){
    if(this.step!==0)return;
    this.world.flickerLights.forEach(f=>{f.light.intensity=f.base*1.45;f.lamp.material.color.setHex(0xe4e2d3);});
    this.audio.power();this.ui.toast('MAIN LIGHTS RESTORED');this.ui.message('THE LIGHTS COME BACK.\nSOMETHING MOVES IN THE ARENA.',2300);
    this.monster.wake();this._setObjective(1);
  }
  _readNote(){
    if(this.step!==1){this.ui.toast('A CHILD’S DRAWING. NOTHING USEFUL.');return;}
    if(!this.noteRead){this.noteRead=true;this.ui.toast('BOOKING NOTE: “PARTY ROOM CODE — 1987.”');this.audio.click();}
    else this.ui.toast('THE CODE IS 1987.');
  }
  _openPartyCabinet(){
    if(this.step!==1){this.ui.toast(this.officeKey?'THE CABINET IS EMPTY.':'A LOCKED PARTY SUPPLY CABINET.');return;}
    if(!this.noteRead){this.ui.toast('IT HAS A FOUR-DIGIT KEYPAD. LOOK AROUND.');return;}
    this.ui.openKeypad('PARTY ROOM CABINET','The old booking note says the code is 1987.','1987',()=>{
      this.officeKey=true;this.audio.door();this.ui.closePuzzle();this.ui.toast('OFFICE KEY ACQUIRED');this._setObjective(2);
    });
  }
  _openOffice(){
    if(!this.officeKey){this.ui.toast('LOCKED. A SMALL KEYHOLE.');return;}
    if(!this.officeUnlocked){this.officeUnlocked=true;this.audio.door();this.ui.toast('MANAGER OFFICE UNLOCKED');}
    if(this.step<2)this._setObjective(2);
  }
  _collectFuse(letter){
    if(this.step!==2||this.fuses.has(letter))return;
    this.fuses.add(letter);const t=this.targets.find(t=>t.name===`fuse ${letter}`);if(t)t.mesh.visible=false;
    this.audio.click();this.ui.toast(`FUSE ${letter} COLLECTED`);this.refreshObjective();
    if(this.fuses.size===3)this.ui.message('THREE FUSES.\nTHE GENERATOR IS IN THE SERVICE BAY.',2100);
  }
  _openGeneratorPuzzle(){
    if(this.step!==2){this.ui.toast(this.generatorOnline?'THE GENERATOR IS RUNNING.':'THE GENERATOR IS DEAD.');return;}
    if(this.fuses.size<3){this.ui.toast(`MISSING FUSES: ${3-this.fuses.size}`);return;}
    this.wireSequence=[];
    this.ui.openWirePuzzle(()=>{
      this.generatorOnline=true;this.audio.power();this.ui.closePuzzle();this.ui.toast('GENERATOR ONLINE');
      this.world.flickerLights.forEach(f=>{f.light.intensity=f.base*1.8;});
      this.ui.message('THE GENERATOR ROARS TO LIFE.\nTHEN YOU HEAR RUNNING.',2500);
      this.monster.wake();this._setObjective(3);
      // Give the creature a reason to search the central arena, but not an unfair teleport.
      this.monster.hear({x:0,z:-12},7,'generator');
    });
  }
  _takeKeycard(){
    if(this.step!==3){this.ui.toast(this.keycard?'THE DESK IS EMPTY.':'THE OFFICE DESK IS LOCKED IN SHADOW.');return;}
    this.keycard=true;this.audio.click();const t=this.targets.find(t=>t.name==='manager keycard');if(t)t.mesh.visible=false;
    this.ui.toast('MANAGER KEYCARD ACQUIRED');this._setObjective(4);
  }
  _openExitPuzzle(){
    if(this.step!==4){this.ui.toast(!this.keycard?'KEYCARD REQUIRED.': 'THE EXIT IS NOT READY.');return;}
    this.ui.openKeypad('EMERGENCY EXIT OVERRIDE','The keypad is worn. The final staff code is 0417.','0417',()=>{
      this.exitReady=true;this.complete=true;this.audio.door();this.ui.closePuzzle(false);this.ui.toast('EMERGENCY EXIT RELEASED');this._setObjective(5);
      this.ui.startFinale();
    });
  }
  _isAllowed(target){
    if(target.name==='office door')return this.step>=2||this.officeKey;
    if(target.name==='manager keycard')return this.step===3;
    if(target.name.startsWith('fuse'))return this.step===2;
    if(target.name==='generator console')return this.step===2;
    if(target.name==='emergency panel')return this.step===4;
    return true;
  }
  getTarget(camera,player){
    if(this.ui.isPuzzleOpen())return null;
    this.raycaster.setFromCamera(this.center,camera);
    const meshes=this.targets.filter(t=>t.mesh.visible!==false).map(t=>t.mesh);
    // Hiding spots are activated by their entrance marker, not by an invisible collider.
    const intersections=this.raycaster.intersectObjects(meshes,false);
    for(const hit of intersections){
      const t=this.targets.find(o=>o.mesh===hit.object);if(!t||!this._isAllowed(t))continue;
      const d=player.position.distanceTo(t.mesh.position);if(d<=t.range)return t;
    }
    // Soft proximity fallback makes small items less frustrating to target.
    let best=null,bestD=Infinity;
    for(const t of this.targets){if(!t.mesh.visible||!this._isAllowed(t))continue;const d=player.position.distanceTo(t.mesh.position);if(d<t.range*.72&&d<bestD){const dir=t.mesh.position.clone().sub(camera.position).normalize();if(camera.getWorldDirection(new this.THREE.Vector3()).dot(dir)>.58){best=t;bestD=d;}}}
    return best;
  }
  interact(target){if(!target)return;target.handler();}
}
