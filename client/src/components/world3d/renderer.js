const CITY_ACCENT = [0.87, 0.66, 0.35];
const FOLIAGE = [[0.34, 0.49, 0.31], [0.43, 0.57, 0.38], [0.26, 0.4, 0.3], [0.54, 0.62, 0.39]];
const AGENT_COLORS = [[0.59, 0.48, 0.75], [0.39, 0.69, 0.7], [0.76, 0.57, 0.77], [0.79, 0.67, 0.45]];
const toColor = (hex) => [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);

function geometryFor(kind) {
  const vertices = [];
  const face = (points, normal) => {
    for (const index of [0, 1, 2, 0, 2, 3]) vertices.push(...points[index], ...normal);
  };
  if (kind === "box") {
    face([[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],[0,0,1]);
    face([[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]],[0,0,-1]);
    face([[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]],[1,0,0]);
    face([[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]],[-1,0,0]);
    face([[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]],[0,1,0]);
    face([[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]],[0,-1,0]);
  } else if (kind === "sphere") {
    const rows = 9, columns = 12;
    const point = (row, column) => {
      const phi = Math.PI * row / rows, theta = 2 * Math.PI * column / columns;
      return [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
    };
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const a = point(row, column), b = point(row + 1, column), c = point(row + 1, column + 1), d = point(row, column + 1);
      for (const vertex of [a,b,d,b,c,d]) vertices.push(...vertex, ...vertex);
    }
  } else if (kind === "cone" || kind === "cylinder") {
    const steps = 12, topRadius = kind === "cone" ? 0 : .5;
    for (let i = 0; i < steps; i++) {
      const a = 2 * Math.PI * i / steps, b = 2 * Math.PI * (i + 1) / steps;
      const p0 = [.5 * Math.cos(a), -.5, .5 * Math.sin(a)], p1 = [.5 * Math.cos(b), -.5, .5 * Math.sin(b)];
      const p2 = [topRadius * Math.cos(b), .5, topRadius * Math.sin(b)], p3 = [topRadius * Math.cos(a), .5, topRadius * Math.sin(a)];
      const normal = (p) => { const n = Math.hypot(p[0], .5, p[2]) || 1; return [p[0] / n, .5 / n, p[2] / n]; };
      for (const point of [p0,p1,p2,p0,p2,p3]) vertices.push(...point, ...normal(point));
      for (const point of [[0,-.5,0],p1,p0]) vertices.push(...point, 0,-1,0);
      if (topRadius) for (const point of [[0,.5,0],p3,p2]) vertices.push(...point, 0,1,0);
    }
  }
  return new Float32Array(vertices);
}

const VERTEX_SHADER = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uViewProjection;
uniform mat4 uModel;
varying vec3 vNormal;
void main() {
  gl_Position = uViewProjection * uModel * vec4(aPosition, 1.0);
  vNormal = normalize(mat3(uModel) * aNormal);
}`;
const FRAGMENT_SHADER = `
precision mediump float;
uniform vec3 uColor;
uniform vec3 uEmission;
varying vec3 vNormal;
void main() {
  vec3 light = normalize(vec3(-0.38, 0.84, 0.42));
  float diffuse = max(dot(normalize(vNormal), light), 0.0);
  float hemisphere = 0.24 + 0.18 * max(normalize(vNormal).y, 0.0);
  vec3 color = uColor * (hemisphere + diffuse * 0.74) + uEmission;
  gl_FragColor = vec4(color, 1.0);
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || "WebGL shader failed to compile.");
  return shader;
}
function makeProgram(gl) {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "WebGL renderer failed to link.");
  return program;
}
const identity = () => [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function multiply(a, b) {
  const out = new Array(16);
  for (let column = 0; column < 4; column++) for (let row = 0; row < 4; row++) out[column * 4 + row] = a[row] * b[column * 4] + a[4 + row] * b[column * 4 + 1] + a[8 + row] * b[column * 4 + 2] + a[12 + row] * b[column * 4 + 3];
  return out;
}
function translation([x,y,z]) { const out = identity(); out[12]=x; out[13]=y; out[14]=z; return out; }
function scaling([x,y,z]) { const out = identity(); out[0]=x; out[5]=y; out[10]=z; return out; }
function rotateX(angle) { const c=Math.cos(angle),s=Math.sin(angle); return [1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]; }
function rotateY(angle) { const c=Math.cos(angle),s=Math.sin(angle); return [c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]; }
function rotateZ(angle) { const c=Math.cos(angle),s=Math.sin(angle); return [c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1]; }
function modelMatrix(item) { return multiply(translation(item.position), multiply(rotateY(item.rotation?.[1] || 0), multiply(rotateX(item.rotation?.[0] || 0), multiply(rotateZ(item.rotation?.[2] || 0), scaling(item.scale))))); }
function perspective(fov, aspect, near, far) {
  const f=1/Math.tan(fov/2), nf=1/(near-far);
  return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0];
}
function lookAt(eye, target) {
  const normalize=(v)=>{const n=Math.hypot(...v)||1;return v.map((x)=>x/n);}, cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]], sub=(a,b)=>a.map((x,i)=>x-b[i]);
  const z=normalize(sub(eye,target)), x=normalize(cross([0,1,0],z)), y=cross(z,x);
  return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((s,v,i)=>s+v*eye[i],0),-y.reduce((s,v,i)=>s+v*eye[i],0),-z.reduce((s,v,i)=>s+v*eye[i],0),1];
}
function project(point, matrix, width, height) {
  const [x,y,z]=point, clip=[matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12],matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13],matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14],matrix[3]*x+matrix[7]*y+matrix[11]*z+matrix[15]];
  if (clip[3] <= 0) return null;
  return { x:(clip[0]/clip[3]*.5+.5)*width, y:(1-(clip[1]/clip[3]*.5+.5))*height, z:clip[2]/clip[3] };
}
const add = (items, kind, position, scale, color, extra={}) => items.push({ kind, position, scale, color, rotation:[0,0,0], emission:[0,0,0], ...extra });
const distance = (a,b) => Math.hypot(a[0]-b[0],a[2]-b[2]);
function pointSegmentDistance(p,a,b) { const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))); return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy); }
function safeIdAngle(id) { let n=0; for (const char of id) n=(n*31+char.charCodeAt(0))>>>0; return (n%6283)/1000; }
function cityPoints(intersections=[]) {
  const known={home:[-8,0],central:[0,-5],market:[0,5],work:[8,0]};
  return Object.fromEntries(intersections.map((id,index)=>[id,known[id]||[Math.cos(safeIdAngle(id)+index)*8,Math.sin(safeIdAngle(id)+index)*6]]));
}
function edgeTransform(a,b) { const dx=b[0]-a[0], dz=b[1]-a[1], len=Math.hypot(dx,dz), angle=-Math.atan2(dz,dx); return { len, angle, mid:[(a[0]+b[0])/2,(a[1]+b[1])/2], perpendicular:[-dz/(len||1),dx/(len||1)] }; }
function nearRoad(point, roads, points, radius=2.3) { return roads.some((road)=>{const a=points[road.from],b=points[road.to]; if(!a||!b)return false; const t=Math.max(0,Math.min(1,((point[0]-a[0])*(b[0]-a[0])+(point[1]-a[1])*(b[1]-a[1]))/((b[0]-a[0])**2+(b[1]-a[1])**2||1)));return Math.hypot(point[0]-a[0]-t*(b[0]-a[0]),point[1]-a[1]-t*(b[1]-a[1]))<radius;}); }

