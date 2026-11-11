// Bilingual Phonetic Transliteration & Name Matching Engine
// Seamless bridge between Hindi (Devanagari) and English (Latin/Hinglish)

const COMMON_INDIAN_WORDS = {
  // Grains & Commodities
  'gehu': 'गेहूं', 'gehun': 'गेहूं', 'wheat': 'गेहूं', 'atta': 'आटा',
  'makka': 'मक्का', 'corn': 'मक्का', 'makai': 'मक्का',
  'sarso': 'सरसों', 'sarson': 'सरसों', 'mustard': 'सरसों', 'tel': 'तेल', 'oil': 'तेल',
  'chana': 'चना', 'besan': 'बेसन',
  'bajra': 'बाजरा', 'jowar': 'ज्वार', 'dhan': 'धान', 'rice': 'चावल', 'chawal': 'चावल',
  'masala': 'मसाला', 'mirch': 'मिर्च', 'dhaniya': 'धनिया', 'haldi': 'हल्दी',
  'khali': 'खली', 'choker': 'चोकर', 'pashu aahar': 'पशु आहार',
  'kilo': 'किलो', 'kg': 'किलो', 'gram': 'ग्राम', 'litre': 'लीटर', 'ltr': 'लीटर',

  // Common Names & Surnames
  'ramesh': 'रमेश', 'dinesh': 'दिनेश', 'suresh': 'सुरेश', 'mahesh': 'महेश',
  'rajesh': 'राजेश', 'mukesh': 'मुकेश', 'rakesh': 'राकेश', 'mohan': 'मोहन',
  'sohan': 'सोहन', 'rohit': 'रोहित', 'rahul': 'राहुल', 'amit': 'अमित',
  'anil': 'अनिल', 'sunil': 'सुनील', 'sanjay': 'संजय', 'ajay': 'अजय',
  'vijay': 'विजय', 'kamal': 'कमल', 'manoj': 'मनोज', 'vinod': 'विनोद',
  'pramod': 'प्रमोद', 'ashok': 'अशोक', 'sonu': 'सोनू', 'monu': 'मोनू',
  'bablu': 'बबलू', 'pappu': 'पप्पू', 'deepak': 'दीपक', 'pankaj': 'पंकज',
  'vikas': 'विकास', 'ravi': 'रवि', 'shyam': 'श्याम', 'ram': 'राम',
  'kishor': 'किशोर', 'santosh': 'संतोष', 'satish': 'सतीश', 'harish': 'हरीश',
  'sachin': 'सचिन', 'suraj': 'सूरज', 'chandan': 'चंदन', 'arun': 'अरुण',
  'kumar': 'कुमार', 'singh': 'सिंह', 'sharma': 'शर्मा', 'verma': 'वर्मा',
  'gupta': 'गुप्ता', 'yadav': 'यादव', 'tiwari': 'तिवारी', 'pandey': 'पांडेय',
  'mishra': 'मिश्रा', 'shukla': 'शुक्ला', 'patel': 'पटेल', 'chaudhary': 'चौधरी',
  'pal': 'पाल', 'maurya': 'मौर्या', 'kushwaha': 'कुशवाहा', 'devi': 'देवी',
  'lal': 'लाल', 'prasad': 'प्रसाद', 'chand': 'चंद', 'das': 'दास',

  // Common Towns / Villages
  'rampur': 'रामपुर', 'kanpur': 'कानपुर', 'nagpur': 'नागपुर', 'jaipur': 'जयपुर',
  'raipur': 'रायपुर', 'fatehpur': 'फतेहपुर', 'mirzapur': 'मिर्जापुर', 'shahpur': 'शाहपुर',
  'kalyanpur': 'कल्याणपुर', 'shivpur': 'शिवपुर', 'mohanpur': 'मोहनपुर', 'kishunpur': 'किशुनपुर'
};

const DEVA_VOWELS = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'an', 'अः': 'ah'
};

