export function buildWorld(THREE, scene) {
  const colliders = [];
  const trampolines = [];
  const hides = [];
  const lights = [];
  const interactables = [];
  const materials = {};

  const mat = (name, color, roughness=0.85, metalness=0) => {
    const m = new THREE.MeshStandardMaterial({color, roughness, metalness});
    materials[name] = m;
    return m;
  };
  const concrete = mat('concrete', 0x343a38);
  const wallMat = mat('wall', 0x72746d);
  const darkWall = mat('darkWall', 0x202624);
  const vinyl = mat('vinyl', 0x454946);
  const blue = mat('blue', 0x245b79);
  const red = mat('red', 0x9c3f37);
  const yellow = mat('yellow', 0xb38a43);
  const rubber = mat('rubber', 0x171d1e, .95);
  const metal = mat('metal', 0x626965, .45, .65);
  const wood = mat('wood', 0x48372b);
  const dirtyGlass = new THREE.MeshStandardMaterial({color:0x35494a, roughness:.2, metalness:.15, transparent:true, opacity:.36});
  const glowGreen = new THREE.MeshBasicMaterial({color:0x7fc58a});
  const glowRed = new THREE.MeshBasicMaterial({color:0xc84b3d});
  const white = mat('white', 0xb9b8ad);

  const boxGeo = new THREE.BoxGeometry(1,1,1);
  const cylinderGeo = new THREE.CylinderGeometry(1,1,1,16);
  const addBox = (name, x,y,z, sx,sy,sz, material, solid=false, options={}) => {
    const mesh = new THREE.Mesh(boxGeo, material);
    mesh.name = name;
    mesh.position.set(x,y,z);
    mesh.scale.set(sx,sy,sz);
    mesh.castShadow = options.castShadow !== false;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (solid) colliders.push({minX:x-sx/2,maxX:x+sx/2,minZ:z-sz/2,maxZ:z+sz/2,minY:y-sy/2,maxY:y+sy/2,name});
    return mesh;
  };
  const addCylinder = (name,x,y,z,r,h,material,solid=false) => {
    const mesh = new THREE.Mesh(cylinderGeo, material);
    mesh.name=name; mesh.position.set(x,y,z); mesh.scale.set(r,h,r); mesh.castShadow=true; mesh.receiveShadow=true; scene.add(mesh);
    if(solid) colliders.push({minX:x-r,maxX:x+r,minZ:z-r,maxZ:z+r,minY:y-h/2,maxY:y+h/2,name});
    return mesh;
  };
  const addPointLight=(x,y,z,color,intensity,distance,angle=Math.PI/4)=>{
    const light=new THREE.PointLight(color,intensity,distance,2);light.position.set(x,y,z);scene.add(light);lights.push(light);return light;
  };
  const addFluoro=(x,z, color=0xd8e5df, intensity=1.6)=>{
    const housing=addBox('fluorescent housing',x,7.65,z,3.6,.12,.32,metal,false);
    const lamp=addBox('fluorescent tube',x,7.55,z,3.2,.045,.18,new THREE.MeshBasicMaterial({color} ),false,{castShadow:false});
    const light=new THREE.PointLight(color,intensity,18,1.8);light.position.set(x,7.2,z);scene.add(light);lights.push(light);
    return {housing,lamp,light,base:intensity,phase:Math.random()*10};
  };
  const flickerLights=[];

  // The building is intentionally oversized and mostly empty: familiar architecture, long sightlines, dead space.
  addBox('main floor',0,-.22,0,80,.4,64,vinyl,false,{castShadow:false});
  // Faded floor lanes and zones.
  for(let i=-3;i<=3;i++) addBox('floor stripe',i*9,-.015,1,.035,.01,55,mat('stripe'+i,0x53534a),false,{castShadow:false});
  addBox('arena rubber floor',0,-.005,-14,38,.08,30,rubber,false,{castShadow:false});
  addBox('front lobby tile',0,-.005,24,38,.08,15,concrete,false,{castShadow:false});

  // Exterior shell, with an entry opening and a separate emergency exit.
  addBox('north exterior wall',0,4,-32,80,8,1.1,wallMat,true);
  addBox('west exterior wall',-40,4,0,1.1,8,64,wallMat,true);
  addBox('east exterior wall',40,4,0,1.1,8,64,wallMat,true);
  addBox('south wall west',-23,4,32,34,8,1.1,wallMat,true);
  addBox('south wall middle',17,4,32,26,8,1.1,wallMat,true);
  addBox('front glass doors',0,2.2,31.7,10,4.4,.18,dirtyGlass,false);
  addBox('emergency door',33.5,2.3,31.55,4.2,4.6,.25,red,true);
  addBox('exit push bar',33.5,2.0,31.35,2.8,.12,.12,metal,false);
  addBox('exit sign',33.5,5.4,30.95,2.4,.55,.18,glowGreen,false);
  addBox('north wall strip',0,6.8,-31.35,78,.25,.2,darkWall,false);

  // Internal partitions: party rooms, staff rooms, service corridor.
  // West party suite.
  addBox('party west outer divider A',-18,3.8,13.2,1,7.6,3.4,wallMat,true);
  addBox('party west outer divider B',-18,3.8,24.5,1,7.6,12,wallMat,true);
  addBox('party west rear divider',-28,3.8,11.5,20,7.6,1,wallMat,true);
  // east service suite
  addBox('service east divider A',18,3.8,13.2,1,7.6,3.4,wallMat,true);
  addBox('service east divider B',18,3.8,24.5,1,7.6,12,wallMat,true);
  addBox('service east rear divider',28,3.8,11.5,20,7.6,1,wallMat,true);
  // Open door gaps are left at outer ends of the dividing walls. Office and maintenance doors use dark frames.
  addBox('west room door header',-18,6.8,15,1,1.2,5,metal,false);
  addBox('east room door header',18,6.8,15,1,1.2,5,metal,false);
  // A broken wall creates a choke point from the public hall into the arena.
  addBox('arena west return north',-20,3.8,-24,1,7.6,12,wallMat,true);
  addBox('arena west return south',-20,3.8,8,1,7.6,6,wallMat,true);
  addBox('arena east return north',20,3.8,-24,1,7.6,12,wallMat,true);
  addBox('arena east return south',20,3.8,8,1,7.6,6,wallMat,true);
  addBox('arena southern divider left',-12,3.8,3,16,7.6,1,wallMat,true);
  addBox('arena southern divider right',12,3.8,3,16,7.6,1,wallMat,true);
  // Keep passage at x=-3..3 through arena southern divider.
  // The west/east arena returns have wide openings at either end to allow circulation.
  // Ceiling and structural trusses.
  addBox('ceiling',0,8.2,0,80,.55,64,darkWall,false,{castShadow:false});
  for(let x=-36;x<=36;x+=12) addBox('ceiling beam',x,7.78,0,.22,.5,62,metal,false);
  for(let z=-28;z<=28;z+=12) addBox('ceiling crossbeam',0,7.8,z,78,.35,.2,metal,false);

  // Windows with grimy panes along exterior walls.
  for(let z=-20;z<=20;z+=10){
    addBox('west window',-39.38,4.9,z,.12,2.4,6,dirtyGlass,false);
    addBox('east window',39.38,4.9,z,.12,2.4,6,dirtyGlass,false);
  }

  // Reception counter and abandoned check-in area.
  addBox('reception counter',-25,1.05,25,12,2.1,2.2,wood,true);
  addBox('countertop',-25,2.15,25,12.3,.18,2.5,metal,false);
  addBox('monitor',-25,3.0,24.8,2,.95,.3,darkWall,true);
  addBox('monitor glow',-25,3.0,24.62,1.75,.7,.035,glowGreen,false);
  addBox('queue stanchion 1',-33,1,28,.15,2,.15,metal,true);
  addBox('queue stanchion 2',-29,1,28,.15,2,.15,metal,true);
  for(let x=-34;x<=-22;x+=4){addBox('waiting bench',x,.8,21.2,3,.5,1,wood,true);}

  // Party rooms: tables, chairs, ruined birthday details.
  for(const [cx,cz] of [[-27,17],[-27,24],[27,17],[27,24]]){
    addBox('party table',cx,1.45,cz,5,.22,2.5,wood,true);
    for(const dx of [-2,2]) for(const dz of [-1.5,1.5]) addBox('party chair',cx+dx,.65,cz+dz,.8,1.2,.8,blue,true);
  }
  for(let i=0;i<5;i++){
    const b=addCylinder('balloon',-34+i*3,3.5,19+(i%2)*5,.42,1, i%2?red:blue,false); b.scale.set(.42,.58,.42);
    const string=addBox('balloon string',-34+i*3,2.8,19+(i%2)*5,.025,1,.025,white,false);
  }
  addBox('birthday banner',-27,5.6,11.9,9,1.2,.12,red,false);
  addBox('banner text strip',-27,5.6,11.8,7,.2,.05,yellow,false);

  // Office on the western side.
  addBox('office desk',-27,1.05,2,6,2.1,2.4,wood,true);
  addBox('office chair',-27,1.0,-.3,1.2,2,1.2,blue,true);
  for(let z=-4;z<=5;z+=2.5) addBox('filing cabinet',-36,1.6,z,1.5,3.2,1.6,metal,true);
  addBox('cork board',-34.5,4.6,5,3.2,2.1,.15,wood,false);
  addBox('office door frame',-18,2.6,2,1.2,5.2,4,metal,false);
  // Staff room and lockers.
  for(let i=0;i<6;i++){
    const x=-34+i*2.7;
    addBox('locker',x,1.7,-5,1.7,3.4,1.3,metal,true);
    addBox('locker vent',x,2.7,-4.31,1.15,.25,.03,darkWall,false);
    addBox('locker handle',x+.5,1.5,-4.25,.08,.45,.08,white,false);
    hides.push({position:new THREE.Vector3(x,0,-3.8),camera:new THREE.Vector3(x,1.2,-4.75),name:'locker'});
  }

  // Maintenance and generator service bays.
  addBox('maintenance workbench',27,1.1,17,8,2.2,2,wood,true);
  addBox('tool chest',35,1.0,12,2,2,3,red,true);
  addBox('maintenance shelves',35,2,22,2,4,6,metal,true);
  addBox('generator housing',28,2.1,-10,7,4.2,4.5,metal,true);
  addBox('generator front panel',28,2.2,-7.68,4.2,2.1,.12,darkWall,false);
  addBox('generator display',28,2.5,-7.58,1.5,.65,.05,glowRed,false);
  for(let i=0;i<3;i++) addCylinder('generator vent',25+i*2.5,2,-12.4,.35,1.8,darkWall,false);
  for(let i=0;i<4;i++){
    addBox('parts shelf',35,1.0+i*1.05,-2,1.2,.18,5,wood,false);
    for(let j=0;j<3;j++) addBox('parts box',34.5,1.45+i*1.05,-3.6+j*1.4,.55,.6,.55,i%2?blue:red,true);
  }
  addBox('east service counter',27,1.0,24,6,2,1.6,wood,true);
  for(let i=0;i<4;i++) addBox('stacked mat',22+i*2,.45,21,1.5,.8,1.4,blue,true);

  // Dodgeball and basketball zones.
  addBox('dodgeball court marking',-28,.02,-17,18,.025,17,mat('courtBlue',0x283b43),false,{castShadow:false});
  for(let x=-35;x<=-21;x+=3.5) for(let z=-23;z<=-11;z+=4){addCylinder('dodgeball',x,.48,z,.48,.95,(Math.random()>.5?red:blue),false);}
  addBox('basketball backboard',28,5,-21,.2,3.4,4,white,false);
  addCylinder('basketball hoop',28,3.8,-18.7,.8,.12,red,false);
  addBox('basketball support',28,2.5,-22,.35,5,.35,metal,true);
  for(let i=0;i<3;i++) addCylinder('basketball',24+i*2,.55,-25,.55,1.1,yellow,false);

  // Foam pit: rim, dark cavity, foam cubes.
  addBox('foam pit base',-12,.18,-18,9,.35,8,darkWall,false);
  for(const [x,z,sx,sz] of [[-16,-18,1,8],[-8,-18,1,8],[-12,-22,8,1],[-12,-14,8,1]]) addBox('foam pit rim',x,.7,z,sx,1.4,sz,blue,true);
  for(let i=0;i<27;i++){
    const x=-15.5+Math.random()*7, z=-21.2+Math.random()*6.4;
    const cube=addBox('foam cube',x,.4+Math.random()*.35,z,.8,.8,.8,i%3===0?yellow:(i%3===1?blue:red),false);
    cube.rotation.y=Math.random()*Math.PI;
  }

  // Main trampoline arena. Flexible tops are animated by the game loop.
  const trampMat1=mat('trampBlue',0x17465c,.65);
  const trampMat2=mat('trampRed',0x76352f,.7);
  for(let row=0;row<3;row++) for(let col=0;col<4;col++){
    const x=-4.8+col*3.2, z=-7.5-row*4.4;
    const base=addBox('trampoline frame',x,.45,z,2.8,.65,3.9,metal,false);
    const top=addBox('trampoline mat',x,.82,z,2.55,.12,3.62,(row+col)%2?trampMat1:trampMat2,false);
    addBox('trampoline safety pad',x,.82,z-1.85,2.8,.18,.25,blue,false);
    addBox('trampoline safety pad',x,.82,z+1.85,2.8,.18,.25,blue,false);
    trampolines.push({x,z,width:2.5,depth:3.5,top,baseY:1.0,phase:0,active:false,base});
  }
  // A few single trampolines in the basketball/dodgeball spaces.
  for(const [x,z] of [[25,-17],[30,-17],[-26,-8]]){
    addBox('side trampoline frame',x,.45,z,3,.65,4,metal,false);
    const top=addBox('side trampoline mat',x,.82,z,2.7,.12,3.7,trampMat1,false);
    trampolines.push({x,z,width:2.6,depth:3.5,top,baseY:1,phase:0,active:false});
  }

  // Decorative poles, arcade machine, trash, abandoned shoes.
  for(let i=0;i<7;i++){
    addBox('arcade cabinet',-35+i*2.8,.95,-28,1.2,1.9,1.1,darkWall,true);
    addBox('arcade screen',-35+i*2.8,1.3,-27.42,.8,.6,.04,i%2?glowRed:glowGreen,false);
  }
  for(const [x,z] of [[-14,22],[-8,20],[12,18],[14,-2],[-23,-25],[34,6]]){
    addBox('abandoned shoe',x,.18,z,.8,.35,.35,wood,false);
  }
  for(const [x,z] of [[-10,11],[11,11],[-33,-10],[34,-15]]){
    addCylinder('trash bin',x,.8,z,.55,1.6,darkWall,true);
  }

  // Hiding places: storage nook, maintenance shelving and reception counter.
  hides.push({position:new THREE.Vector3(34,0,18),camera:new THREE.Vector3(33,1.35,20),name:'behind equipment'});
  hides.push({position:new THREE.Vector3(-25,0,20),camera:new THREE.Vector3(-25,1.35,22),name:'under reception'});
  hides.push({position:new THREE.Vector3(32,0,11),camera:new THREE.Vector3(32,1.2,13),name:'storage nook'});

  // Wall decals and directional signs.
  const sign=(text,x,y,z,color=0xe1d7bd)=>{
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#18211f';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#a85a43';ctx.lineWidth=5;ctx.strokeRect(6,6,500,116);
    ctx.fillStyle='#d9d4c7';ctx.font='bold 52px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,66);
    const tex=new THREE.CanvasTexture(canvas); const mesh=new THREE.Mesh(new THREE.PlaneGeometry(5,.95),new THREE.MeshBasicMaterial({map:tex,transparent:false}));mesh.position.set(x,y,z);if(z<0)mesh.rotation.y=Math.PI;scene.add(mesh);return mesh;
  };
  sign('JUMPZONE',-25,6.2,30.9); sign('EMPLOYEES ONLY',-18,5.8,3.7); sign('DODGEBALL',-28,6.3,-28); sign('MAINTENANCE',26,6.2,30.9); sign('BASKETBALL',28,6.2,-29);
  addBox('wall mural left',-39.35,3.2,-4,.1,3.5,17,blue,false);
  addBox('wall mural right',39.35,3.2,4,.1,3.5,17,red,false);

  // Ceiling lights. Several fail intermittently.
  for(const [x,z] of [[0,25],[-26,24],[26,24],[-26,1],[27,1],[-26,-13],[27,-13],[-6,-8],[6,-8],[-6,-22],[6,-22]]){
    const f=addFluoro(x,z,0xd1ddd6,1.35);flickerLights.push(f);
  }
  for(const [x,z] of [[-37,0],[37,0],[0,-29]]) addPointLight(x,5,z,0x9bafb0,.55,24);

  // Objective-related equipment markers; their meshes are intentionally understated.
  const marker=(name,x,y,z,color=0xb7894f,scale=.22)=>{
    const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(scale,0),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.42,roughness:.4}));
    mesh.position.set(x,y,z);mesh.castShadow=true;scene.add(mesh);
    const glow=new THREE.PointLight(color,.28,4);glow.position.copy(mesh.position);scene.add(glow);
    const item={name,mesh,glow,position:new THREE.Vector3(x,y,z),active:true};interactables.push(item);return item;
  };
  marker('electrical panel',-34,2.4,25.2,0x8ab68a,.32);
  marker('party cabinet',-28,2.1,17,0xc99e59,.28);
  marker('fuse A',-15,1.4,-22,0xc99e59,.23);
  marker('fuse B',-35,1.4,-5,0xc99e59,.23);
  marker('fuse C',23,1.4,16,0xc99e59,.23);
  marker('generator console',28,3.2,-7.45,0x78a8a1,.26);
  marker('manager keycard',-27,2.5,2.3,0x75a4b2,.22);
  marker('emergency panel',33.5,2.6,28.8,0x9c4940,.28);

  // Hiding prompts are separate interactable meshes at their entrances.
  for(const h of hides){
    const orb=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),new THREE.MeshBasicMaterial({color:0x71847d}));
    orb.position.set(h.position.x,.22,h.position.z);scene.add(orb);h.marker=orb;
  }

  const dustCount=260;
  const dustPositions=new Float32Array(dustCount*3);
  for(let i=0;i<dustCount;i++){dustPositions[i*3]=(Math.random()-.5)*76;dustPositions[i*3+1]=.8+Math.random()*6.5;dustPositions[i*3+2]=(Math.random()-.5)*58;}
  const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
  const dustMaterial=new THREE.PointsMaterial({color:0xbac3b4,size:.045,transparent:true,opacity:.22,depthWrite:false});
  const dust=new THREE.Points(dustGeometry,dustMaterial);scene.add(dust);
  return {colliders,trampolines,hides,lights,flickerLights,interactables,materials,addBox,addCylinder,addPointLight,dust};
}