function cityScene(state, selectedRoad) {
  const items=[], roads=state?.roads||[], points=cityPoints(state?.intersections||[]);
  add(items,"box",[0,-.45,0],[30,.55,24],[.15,.18,.17]);
  // Street blocks and buildings are deterministic geometry arranged around the returned road graph.
  let buildingIndex=0;
  for(let x=-12;x<=12;x+=6) for(let z=-9;z<=9;z+=6) {
    if(nearRoad([x,z],roads,points,2.7)) continue;
    const hash=Math.abs(Math.sin((x+14)*8.32+(z+11)*17.13)), h=1.7+hash*3.9, w=1.55+hash*.35, d=1.55+((buildingIndex%3)*.12);
    const bodyColor=[.26+hash*.12,.28+hash*.1,.29+hash*.09];
    add(items,"box",[x,h/2-.1,z],[w,h,d],bodyColor);
    add(items,"box",[x,h+.02,z],[w+.1,.15,d+.1],[.47,.43,.34]);
    const floors=Math.floor(h/1.1);
    for(let floor=0;floor<floors;floor++) for(const side of [-1,1]) for(let col=0;col<2;col++) {
      const y=.45+floor*.92, xo=(col-.5)*.53;
      add(items,"box",[x+xo,y,z+side*(d/2+.012)],[.22,.28,.035],[.77,.61,.36],{emission:[.12,.07,.025]});
      add(items,"box",[x+side*(w/2+.012),y,z+xo],[.035,.28,.22],[.67,.62,.48],{emission:[.075,.055,.03]});
    }
    buildingIndex++;
  }
  const roadHits=[];
  for(const road of roads) {
    const a=points[road.from],b=points[road.to]; if(!a||!b) continue;
    const {len,angle,mid,perpendicular}=edgeTransform(a,b), width=1.05+Math.min(road.capacity,4)*.2, closed=road.capacity===0, picked=road.id===selectedRoad;
    const color=closed?[.52,.21,.16]:picked?[.84,.62,.28]:[.32,.35,.36];
    add(items,"box",[mid[0],-.08,mid[1]],[len+.25,.18,width],color,{rotation:[0,angle,0],emission:picked?[.15,.08,.01]:closed?[.08,.01,.005]:[0,0,0]});
    for(const side of [-1,1]) add(items,"box",[mid[0]+perpendicular[0]*(width/2+.22),-.02,mid[1]+perpendicular[1]*(width/2+.22)],[len+.25,.11,.28],[.54,.52,.44],{rotation:[0,angle,0]});
    for(const side of [-1,1])add(items,"box",[mid[0]+perpendicular[0]*width*.34,.025,mid[1]+perpendicular[1]*width*.34],[len,.035,.055],closed?[.84,.38,.23]:[.83,.76,.62],{rotation:[0,angle,0]});
    for(let at=-len/2+.55;at<len/2-.2;at+=1.15) add(items,"box",[mid[0]+Math.cos(angle)*at,.03,mid[1]-Math.sin(angle)*at],[.52,.035,.07],closed?[.92,.49,.3]:[.96,.89,.73],{rotation:[0,angle,0]});
    if(closed) for(let side=-1;side<=1;side+=2) add(items,"box",[mid[0]+perpendicular[0]*side*.26,.23,mid[1]+perpendicular[1]*side*.26],[.32,.38,.12],[.83,.34,.19],{rotation:[0,angle,0]});
    roadHits.push({type:"road",id:road.id,a:[a[0],.12,a[1]],b:[b[0],.12,b[1]],radius:18});
  }
  for(const [id,[x,z]] of Object.entries(points)) {
    add(items,"cylinder",[x,.04,z],[1.24,.13,1.24],[.42,.43,.39]);
    add(items,"cylinder",[x,.17,z],[.22,.08,.22],CITY_ACCENT,{emission:[.13,.07,.01]});
    roadHits.push({type:"intersection",id,point:[x,.5,z],radius:24});
  }
  return {items,hits:roadHits,points};
}