const DEVA_CONSONANTS = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'क्ष': 'ksh', 'त्र': 'tr', 'ज्ञ': 'gy',
  'ड़': 'r', 'ढ़': 'rh', 'फ़': 'f', 'ज़': 'z'
};

const DEVA_MATRAS = {
  'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'ृ': 'ri',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ँ': 'n', 'ः': 'h'
};

// Converts Devanagari script to Latin Hinglish
export function devaToLatin(str) {
  if (!str) return '';
  let out = '';
  const chars = Array.from(String(str));
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];
    if (DEVA_VOWELS[ch]) {
      out += DEVA_VOWELS[ch];
    } else if (DEVA_CONSONANTS[ch]) {
      const c = DEVA_CONSONANTS[ch];
      if (next === '्') {
        out += c;
        i++; // skip virama
      } else if (next && DEVA_MATRAS[next]) {
        out += c + DEVA_MATRAS[next];
        i++; // skip matra
      } else {
        const isEnd = !next || next === ' ' || /[\s\p{P}]/u.test(next);
        out += isEnd ? c : c + 'a';
      }
    } else if (DEVA_MATRAS[ch]) {
      out += DEVA_MATRAS[ch];
    } else {
      out += ch;
    }
  }
  return out;
}

const LATIN_TO_DEVA_MULTI = [
  { l: 'chh', d: 'छ' }, { l: 'kh', d: 'ख' }, { l: 'gh', d: 'घ' },
  { l: 'ch', d: 'च' }, { l: 'jh', d: 'झ' }, { l: 'th', d: 'थ' },
  { l: 'dh', d: 'ध' }, { l: 'ph', d: 'फ' }, { l: 'bh', d: 'भ' },
  { l: 'sh', d: 'श' }, { l: 'gy', d: 'ज्ञ' }, { l: 'tr', d: 'त्र' },
  { l: 'ks', d: 'क्ष' }, { l: 'aa', iv: 'आ', m: 'ा' },
  { l: 'ee', iv: 'ई', m: 'ी' }, { l: 'oo', iv: 'ऊ', m: 'ू' },
  { l: 'ai', iv: 'ऐ', m: 'ै' }, { l: 'au', iv: 'औ', m: 'ौ' },
];

const LATIN_TO_DEVA_SINGLE = [
  { l: 'k', d: 'क' }, { l: 'g', d: 'ग' }, { l: 'j', d: 'ज' }, { l: 't', d: 'त' },
  { l: 'd', d: 'द' }, { l: 'n', d: 'न' }, { l: 'p', d: 'प' }, { l: 'b', d: 'ब' },
  { l: 'm', d: 'म' }, { l: 'y', d: 'य' }, { l: 'r', d: 'र' }, { l: 'l', d: 'ल' },
  { l: 'v', d: 'व' }, { l: 'w', d: 'व' }, { l: 's', d: 'स' }, { l: 'h', d: 'ह' },
  { l: 'f', d: 'फ' }, { l: 'z', d: 'ज़' },
  { l: 'a', iv: 'अ', m: '' }, { l: 'i', iv: 'इ', m: 'ि' }, { l: 'u', iv: 'उ', m: 'ु' },
  { l: 'e', iv: 'ए', m: 'े' }, { l: 'o', iv: 'ओ', m: 'ो' },
];