export function collidesAt(world,x,z,radius=.38){
  for(const c of world.colliders){
    if(c.maxY<.1 || c.minY>2.1) continue;
    const nx=Math.max(c.minX,Math.min(x,c.maxX));
    const nz=Math.max(c.minZ,Math.min(z,c.maxZ));
    const dx=x-nx,dz=z-nz;
    if(dx*dx+dz*dz<radius*radius) return c;
  }
  return null;
}

export function findPath(world,start,end){
  const cell=2;
  const toKey=(x,z)=>`${Math.round(x/cell)},${Math.round(z/cell)}`;
  const fromKey=k=>k.split(',').map(Number);
  const sx=Math.round(start.x/cell),sz=Math.round(start.z/cell), ex=Math.round(end.x/cell),ez=Math.round(end.z/cell);
  const startK=`${sx},${sz}`,endK=`${ex},${ez}`;
  const open=[{x:sx,z:sz,k:startK,g:0,f:Math.abs(ex-sx)+Math.abs(ez-sz)}];
  const came=new Map(),gScore=new Map([[startK,0]]),closed=new Set();
  const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  let iterations=0;
  while(open.length&&iterations++<2200){
    open.sort((a,b)=>a.f-b.f);const cur=open.shift();
    if(cur.k===endK){let k=endK,path=[];while(k!==startK){const [x,z]=fromKey(k);path.unshift({x:x*cell,y:0,z:z*cell});k=came.get(k);if(!k)break;}return path;}
    if(closed.has(cur.k))continue;closed.add(cur.k);
    for(const [dx,dz] of dirs){const x=cur.x+dx,z=cur.z+dz; if(Math.abs(x*cell)>38||Math.abs(z*cell)>30)continue;
      if(collidesAt(world,x*cell,z*cell,.55))continue;
      if(dx&&dz&&(collidesAt(world,(cur.x+dx)*cell,cur.z*cell,.45)||collidesAt(world,cur.x*cell,(cur.z+dz)*cell,.45)))continue;
      const k=`${x},${z}`,ng=cur.g+(dx&&dz?1.414:1);if(ng>=(gScore.get(k)??Infinity))continue;
      came.set(k,cur.k);gScore.set(k,ng);open.push({x,z,k,g:ng,f:ng+Math.abs(ex-x)+Math.abs(ez-z)});
    }
  }
  // If no grid route exists, return a cautious direct waypoint.
  return [{x:end.x,y:0,z:end.z}];
}
