export class AudioManager {
  constructor() {
    this.context = null;      // The Web Audio context (the engine)
    this.analyser = null;     // The node that reads frequency data
    this.source = null;       // The current audio source node
    this.gainNode = null;     // Controls volume
    this.dataArray = null;    // The live frequency data array
    this.audioElement = null; // The HTML audio element
    this.isPlaying = false;
  }

  // Call this once on first user interaction (browser requires it)
  init() {
    if (this.context) return; // Already initialized

    this.context = new (window.AudioContext || window.webkitAudioContext)();

    // Analyser node — this is what reads the frequencies
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 256; // 256 = 128 frequency buckets
    // Higher = more detail, but more expensive. 256 is a good balance.

    // Gain node — sits between source and analyser, controls volume
    this.gainNode = this.context.createGain();
    this.gainNode.gain.value = 0.8;

    // Wire up: source → gain → analyser → speakers
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.context.destination);

    // Create the array that will hold frequency data each frame
    // Size is always fftSize / 2
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  // Load a track from a URL (used for the preloaded demo)
  loadFromURL(url) {
    this.init();
    this._setupAudioElement(url);
  }

  // Load a track from a user-uploaded File object
  loadFromFile(file) {
    this.init();
    const url = URL.createObjectURL(file);
    this._setupAudioElement(url);
  }

  // Internal — creates the audio element and connects it to the graph
  _setupAudioElement(url) {
    // Clean up previous source if one exists
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
    }

    this.audioElement = new Audio();
    this.audioElement.src = url;
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.loop = true;

    // Connect the audio element into the Web Audio graph
    this.source = this.context.createMediaElementSource(this.audioElement);
    this.source.connect(this.gainNode);

    this.isPlaying = false;
  }

  play() {
    if (!this.audioElement) return;
    if (this.context.state === 'suspended') this.context.resume();
    this.audioElement.play();
    this.isPlaying = true;
  }

  pause() {
    if (!this.audioElement) return;
    this.audioElement.pause();
    this.isPlaying = false;
  }

  togglePlayback() {
    this.isPlaying ? this.pause() : this.play();
  }

  setVolume(value) {
    if (this.gainNode) {
      this.gainNode.gain.value = value;
    }
  }

  // Called every frame from the visualizer — fills dataArray with fresh data
  getFrequencyData() {
    if (!this.analyser) return null;
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  // Returns a single 0–1 value representing overall loudness
  // Useful for driving the scale/pulse of the 3D object
  getAverageFrequency() {
    const data = this.getFrequencyData();
    if (!data) return 0;
    const sum = data.reduce((a, b) => a + b, 0);
    return sum / data.length / 255; // Normalize to 0–1
  }

  // Returns bass (low freq) energy specifically — good for beat detection
  getBassFrequency() {
    const data = this.getFrequencyData();
    if (!data) return 0;
    // Bass lives in roughly the first 10% of frequency buckets
    const bassSlice = data.slice(0, Math.floor(data.length * 0.1));
    const sum = bassSlice.reduce((a, b) => a + b, 0);
    return sum / bassSlice.length / 255;
  }
}