// Converts Latin English input to Hindi Devanagari
export function latinToDeva(input) {
  if (!input) return '';
  const s = String(input).toLowerCase().trim();

  // If already Devanagari, return as is
  if (/[\u0900-\u097F]/.test(s)) return input;

  // Split words and check dictionary first
  const words = s.split(/\s+/);
  return words.map((w) => {
    if (COMMON_INDIAN_WORDS[w]) return COMMON_INDIAN_WORDS[w];

    // Algorithmic fallback
    let out = '';
    let i = 0;
    let lastWasConsonant = false;

    while (i < w.length) {
      let matched = null;
      for (const item of LATIN_TO_DEVA_MULTI) {
        if (w.startsWith(item.l, i)) {
          matched = item;
          break;
        }
      }

      if (matched) {
        if (matched.m !== undefined) {
          out += (lastWasConsonant ? matched.m : matched.iv);
          lastWasConsonant = false;
        } else {
          out += matched.d;
          lastWasConsonant = true;
        }
        i += matched.l.length;
        continue;
      }

      for (const item of LATIN_TO_DEVA_SINGLE) {
        if (w.startsWith(item.l, i)) {
          matched = item;
          break;
        }
      }

      if (matched) {
        if (matched.m !== undefined) {
          const isFinalA = matched.l === 'a' && i === w.length - 1;
          if (matched.l === 'a' && lastWasConsonant && !isFinalA) {
            // inherent schwa
          } else if (isFinalA && lastWasConsonant) {
            out += 'ा'; // final 'a' in names like Gupta, Sharma, Chana is 'aa' matra
          } else {
            out += (lastWasConsonant ? matched.m : matched.iv);
          }
          lastWasConsonant = false;
        } else {
          out += matched.d;
          lastWasConsonant = true;
        }
        i += matched.l.length;
        continue;
      }

      out += w[i];
      lastWasConsonant = false;
      i++;
    }
    return out;
  }).join(' ');
}

// Generates a canonical phonetic skeleton key for fuzzy comparison
export function normalizePhoneticKey(str) {
  if (!str) return '';
  let s = devaToLatin(String(str)).toLowerCase();
  s = s.replace(/w/g, 'v')
       .replace(/ee/g, 'i')
       .replace(/oo/g, 'u')
       .replace(/aa/g, 'a')
       .replace(/sh/g, 's')
       .replace(/z/g, 'j')
       .replace(/ph/g, 'f')
       .replace(/bh/g, 'b')
       .replace(/dh/g, 'd')
       .replace(/th/g, 't')
       .replace(/kh/g, 'k')
       .replace(/gh/g, 'g')
       .replace(/ch/g, 'c')
       .replace(/[^a-z0-9]/g, '')
       .replace(/(.)\1+/g, '$1');
  return s;
}

// Vowel-free consonant skeleton for village and name variations (e.g. rampur == ramapur)
export function consonantSkeleton(str) {
  return normalizePhoneticKey(str).replace(/[aeiou]/g, '');
}

// Universal bilingual matcher (Devanagari <-> Latin <-> Phonetic)
export function isPhoneticMatch(target, query) {
  if (!target || !query) return false;
  const t = String(target).trim().toLowerCase();
  const q = String(query).trim().toLowerCase();
  if (!q) return true;

  // 1. Direct exact or substring match
  if (t.includes(q) || q.includes(t)) return true;

  // 2. Transliterated Latin string match
  const tLatin = devaToLatin(t).toLowerCase();
  const qLatin = devaToLatin(q).toLowerCase();
  if (tLatin.includes(q) || tLatin.includes(qLatin)) return true;
  if (t.includes(qLatin)) return true;

  // 3. Reverse Latin-to-Deva match
  const qDeva = latinToDeva(q);
  if (qDeva && t.includes(qDeva)) return true;

  // 4. Phonetic normalized key match (handles sh/s, v/w, ee/i, etc.)
  const tNorm = normalizePhoneticKey(t);
  const qNorm = normalizePhoneticKey(q);
  if (tNorm.includes(qNorm) || qNorm.includes(tNorm)) return true;

  // 5. Consonant skeleton match for schwa-deleted variations (rampur <-> ramapur)
  const tSkel = consonantSkeleton(t);
  const qSkel = consonantSkeleton(q);
  if (qSkel.length >= 2 && (tSkel.includes(qSkel) || qSkel.includes(tSkel))) return true;

  return false;
}