function ecosystemScene(state, selectedSpecies) {
  const items=[], species=state?.species||[];
  add(items,"box",[0,-.52,0],[24,.8,20],[.24,.34,.24]);
  // Rounded low-poly habitat mounds and a quiet pond establish an organic landscape.
  [[-6,.05,-3,4.5,.65,3.4],[5,.02,-4,4,.55,3.2],[-1,.02,6,5,.58,3]].forEach(([x,y,z,sx,sy,sz],i)=>add(items,"sphere",[x,y,z],[sx,sy,sz],FOLIAGE[i%FOLIAGE.length]));
  add(items,"cylinder",[7,-.06,4],[5,.08,3.4],[.15,.32,.39],{rotation:[0,.25,0]});
  const trees=[[-9,0,-7],[-6,0,-8],[-2,0,-8],[3,0,-8],[8,0,-7],[10,0,-3],[9,0,1],[9,0,7],[5,0,8],[1,0,8],[-5,0,7],[-9,0,4],[-10,0,0]];
  trees.forEach(([x,y,z],i)=>{const height=1.5+(i%4)*.28;add(items,"cylinder",[x,y+height*.48,z],[.19,height,.19],[.34,.24,.15]);add(items,"cone",[x,y+height+0.42,z],[1.2,.98,1.2],FOLIAGE[i%FOLIAGE.length]);add(items,"cone",[x,y+height+.88,z],[.82,.86,.82],FOLIAGE[(i+1)%FOLIAGE.length]);});
  const positions={plants:[-5,.18,0],rabbits:[-2,.22,1],foxes:[3,.25,-1]};
  const positionFor=(id,index)=>positions[id]||[Math.cos(safeIdAngle(id))*5,.25,Math.sin(safeIdAngle(id))*4];
  const hits=[];
  for(const [index,animal] of species.entries()) {
    const p=positionFor(animal.id,index), picked=animal.id===selectedSpecies;
    hits.push({type:"species",id:animal.id,point:[p[0],p[1]+.7,p[2]],radius:27});
    const food=animal.food==="plants"?[positions.plants[0],.15,positions.plants[2]]:positionFor(animal.food,index);
    if(food) {
      const dx=p[0]-food[0],dz=p[2]-food[2];
      for(let t=.1;t<.9;t+=.11){const x=food[0]+dx*t,z=food[2]+dz*t;add(items,"sphere",[x,.32+Math.sin(t*Math.PI)*.35,z],[.045,.045,.045],[.66,.78,.52],{emission:[.04,.08,.02]});}
    }
    add(items,"cylinder",[p[0],.1,p[2]],[1.65,.08,1.35],picked?[.42,.45,.29]:[.31,.39,.27],{emission:picked?[.12,.13,.025]:[0,0,0]});
  }
  return {items,hits,positions};
}

