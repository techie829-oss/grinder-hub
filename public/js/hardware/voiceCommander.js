// Voice Hands-Free Order & Token Command Engine (Hindi, Marathi, Gujarati, English)
// Uses Web Speech API for mill operator hands-free data entry

import { state } from '../state.js';

let recognition = null;
let isListening = false;

export function isVoiceSupported() {
  return typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
}

export function speakText(text, lang = 'hi-IN') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (_) {}
}

const HINDI_NUMBER_WORDS = {
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5,
  'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15,
  'सोलह': 16, 'सत्रह': 17, 'अठारह': 18, 'उन्नीस': 19, 'बीस': 20,
  'पच्चीस': 25, 'तीस': 30, 'पैंतीस': 35, 'चालीस': 40, 'पचास': 50,
  'सौ': 100, 'आधा': 0.5, 'डेढ़': 1.5, 'ढाई': 2.5,
};

export function startVoiceRecognition(options = {}) {
  if (!isVoiceSupported()) {
    throw new Error('Speech Recognition is not supported in this browser.');
  }

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRec();
  recognition.continuous = false;
  recognition.interimResults = false;

  const appLang = (state && state.lang) || 'hi';
  const langMap = { hi: 'hi-IN', mr: 'mr-IN', gu: 'gu-IN', en: 'en-IN' };
  recognition.lang = langMap[appLang] || 'hi-IN';

  isListening = true;
  if (options.onStart) options.onStart();

  recognition.onresult = (event) => {
    isListening = false;
    const transcript = event.results[0][0].transcript.trim();
    if (options.onTranscript) options.onTranscript(transcript);

    const parsed = parseMillVoiceCommand(transcript);
    if (options.onParsed) options.onParsed(parsed, transcript);
  };

  recognition.onerror = (event) => {
    isListening = false;
    if (options.onError) options.onError(event.error);
  };

  recognition.onend = () => {
    isListening = false;
    if (options.onEnd) options.onEnd();
  };

  recognition.start();
}

export function stopVoiceRecognition() {
  if (recognition) {
    try { recognition.stop(); } catch (_) {}
    recognition = null;
  }
  isListening = false;
}

export function startQuickVoiceSearch(onText, onError, onStart) {
  startVoiceRecognition({
    onStart: () => {
      if (onStart) onStart();
    },
    onTranscript: (transcript) => {
      if (onText) onText(transcript);
    },
    onError: (err) => {
      if (onError) onError(err);
    }
  });
}

// Parses voice transcript into { name, village, qty, serviceId, serviceName }
export function parseMillVoiceCommand(rawTranscript) {
  const text = rawTranscript.toLowerCase();
  const services = (state.data && state.data.services) || [];

  let detectedService = null;
  for (const s of services) {
    const sName = s.name.toLowerCase();
    if (text.includes(sName)) {
      detectedService = s;
      break;
    }
  }

  // Fallback grain name keywords
  if (!detectedService) {
    if (text.includes('गेहूं') || text.includes('गेहू') || text.includes('gehu') || text.includes('wheat') || text.includes('atta')) {
      detectedService = services.find((s) => /gehu|wheat|गेहूं/i.test(s.name)) || services[0];
    } else if (text.includes('मक्का') || text.includes('makka') || text.includes('corn')) {
      detectedService = services.find((s) => /makka|corn|मक्का/i.test(s.name));
    } else if (text.includes('चना') || text.includes('chana') || text.includes('besan')) {
      detectedService = services.find((s) => /chana|चना/i.test(s.name));
    } else if (text.includes('बाजरा') || text.includes('bajra')) {
      detectedService = services.find((s) => /bajra|बाजरा/i.test(s.name));
    } else if (text.includes('मसाला') || text.includes('masala')) {
      detectedService = services.find((s) => /masala|मसाला/i.test(s.name));
    } else if (text.includes('तेल') || text.includes('sarson') || text.includes('oil')) {
      detectedService = services.find((s) => /oil|तेल|sarson/i.test(s.name));
    }
  }

  // Detect quantity (e.g. "20 kilo", "25.5 kg", "20 किलो", "पच्चीस किलो")
  let qty = null;
  const numMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kilo|kg|किलो|ग्राम|gram|लीटर|litre)?/);
  if (numMatch) {
    qty = parseFloat(numMatch[1]);
  } else {
    for (const [word, val] of Object.entries(HINDI_NUMBER_WORDS)) {
      if (text.includes(word)) {
        qty = val;
        break;
      }
    }
  }

  // Detect Customer Name & Village (2-Entity match)
  let matchedCustomer = null;
  const customers = (state.data && state.data.customers) || [];

  for (const c of customers) {
    const cName = c.name.toLowerCase();
    const cVillage = (c.village || '').toLowerCase();
    if (text.includes(cName)) {
      if (cVillage && text.includes(cVillage)) {
        matchedCustomer = c;
        break;
      }
      if (!matchedCustomer) matchedCustomer = c;
    }
  }

  let name = matchedCustomer ? matchedCustomer.name : '';
  let village = matchedCustomer ? (matchedCustomer.village || '') : '';

  // If no known customer matched, extract words before quantity or grain
  if (!name) {
    const tokens = rawTranscript.split(/\s+/).filter(Boolean);
    // Typical pattern: "सुरेश रामपुर 20 किलो गेहूं" -> [0]: Suresh, [1]: Rampur
    if (tokens.length >= 2 && !/^\d/.test(tokens[0])) {
      name = tokens[0];
      if (tokens.length >= 3 && !/^\d|kilo|kg|किलो/i.test(tokens[1])) {
        village = tokens[1];
      }
    }
  }

  return {
    raw: rawTranscript,
    name,
    village,
    qty,
    service: detectedService,
    serviceId: detectedService ? detectedService.id : null,
  };
}

