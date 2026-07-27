const btnAntoine = document.getElementById('btnAntoine');
const btnArthur = document.getElementById('btnArthur');
const audioAntoine = document.getElementById('audioAntoine');
const audioArthur = document.getElementById('audioArthur');
const buttons = document.querySelectorAll('.button');
const audioControls = document.getElementById('audioControls');
const slider = document.getElementById('volumeSlider');
const volumeLabel = document.getElementById('volumeLabel');
const statusText = document.getElementById('audioStatus');
const heroContent = document.querySelector('.hero__content');
let backgroundSprites = document.getElementById('backgroundSprites');
const waveCanvas = document.getElementById('waveCanvas');
const canvasCtx = waveCanvas.getContext('2d');

if (!backgroundSprites) {
  backgroundSprites = document.createElement('div');
  backgroundSprites.id = 'backgroundSprites';
  backgroundSprites.className = 'background-sprites';
  backgroundSprites.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(backgroundSprites, document.body.firstChild);
}

let audioContext = null;
let analyser = null;
const sourceNodes = new WeakMap();
let currentAudio = null;
let dataArray = null;
let animationId = null;
let useAnalyser = false;
let fallbackTime = 0;

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  waveCanvas.width = heroContent.clientWidth * ratio;
  waveCanvas.height = heroContent.clientHeight * ratio;
  waveCanvas.style.width = `${heroContent.clientWidth}px`;
  waveCanvas.style.height = `${heroContent.clientHeight}px`;
  canvasCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function showStatus(message) {
  statusText.textContent = message || '';
}

function initAnalyser(audioElement) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.75;
    dataArray = new Uint8Array(analyser.fftSize);
    analyser.connect(audioContext.destination);
  }

  if (!sourceNodes.has(audioElement)) {
    try {
      const source = audioContext.createMediaElementSource(audioElement);
      source.connect(analyser);
      sourceNodes.set(audioElement, source);
      useAnalyser = true;
    } catch (error) {
      console.warn('Analyser non disponible pour le fichier local:', error);
      useAnalyser = false;
    }
  }

  currentAudio = audioElement;
}

function spawnSprites(type) {
  const count = 10;
  for (let i = 0; i < count; i += 1) {
    const sprite = document.createElement('div');
    sprite.className = `floating-sprite ${type}`;
    const img = document.createElement('img');
    img.src = `${type}.png`;
    img.alt = type;
    sprite.appendChild(img);

    const size = 30 + Math.random() * 50;
    sprite.style.width = `${size}px`;
    sprite.style.left = `${Math.random() * 100}%`;
    sprite.style.top = `${Math.random() * 100}%`;
    sprite.style.animationDuration = `${5 + Math.random() * 3}s`;
    sprite.style.animationDelay = `${Math.random() * 0.5}s`;
    sprite.style.transform = `translateY(0) rotate(${Math.random() * 60 - 30}deg)`;
    sprite.style.opacity = '0';

    backgroundSprites.appendChild(sprite);
    setTimeout(() => sprite.remove(), 9200);
  }
}

let spriteInterval = null;

function startSpriteStream(type) {
  if (spriteInterval) {
    clearInterval(spriteInterval);
  }
  spriteInterval = setInterval(() => spawnSprites(type), 1200);
}

function stopSpriteStream() {
  if (spriteInterval) {
    clearInterval(spriteInterval);
    spriteInterval = null;
  }
}

