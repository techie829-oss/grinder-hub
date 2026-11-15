// Bilingual Phonetic Transliteration & Name Matching Engine (Cloudflare Worker Backend)
export {
  devaToLatin,
  latinToDeva,
  normalizePhoneticKey,
  consonantSkeleton,
  isPhoneticMatch,
  canonicalNameKey,
  toBilingualName,
  DEVA_TO_LATIN_NAME_MAP
} from '../../public/js/utils/phonetic.js';
