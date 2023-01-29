class Music {
  
  constructor() {}
  
  async init() {
    await Tone.start();
    const meter = new Tone.Meter();
    const gain = new Tone.Gain(.2);
    gain.connect(Tone.Destination);
    const noiseGain = new Tone.Gain(.1);
    noiseGain.connect(meter);
    meter.connect(gain);
    this.digitalArt = document.querySelector('digital-art');
    const noiseSynth = new Tone.NoiseSynth().connect(noiseGain);
    const synth = new Tone.FMSynth().connect(meter);
    const synth2 = new Tone.AMSynth().connect(meter);
    const seq = new Tone.Sequence((time, note) => {
      synth.triggerAttackRelease(note, "1n", time);
    }, ["C2", ["D#2", "D2"], "G#2", "G2"], 2);
    const rythm = new Tone.Sequence((time, note) => {
      noiseSynth.triggerAttackRelease("16n", time);
    }, ['x', 'x', 'x', 'x'], .25);
    const seq2 = new Tone.Sequence((time, note) => {
      synth2.triggerAttackRelease(note, "8n", time);
    }, ['C3', 'D#3', 'G3', 'C4', 'G4', 'C4', 'G3', 'D#3'], .25)

    rythm.start(0);
    seq.start(0); // 4
    seq2.start(0); // 20
    
    this.noiseSynth = noiseSynth;
    this.synth = synth;
    this.synth2 = synth2;
    this.seq = seq;
    this.seq2 = seq2;
    this.rythm = rythm;
    this.meter = meter;
    this.meterTimer = -1;
  }
  
  get state() {
    return Tone.Transport.state;
  }
  
  async start() {
    if (!this.synth) {
      await this.init();
    }
    Tone.Transport.start('+0', 0);
    this.meterTimer = setInterval(() => {
      if (this.digitalArt) {
        this.digitalArt.setAttribute('meter', this.meter.getValue());
      }
      
    }, 10)
  }
  
  stop() {
    Tone.Transport.stop();
    clearInterval(this.meterTimer);
    if (this.digitalArt) {
      this.digitalArt.setAttribute('meter', '0');
    }
    this.meterTimer = -1;
  }
}

class DigitalArt extends HTMLElement {
  
  constructor() {
    super();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.uniforms = {};
    this.clock = null;
    this.onResize = this.onResize.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.animate = this.animate.bind(this);
    this.resources = [];
    this.frag = this.querySelector('script[type=frag]').textContent.trim();
    this.vert = this.querySelector('script[type=vert]').textContent.trim();
  }
  
  static register() {
    customElements.define("digital-art", DigitalArt);
  }
  
  static get observedAttributes() {
    return ['meter'];
  }
  
  get meter() {
    return parseInt(this.getAttribute('meter'), 10);
  }
  
  attributeChangedCallback(name, oldValue, newValue) { 
    if (name === 'meter') {
      this.uniforms.meter.value = parseInt(newValue, 10)
    }
  }
  
  
  connectedCallback() {
    if (! this.renderer) {
      this.setup();      
    }
  }
  
  disconnectedCallback() {
    this.dispose();
  }
  
  setup() {
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(1);
    this.appendChild(this.renderer.domElement);
    this.clock = new THREE.Clock();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    this.uniforms = {
      time: { value: 1.0 },
      resolution: { value: new THREE.Vector2(427,842) },
      meter: { value: 0. },
      mouseX: { value: 0. },
      mouseY: { value: 0. }
    }
    
    const geometry = new THREE.PlaneBufferGeometry(2, 2);
    
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: this.vert,
      fragmentShader: this.frag,
    });
    this.resources.push(geometry, material);

    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
    
    this.onResize();
    window.addEventListener('resize', this.onResize, false); 
    this.frame = requestAnimationFrame(this.animate);
    
    window.addEventListener('mousemove', this.onMouseMove, false);
    
    
  }
  
  onMouseMove(e) {
    this.uniforms.mouseY.value = e.clientY / innerHeight - .5;
    this.uniforms.mouseX.value = e.clientX / innerWidth - .5;
  }
  
  onResize() {
    const { renderer, uniforms } = this;
    const width = this.clientWidth;
    const height = this.clientHeight;
    renderer.setSize(width, height);
    uniforms.resolution.value.x = width;
    uniforms.resolution.value.y = height;
  }
  
  animate(timestamp) {
    const { animate, uniforms, renderer, clock, scene, camera } = this;
    this.frame = requestAnimationFrame(animate);
    uniforms.time.value = clock.getElapsedTime();
    renderer.render(scene, camera);
  }
  
  cleanupScene(sceneOrGroup) {
    if (!sceneOrGroup) {
      sceneOrGroup = this.scene;
    }
    for (let item of [...sceneOrGroup.children]) {
      if (item.type === 'group') {
        this.cleanupScene(item);
      }
      sceneOrGroup.remove(item);
    }
  }
  
  dispose() {
    cancelAnimationFrame(this.frame);
    window.removeEventListener('resize', this.onResize, false);
    window.removeEventListener('mousemove', this.onMouseMove, false);
    this.cleanupScene();
    const removedResources = this.resources.splice(0, this.resources.length);
    for (let item of removedResources) {
      if (typeof item.dispose === 'function') {
        item.dispose();
      }
    }
    this.removeChild(this.renderer.domElement);
    this.renderer.dispose();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.uniforms = {};
    this.clock = null;
  }
}

DigitalArt.register();
const music = new Music();
const button = document.querySelector('button');


button.addEventListener('click', async () => {
  if (music.state == "started") {
		music.stop();
		button.textContent = "Restart Music";
	} else {
    music.start();
    button.textContent = "Stop Music"
  }
})