function graphComponents(agents,connections) {
  const adj=new Map(agents.map((agent)=>[agent.id,[]]));
  for(const [a,b] of connections) { if(adj.has(a)&&adj.has(b)){adj.get(a).push(b);adj.get(b).push(a);} }
  const seen=new Set(),groups=[];
  for(const id of adj.keys()) if(!seen.has(id)){const stack=[id],group=[];seen.add(id);while(stack.length){const item=stack.pop();group.push(item);for(const next of adj.get(item))if(!seen.has(next)){seen.add(next);stack.push(next);}}groups.push(group);}
  return groups;
}
function unknownPoints(agents) {
  const count=Math.max(1,agents.length);
  return Object.fromEntries(agents.map((agent,index)=>{const angle=-Math.PI/2+2*Math.PI*index/count,radius=agents.length===1?0:4.35;return [agent.id,[Math.cos(angle)*radius,1+safeIdAngle(agent.id)%1.8,Math.sin(angle)*radius]];}));
}
function unknownScene(state) {
  const items=[],agents=state?.agents||[],points=unknownPoints(agents),hits=[];
  add(items,"box",[0,-.58,0],[18,.3,18],[.13,.12,.2],{emission:[.025,.015,.045]});
  agents.forEach((agent)=>{const p=points[agent.id];if(!p)return;add(items,"cylinder",[p[0],-.32,p[2]],[1.9,.22,1.9],[.2,.18,.29],{emission:[.035,.025,.06]});hits.push({type:"agent",id:agent.id,point:p,radius:24});});
  return {items,hits,edgeHits:[],points};
}

