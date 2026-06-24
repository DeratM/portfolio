import { AudioManager } from './audio.js';
import { Visualizer } from './visualizer.js';

// ─── Grab UI Elements ────────────────────────────────────────────────────────

const canvas = document.getElementById('canvas');
const btnPlay = document.getElementById('btn-play');
const volumeSlider = document.getElementById('volume');
const fileInput = document.getElementById('file-input');
const uploadArea = document.getElementById('upload-area');

// ─── Initialize Core Systems ─────────────────────────────────────────────────

const audio = new AudioManager();
const visualizer = new Visualizer(canvas, audio);

visualizer.init();
visualizer.start(); // Animation loop runs immediately, even before audio loads

// ─── Load Demo Track on Startup ──────────────────────────────────────────────

// This runs on first play button click to satisfy browser autoplay policy
let demoLoaded = false;

function loadDemo() {
  if (demoLoaded) return;
  audio.loadFromURL('./assets/demo.mp3');
  demoLoaded = true;
}

// ─── Play / Pause ────────────────────────────────────────────────────────────

btnPlay.addEventListener('click', () => {
  loadDemo(); // Safe to call multiple times — guards internally

  audio.togglePlayback();
  btnPlay.textContent = audio.isPlaying ? 'Pause' : 'Play';
});

// ─── Volume ──────────────────────────────────────────────────────────────────

volumeSlider.addEventListener('input', (e) => {
  audio.setVolume(parseFloat(e.target.value));
});

// ─── File Upload — Input ─────────────────────────────────────────────────────

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  handleFileLoad(file);
});

// ─── File Upload — Drag and Drop ─────────────────────────────────────────────

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault(); // Required to allow drop
  uploadArea.style.opacity = '1';
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.style.opacity = '';
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.style.opacity = '';

  const file = e.dataTransfer.files[0];
  if (!file || !file.type.startsWith('audio/')) return;
  handleFileLoad(file);
});

// ─── Shared File Handler ─────────────────────────────────────────────────────

function handleFileLoad(file) {
  audio.loadFromFile(file);
  audio.play();
  demoLoaded = true; // Prevent demo from overwriting the uploaded track

  btnPlay.textContent = 'Pause';

  // Show the filename so the user knows it loaded
  uploadArea.querySelector('p').textContent = `▶ ${file.name}`;
}

// ─── Keyboard Shortcuts ──────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault(); // Stop page from scrolling
    btnPlay.click();
  }
});