function drawWave() {
  const width = heroContent.clientWidth;
  const height = heroContent.clientHeight;
  canvasCtx.clearRect(0, 0, width, height);
  canvasCtx.fillStyle = 'rgba(20, 15, 60, 0.26)';
  canvasCtx.fillRect(0, 0, width, height);

  const gradient = canvasCtx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, 'rgba(157,115,255,0.55)');
  gradient.addColorStop(0.5, 'rgba(76,199,255,0.85)');
  gradient.addColorStop(1, 'rgba(254,214,102,0.45)');
  canvasCtx.strokeStyle = gradient;
  canvasCtx.lineWidth = 4;
  canvasCtx.beginPath();

  if (useAnalyser && analyser) {
    analyser.getByteTimeDomainData(dataArray);
    const sliceWidth = width / dataArray.length;
    let x = 0;
    for (let i = 0; i < dataArray.length; i += 1) {
      const v = dataArray[i] / 128.0;
      const y = (v * height) / 2;
      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }
      x += sliceWidth;
    }
  } else {
    fallbackTime += 0.03;
    const amplitude = 0.24 + 0.18 * Math.sin(fallbackTime * 2.2);
    const frequency = 2.2;
    const base = height / 2;
    const length = 96;
    for (let i = 0; i <= length; i += 1) {
      const x = (i / length) * width;
      const y = base + Math.sin((i / length) * Math.PI * frequency + fallbackTime) * height * amplitude * (0.6 + 0.4 * Math.cos(i / length * Math.PI));
      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }
    }
  }

  canvasCtx.stroke();
  canvasCtx.globalAlpha = 0.18;
  canvasCtx.fillStyle = 'rgba(76,199,255,0.2)';
  canvasCtx.lineTo(width, height);
  canvasCtx.lineTo(0, height);
  canvasCtx.closePath();
  canvasCtx.fill();
  canvasCtx.globalAlpha = 1;

  animationId = requestAnimationFrame(drawWave);
}

function updateVolumeLabel(value) {
  const percentage = Math.round(Number(value) * 100);
  volumeLabel.textContent = `${percentage}%`;
}

function stopWave() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function updateAudioControlsVisibility(visible) {
  if (visible) {
    audioControls.classList.add('visible');
    audioControls.setAttribute('aria-hidden', 'false');
  } else {
    audioControls.classList.remove('visible');
    audioControls.setAttribute('aria-hidden', 'true');
  }
}

function playAudio(audioElement) {
  if (!audioElement) return;
  buttons.forEach(button => button.classList.remove('active'));
  audioAntoine.pause();
  audioArthur.pause();
  audioAntoine.currentTime = 0;
  audioArthur.currentTime = 0;

  if (!audioContext || currentAudio !== audioElement) {
    initAnalyser(audioElement);
  }

  const volume = parseFloat(slider.value);
  audioElement.volume = volume;
  updateVolumeLabel(volume);
  showStatus('');

  audioElement.play().catch((error) => {
    console.warn('Audio non disponible ou lecture bloquée', error);
    showStatus('Impossible de lire le fichier audio. Vérifie que le fichier existe et que le navigateur autorise la lecture.');
  });

  updateAudioControlsVisibility(true);
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }
  stopWave();
  drawWave();
}

btnAntoine.addEventListener('click', () => {
  playAudio(audioAntoine);
  btnAntoine.classList.add('active');
  btnArthur.classList.remove('active');
  startSpriteStream('antoine');
});

btnArthur.addEventListener('click', () => {
  playAudio(audioArthur);
  btnArthur.classList.add('active');
  btnAntoine.classList.remove('active');
  startSpriteStream('arthur');
});

audioAntoine.addEventListener('ended', () => {
  updateAudioControlsVisibility(false);
  stopSpriteStream();
});
audioArthur.addEventListener('ended', () => {
  updateAudioControlsVisibility(false);
  stopSpriteStream();
});

audioAntoine.addEventListener('error', () => showStatus('Fichier FF.mp3 introuvable ou bloqué.'));
audioArthur.addEventListener('error', () => showStatus('Fichier test.mp3 introuvable ou bloqué.'));

slider.addEventListener('input', () => {
  const activeAudio = currentAudio;
  if (activeAudio) {
    activeAudio.volume = parseFloat(slider.value);
  }
  updateVolumeLabel(slider.value);
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('.button, .title, .subtitle').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(18px)';
  observer.observe(el);
});

const animateGradient = () => {
  document.documentElement.style.setProperty('--tone-1', `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`);
};

setInterval(() => {
  document.documentElement.classList.toggle('pulse');
}, 5200);

window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', () => {
  resizeCanvas();
  setTimeout(() => document.body.classList.add('loaded'), 200);
});