export class WorldRenderer {
  constructor(canvas, props) {
    this.canvas=canvas;this.props=props;this.gl=canvas.getContext("webgl",{antialias:true,alpha:false,powerPreference:"high-performance"});
    if(!this.gl) throw new Error("WebGL is unavailable. Enable browser hardware acceleration or use a WebGL-capable browser.");
    this.program=makeProgram(this.gl);this.attributes={position:this.gl.getAttribLocation(this.program,"aPosition"),normal:this.gl.getAttribLocation(this.program,"aNormal")};
    this.uniforms={vp:this.gl.getUniformLocation(this.program,"uViewProjection"),model:this.gl.getUniformLocation(this.program,"uModel"),color:this.gl.getUniformLocation(this.program,"uColor"),emission:this.gl.getUniformLocation(this.program,"uEmission")};
    this.geometryData=new Map();this.staticBuffers=[];this.dynamicBuffers=new Map();this.camera={yaw:.72,pitch:.74,distance:24,target:[0,0,0]};this.lastTime=0;this.playTime=0;this.lastReported=-1;this.disposed=false;this.props=null;
    this.reducedMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches||false;
    this.attachInput();this.update(props);this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas.parentElement);this.resize();
    this.raf=requestAnimationFrame((time)=>this.draw(time));
  }
  attachInput(){
    this.drag=null;
    this.preventContext=(event)=>event.preventDefault();this.canvas.addEventListener("contextmenu",this.preventContext);
    this.pointerDown=(event)=>{event.preventDefault();this.canvas.setPointerCapture?.(event.pointerId);this.drag={x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,button:event.button,shift:event.shiftKey,moved:false};};
    this.pointerMove=(event)=>{if(!this.drag)return;const dx=event.clientX-this.drag.lastX,dy=event.clientY-this.drag.lastY;this.drag.lastX=event.clientX;this.drag.lastY=event.clientY;if(Math.hypot(event.clientX-this.drag.x,event.clientY-this.drag.y)>3)this.drag.moved=true;if(this.drag.button===2||this.drag.button===1||this.drag.shift){const scale=this.camera.distance*.0015,side=[Math.cos(this.camera.yaw),0,-Math.sin(this.camera.yaw)];this.camera.target[0]-=dx*scale*side[0];this.camera.target[2]-=dx*scale*side[2];this.camera.target[1]+=dy*scale;}else{this.camera.yaw-=dx*.006;this.camera.pitch=Math.max(.12,Math.min(1.42,this.camera.pitch+dy*.005));}};
    this.pointerUp=(event)=>{if(this.drag&&!this.drag.moved)this.pick(event.clientX,event.clientY);this.drag=null;};
    this.wheel=(event)=>{event.preventDefault();this.camera.distance=Math.max(8,Math.min(54,this.camera.distance*Math.exp(event.deltaY*.001)));};
    this.canvas.addEventListener("pointerdown",this.pointerDown);this.canvas.addEventListener("pointermove",this.pointerMove);this.canvas.addEventListener("pointerup",this.pointerUp);this.canvas.addEventListener("pointercancel",this.pointerUp);this.canvas.addEventListener("wheel",this.wheel,{passive:false});
  }
  resize(){const rect=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,1.6);this.canvas.width=Math.max(1,Math.round(rect.width*dpr));this.canvas.height=Math.max(1,Math.round(rect.height*dpr));this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
  update(props){const changed=this.props?.world!==props.world||this.props?.timelineKey!==props.timelineKey||this.props?.scene!==props.scene;this.props=props;if(changed){this.playTime=0;this.lastReported=-1;this.resetCamera();}this.staticScene=this.buildStaticScene();for(const item of this.staticBuffers)this.gl.deleteBuffer(item.buffer);this.staticBuffers=this.uploadGroups(this.staticScene.items,glStaticDraw(this.gl));}
  resetCamera(){const camera={city:[.72,1.02,28,[0,.1,0]],ecosystem:[.34,.92,24,[0,.3,0]],unknown:[.72,.58,24,[0,1,0]]}[this.props.world]||[.72,1.02,28,[0,.1,0]];this.camera={yaw:camera[0],pitch:camera[1],distance:camera[2],target:[...camera[3]]};}
  buildStaticScene(){const {world,state,selectedRoad,selectedSpecies,selectedConnection}=this.props;if(world==="city")return cityScene(state,selectedRoad);if(world==="ecosystem")return ecosystemScene(state,selectedSpecies);return unknownScene(state,selectedConnection);}
  frameData(){const frames=this.props.trajectories||[];if(!frames.length)return {frame:null,next:null,alpha:0,index:0,total:0};const index=Math.min(frames.length-1,Math.floor(this.playTime)),alpha=index===frames.length-1||this.reducedMotion?0:Math.min(1,this.playTime-index);return {frame:frames[index],next:frames[Math.min(index+1,frames.length-1)],alpha,index,total:frames.length};}
  setPlaybackStep(index){const count=this.props.trajectories?.length||0;this.playTime=Math.max(0,Math.min(Math.max(0,count-1),Number(index)||0));this.props.onPlaybackStep?.(Math.floor(this.playTime),count);}
  dynamicItems(frame,next,alpha){const {world,state,events=[]}=this.props,items=[];this.frameHits=[];
    if(world==="city"){
      const roads=state?.roads||[],points=cityPoints(state?.intersections||[]),vehiclesA=frame?.vehicles||(!this.props.trajectories?.length?(state?.commuters||[]).map((person)=>({id:person.id,origin:person.origin,destination:person.destination,route:[],roadId:null,progress:0,queuePosition:0,currentNode:person.origin,status:"waiting",completed:false})):[]),vehiclesB=next?.vehicles||vehiclesA;
      const routeIds=new Set(vehiclesA.flatMap((vehicle)=>vehicle.route||[]));
      for(const road of roads){if(routeIds.has(road.id)&&road.capacity>0){const a=points[road.from],b=points[road.to];if(a&&b){const {len,angle,mid}=edgeTransform(a,b);add(items,"box",[mid[0],.045,mid[1]],[len,.035,.15],[.89,.67,.34],{rotation:[0,angle,0],emission:[.1,.05,.01]});}}}
      for(const v of vehiclesA){const b=vehiclesB.find((item)=>item.id===v.id)||v,posA=this.vehiclePosition(v,points,roads),posB=this.vehiclePosition(b,points,roads),pos=posA.map((value,i)=>value+(posB[i]-value)*alpha),status=v.status;
        const color=status==="queued"?[.85,.4,.24]:status==="completed"?[.79,.69,.43]:[.38,.62,.73];
        add(items,"box",[pos[0],.45,pos[2]],[.84,.34,.48],color,{rotation:[0,Math.atan2((points[v.destination]?.[1]||0)-pos[2],(points[v.destination]?.[0]||0)-pos[0]),0],emission:status==="queued"?[.14,.025,.006]:[.035,.05,.065]});
        add(items,"box",[pos[0]-.015,.67,pos[2]],[.42,.2,.38],[.29,.4,.46],{emission:[.025,.04,.05]});
        for(const side of [-1,1])for(const front of [-1,1])add(items,"cylinder",[pos[0]+side*.2,.27,pos[2]+front*.12],[.12,.09,.1],[.08,.09,.1]);
      }
      const queueFrame=frame?.vehicles||[];
      for(const vehicle of queueFrame.filter((item)=>item.status==="queued"&&item.roadId)){const road=roads.find((item)=>item.id===vehicle.roadId),p=road&&points[road.from];if(!road||!p)continue;const b=points[road.to],dx=b[0]-p[0],dz=b[1]-p[1],len=Math.hypot(dx,dz)||1,offset=.55+Math.max(0,vehicle.queuePosition-1)*.44,x=p[0]-dx/len*offset,z=p[1]-dz/len*offset;add(items,"box",[x,.3,z],[.44,.22,.28],[.84,.37,.22],{emission:[.08,.02,0]});}
    } else if(world==="ecosystem"){
      const resources=state?.resources||{},plant=frame?.resources?.plants??resources.plants??0,capacity=Math.max(1,resources.carryingCapacity||100),ratio=Math.max(0,Math.min(1,plant/capacity));
      const species=state?.species||[],referenceSpecies=this.props.referenceState?.species||species,max=Math.max(1,...referenceSpecies.map((item)=>item.population)),positions={plants:[-5,.18,0],rabbits:[-2,.22,1],foxes:[3,.25,-1]};
      for(let i=0;i<Math.round(7+ratio*34);i++){const x=((i*37)%190)/10-9.5,z=((i*61)%150)/10-7.5;if(Math.hypot(x-7,z-4)<2.6)continue;const h=.25+ratio*.28+(i%3)*.07;add(items,"cone",[x,h/2,z],[.13,h,.13],FOLIAGE[i%FOLIAGE.length]);}
      species.forEach((animal,index)=>{const p=positions[animal.id]||[Math.cos(safeIdAngle(animal.id))*5,.25,Math.sin(safeIdAngle(animal.id))*4],population=frame?.populations?.[animal.id]??animal.population,scale=.68+Math.sqrt(Math.max(0,population)/max)*.43;if(population<=0)return;const color=animal.id.toLowerCase().includes("fox")?[.71,.36,.2]:animal.id.toLowerCase().includes("rabbit")?[.65,.62,.52]:[.62,.58,.76];add(items,"sphere",[p[0],p[1]+.38,p[2]],[.66*scale,.42*scale,.42*scale],color);add(items,"sphere",[p[0]+.35*scale,p[1]+.63*scale,p[2]],[.31*scale,.29*scale,.29*scale],color);if(animal.id.toLowerCase().includes("rabbit")){add(items,"cone",[p[0]+.26*scale,p[1]+1.01*scale,p[2]],[.14*scale,.52*scale,.14*scale],[.73,.67,.59]);add(items,"cone",[p[0]+.46*scale,p[1]+1.02*scale,p[2]],[.14*scale,.48*scale,.14*scale],[.73,.67,.59]);}else if(animal.id.toLowerCase().includes("fox"))add(items,"cone",[p[0]+.49*scale,p[1]+.24*scale,p[2]],[.4*scale,.35*scale,.4*scale],color,{rotation:[0,0,-.8]});});
    } else {
      const agents=state?.agents||[],connections=frame?.connections||state?.connections||[],groups=graphComponents(agents,connections),points=unknownPoints(agents);
      for(const group of groups){const members=group.map((id)=>points[id]).filter(Boolean);if(!members.length)continue;const center=members.reduce((sum,p)=>[sum[0]+p[0]/members.length,sum[1]+p[1]/members.length,sum[2]+p[2]/members.length],[0,0,0]),diameter=Math.max(2.1,Math.sqrt(members.length)*2.2);add(items,"cylinder",[center[0],-.13,center[2]],[diameter,.28,diameter],[.2,.17,.3],{emission:[.045,.025,.08]});}
      for(const [a,b] of connections){const p=points[a],q=points[b];if(!p||!q)continue;this.frameHits.push({type:"connection",id:`${a}|${b}`,a:p,b:q,radius:16});const picked=this.props.selectedConnection&&((this.props.selectedConnection[0]===a&&this.props.selectedConnection[1]===b)||(this.props.selectedConnection[1]===a&&this.props.selectedConnection[0]===b));add(items,"cylinder",[(p[0]+q[0])/2,(p[1]+q[1])/2,(p[2]+q[2])/2],[picked?.18:.09,Math.hypot(q[0]-p[0],q[1]-p[1],q[2]-p[2]),picked?.18:.09],picked?[.77,.62,.94]:[.42,.43,.64],{rotation:[Math.atan2(Math.hypot(q[0]-p[0],q[2]-p[2]),q[1]-p[1]),Math.atan2(q[0]-p[0],q[2]-p[2]),0],emission:picked?[.19,.12,.32]:[.035,.03,.09]});}
      const resourcesA=frame?.resources||{},resourcesB=next?.resources||resourcesA,referenceAgents=this.props.referenceState?.agents||agents,maximum=Math.max(1,...referenceAgents.map((agent)=>agent.resource));
      agents.forEach((agent,index)=>{const p=points[agent.id],value=resourcesA[agent.id]??agent.resource,nextValue=resourcesB[agent.id]??value,resource=value+(nextValue-value)*alpha,ratio=Math.max(0,resource/maximum),r=.35+ratio*.42,color=AGENT_COLORS[index%AGENT_COLORS.length],picked=agent.id===this.props.selectedAgent;add(items,"sphere",p,[r*2,r*2,r*2],color,{emission:picked?[.24,.14,.34]:[.07*ratio,.05*ratio,.14*ratio]});});
      const currentStep=frame?.step;for(const event of events.filter((item)=>item.type==="resource_transfer"&&item.step===currentStep)){const a=points[event.from],b=points[event.to];if(!a||!b)continue;const p=a.map((value,i)=>value+(b[i]-value)*alpha);add(items,"sphere",p,[.14,.14,.14],[.89,.77,.98],{emission:[.4,.25,.56]});}
    }
    return items;
  }
  vehiclePosition(vehicle,points,roads){const road=roads.find((item)=>item.id===vehicle.roadId);if(road){const a=points[road.from],b=points[road.to];if(a&&b){if(vehicle.status==="queued"){const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)||1,offset=.45+Math.max(0,(vehicle.queuePosition||1)-1)*.38;return [a[0]-dx/length*offset,.3,a[1]-dz/length*offset];}const t=Math.max(0,Math.min(1,vehicle.progress||0));return [a[0]+(b[0]-a[0])*t,.3,a[1]+(b[1]-a[1])*t];}}
    const node=points[vehicle.currentNode||vehicle.origin]||points[vehicle.destination]||[0,0];
    // Keep commuters sharing a node individually visible while preserving their
    // recorded intersection as the center of the small staging area.
    const angle=safeIdAngle(vehicle.id),radius=1;
    return [node[0]+Math.cos(angle)*radius,.3,node[1]+Math.sin(angle)*radius];
  }
  cameraMatrices(){const {yaw,pitch,distance:d,target}=this.camera,eye=[target[0]+Math.sin(yaw)*Math.cos(pitch)*d,target[1]+Math.sin(pitch)*d,target[2]+Math.cos(yaw)*Math.cos(pitch)*d],view=lookAt(eye,target);return multiply(perspective(Math.PI/4,this.canvas.width/this.canvas.height,.1,120),view);}
  pick(clientX,clientY){const rect=this.canvas.getBoundingClientRect(),x=clientX-rect.left,y=clientY-rect.top,vp=this.cameraMatrices();let best=null,bestDistance=Infinity;for(const hit of [...(this.staticScene?.hits||[]),...(this.frameHits||[]),...(this.staticScene?.edgeHits||[])]){let d;if(hit.a&&hit.b){const a=project(hit.a,vp,rect.width,rect.height),b=project(hit.b,vp,rect.width,rect.height);if(!a||!b)continue;d=pointSegmentDistance([x,y],[a.x,a.y],[b.x,b.y]);}else{const p=project(hit.point,vp,rect.width,rect.height);if(!p)continue;d=Math.hypot(x-p.x,y-p.y);}if(d<(hit.radius||18)&&d<bestDistance){best=hit;bestDistance=d;}}
    if(!best)return;const props=this.props,target=best.point||(best.a&&best.b?[(best.a[0]+best.b[0])/2,(best.a[1]+best.b[1])/2,(best.a[2]+best.b[2])/2]:null);if(target)this.camera.target=[target[0],Math.max(.15,target[1]),target[2]];if(best.type==="road")props.onSelectRoad?.(best.id);if(best.type==="species")props.onSelectSpecies?.(best.id);if(best.type==="connection")props.onSelectConnection?.(best.id.split("|"));if(best.type==="agent")props.onSelectAgent?.(best.id);
  }
  draw(time){if(this.disposed)return;const gl=this.gl,delta=this.lastTime?Math.min(.05,(time-this.lastTime)/1000):0;this.lastTime=time;if(!this.reducedMotion&&(this.props.trajectories||[]).length>1){this.playTime=Math.min(this.props.trajectories.length-1,this.playTime+delta*.9);const step=Math.floor(this.playTime);if(step!==this.lastReported){this.lastReported=step;this.props.onPlaybackStep?.(step,this.props.trajectories.length);}}
    const color=this.props.world==="ecosystem"?[.045,.065,.045,1]:this.props.world==="unknown"?[.045,.038,.07,1]:[.055,.06,.06,1];gl.clearColor(...color);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.useProgram(this.program);
    const vp=this.cameraMatrices();gl.uniformMatrix4fv(this.uniforms.vp,false,new Float32Array(vp));gl.enableVertexAttribArray(this.attributes.position);gl.enableVertexAttribArray(this.attributes.normal);
    const {frame,next,alpha}=this.frameData();this.drawGroups(this.staticBuffers);const dynamic=this.uploadGroups(this.dynamicItems(frame,next,alpha),gl.DYNAMIC_DRAW,this.dynamicBuffers);this.drawGroups(dynamic);
    this.raf=requestAnimationFrame((nextTime)=>this.draw(nextTime));
  }
  uploadGroups(items,usage,existing){
    const groups=new Map();
    for(const item of items){let geometry=this.geometryData.get(item.kind);if(!geometry){geometry=geometryFor(item.kind);this.geometryData.set(item.kind,geometry);}const model=modelMatrix(item),key=`${item.color.join(",")}|${(item.emission||[0,0,0]).join(",")}`;let group=groups.get(key);if(!group){group={key,color:item.color,emission:item.emission||[0,0,0],vertices:[]};groups.set(key,group);}for(let index=0;index<geometry.length;index+=6){const x=geometry[index],y=geometry[index+1],z=geometry[index+2],nx=geometry[index+3],ny=geometry[index+4],nz=geometry[index+5];group.vertices.push(model[0]*x+model[4]*y+model[8]*z+model[12],model[1]*x+model[5]*y+model[9]*z+model[13],model[2]*x+model[6]*y+model[10]*z+model[14],model[0]*nx+model[4]*ny+model[8]*nz,model[1]*nx+model[5]*ny+model[9]*nz,model[2]*nx+model[6]*ny+model[10]*nz);}}
    const result=[];for(const group of groups.values()){let buffer=existing?.get(group.key);if(!buffer){buffer=this.gl.createBuffer();existing?.set(group.key,buffer);}this.gl.bindBuffer(this.gl.ARRAY_BUFFER,buffer);this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(group.vertices),usage);result.push({buffer,count:group.vertices.length/6,color:group.color,emission:group.emission});}return result;
  }
  drawGroups(groups){const gl=this.gl;for(const item of groups){gl.bindBuffer(gl.ARRAY_BUFFER,item.buffer);gl.vertexAttribPointer(this.attributes.position,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(this.attributes.normal,3,gl.FLOAT,false,24,12);gl.uniformMatrix4fv(this.uniforms.model,false,new Float32Array(identity()));gl.uniform3fv(this.uniforms.color,new Float32Array(item.color));gl.uniform3fv(this.uniforms.emission,new Float32Array(item.emission));gl.drawArrays(gl.TRIANGLES,0,item.count);}}
  dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.resizeObserver?.disconnect();for(const [event,fn] of [["pointerdown",this.pointerDown],["pointermove",this.pointerMove],["pointerup",this.pointerUp],["pointercancel",this.pointerUp],["wheel",this.wheel]])this.canvas.removeEventListener(event,fn);if(this.preventContext)this.canvas.removeEventListener("contextmenu",this.preventContext);for(const item of this.staticBuffers)this.gl.deleteBuffer(item.buffer);for(const item of this.dynamicBuffers.values())this.gl.deleteBuffer(item);this.gl.deleteProgram(this.program);}
}

function glStaticDraw(gl){return gl.STATIC_DRAW;}
