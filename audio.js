export class AudioEngine {
  constructor(){this.ctx=null;this.master=null;this.ambience=null;this.enabled=true;this.volume=.7;this.lastHeartbeat=0;this.heartbeatOsc=null;this.heartbeatGain=null;}
  init(){
    if(this.ctx)return;
    const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
    this.ctx=new Ctx();this.master=this.ctx.createGain();this.master.gain.value=this.volume;this.master.connect(this.ctx.destination);
    this._startAmbience();
  }
  setVolume(v){this.volume=v;if(this.master)this.master.gain.setTargetAtTime(v,this.ctx.currentTime,.05);}
  _tone(freq,duration,type='sine',gain=.08,pan=0,slide=0){
    if(!this.ctx||!this.enabled)return;
    const t=this.ctx.currentTime,osc=this.ctx.createOscillator(),g=this.ctx.createGain(),p=this.ctx.createStereoPanner();
    osc.type=type;osc.frequency.setValueAtTime(freq,t);if(slide)osc.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide),t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    p.pan.value=pan;osc.connect(g);g.connect(p);p.connect(this.master);osc.start(t);osc.stop(t+duration+.03);
  }
  _noise(duration,gain=.06,filter=800,pan=0){
    if(!this.ctx||!this.enabled)return;
    const t=this.ctx.currentTime,len=Math.ceil(this.ctx.sampleRate*duration),buffer=this.ctx.createBuffer(1,len,this.ctx.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/len,1.4);
    const src=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain(),p=this.ctx.createStereoPanner();
    src.buffer=buffer;f.type='lowpass';f.frequency.value=filter;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);p.pan.value=pan;
    src.connect(f);f.connect(g);g.connect(p);p.connect(this.master);src.start(t);src.stop(t+duration);
  }
  _startAmbience(){
    if(!this.ctx)return;
    const t=this.ctx.currentTime;
    const osc=this.ctx.createOscillator(),g=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();
    osc.type='triangle';osc.frequency.value=48;filter.type='lowpass';filter.frequency.value=120;g.gain.value=.022;
    osc.connect(filter);filter.connect(g);g.connect(this.master);osc.start();
    const hum2=this.ctx.createOscillator(),g2=this.ctx.createGain();hum2.type='sine';hum2.frequency.value=60;g2.gain.value=.012;hum2.connect(g2);g2.connect(this.master);hum2.start();
    this.ambience={osc,g,hum2,g2};
  }
  footstep(loud=1,surface='concrete'){const f=surface==='rubber'?220:(surface==='tile'?700:420);this._noise(.11,.025*loud,f);this._tone(surface==='rubber'?48:65,.09,'sine',.022*loud,0,-22);}
  bounce(loud=1){this._tone(90,.28,'sine',.12*loud,0,-48);this._noise(.18,.07*loud,900);this._tone(310,.11,'triangle',.035*loud,0,-120);}
  landing(loud=1){this._noise(.12,.04*loud,250);this._tone(54,.16,'sine',.07*loud,0,-25);}
  creak(){this._tone(420,.65,'sawtooth',.025,Math.random()*.8-.4,-280);this._noise(.4,.018,600);}
  distantBounce(){this._tone(75,.35,'sine',.028,Math.random()*.8-.4,-38);this._tone(230,.12,'triangle',.01,0,-90);}
  monster(){this._noise(.7,.05,330,Math.random()*.6-.3);this._tone(41,.8,'sawtooth',.08,0,-20);}
  sting(){this._tone(760,.24,'sawtooth',.10,0,-610);this._noise(.28,.1,1400);}
  power(){this._tone(180,.35,'sawtooth',.07,0,300);this._tone(440,.22,'sine',.06,0,300);}
  click(){this._tone(800,.055,'square',.025);}
  door(){this._noise(.6,.06,340);this._tone(95,.55,'sawtooth',.04,0,-35);}
  announcement(){this._tone(390,.22,'sawtooth',.018,0,-120);this._tone(510,.18,'triangle',.014,0,-170);this._noise(.35,.025,1100);}
  setHeartbeat(intensity){
    if(!this.ctx)return;const t=this.ctx.currentTime;
    if(intensity>.15){if(!this.heartbeatGain){this.heartbeatOsc=this.ctx.createOscillator();this.heartbeatGain=this.ctx.createGain();this.heartbeatOsc.type='sine';this.heartbeatOsc.frequency.value=48;this.heartbeatGain.gain.value=0;this.heartbeatOsc.connect(this.heartbeatGain);this.heartbeatGain.connect(this.master);this.heartbeatOsc.start();}
      this.heartbeatGain.gain.setTargetAtTime(.015+intensity*.08,t,.1);
    }else if(this.heartbeatGain)this.heartbeatGain.gain.setTargetAtTime(.0001,t,.3);
    if(intensity>.35&&t-this.lastHeartbeat>.8-intensity*.38){this.lastHeartbeat=t;this._tone(54,.12,'sine',.08*intensity);setTimeout(()=>this._tone(45,.16,'sine',.065*intensity),140);}
  }
  silence(){if(this.master&&this.ctx)this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.08);}
  restore(){if(this.master&&this.ctx)this.master.gain.setTargetAtTime(this.volume,this.ctx.currentTime,.2);}
}
