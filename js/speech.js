const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SR ? new SR() : null;

const INITIAL_SILENCE_MS = 4000;
const POST_SPEECH_SILENCE_MS = 2000;

if (recognition) {
  recognition.lang = 'he-IL';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
}

let activeHandlers = null;
let isRecognizing = false;
let silenceTimer = null;
let accumulated = '';

function clearSilenceTimer() {
  if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
}

function scheduleSilence(ms) {
  clearSilenceTimer();
  silenceTimer = setTimeout(() => {
    try { recognition.stop(); } catch {}
  }, ms);
}

if (recognition) {
  recognition.addEventListener('start', () => {
    accumulated = '';
    scheduleSilence(INITIAL_SILENCE_MS);
  });
  recognition.addEventListener('result', (ev) => {
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i];
      if (r.isFinal) accumulated += ' ' + r[0].transcript;
    }
    scheduleSilence(POST_SPEECH_SILENCE_MS);
  });
  recognition.addEventListener('error', (ev) => {
    clearSilenceTimer();
    if (activeHandlers?.onError) activeHandlers.onError(ev.error);
  });
  recognition.addEventListener('end', () => {
    clearSilenceTimer();
    isRecognizing = false;
    const text = accumulated.trim();
    accumulated = '';
    if (text && activeHandlers?.onResult) activeHandlers.onResult(text);
    if (activeHandlers?.onEnd) activeHandlers.onEnd();
  });
}

export function isSupported() {
  return !!recognition && typeof window.speechSynthesis !== 'undefined';
}

export function startRecognition(handlers) {
  if (!recognition) return false;
  activeHandlers = handlers;
  if (isRecognizing) {
    try { recognition.stop(); } catch {}
  }
  try {
    recognition.start();
    isRecognizing = true;
    return true;
  } catch {
    return false;
  }
}

export function stopRecognition() {
  if (!recognition || !isRecognizing) return;
  try { recognition.stop(); } catch {}
}

let speechQueue = [];
let speechBusy = false;

export function speak(text, opts = {}) {
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'he-IL';
    u.rate = opts.rate ?? 0.9;
    u.pitch = opts.pitch ?? 1.1;
    u.volume = opts.volume ?? 1.0;
    speechQueue.push({ utterance: u, resolve });
    drain();
  });
}

function drain() {
  if (speechBusy || speechQueue.length === 0) return;
  speechBusy = true;
  const { utterance, resolve } = speechQueue.shift();
  utterance.onend = () => { speechBusy = false; resolve(); drain(); };
  utterance.onerror = () => { speechBusy = false; resolve(); drain(); };
  window.speechSynthesis.speak(utterance);
}

export function cancelSpeech() {
  speechQueue = [];
  speechBusy = false;
  if (typeof window.speechSynthesis !== 'undefined') {
    window.speechSynthesis.cancel();
  }
}

export async function speakSequence(lines) {
  for (const line of lines) await speak(line);
}
