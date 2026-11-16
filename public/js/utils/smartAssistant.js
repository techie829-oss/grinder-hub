// Smart Assistant (डिजिटल मुंशी) NLP & Voice Parser
// Extracts Customer, Village, Action (उधार/जमा/खर्चा), Commodity, Weight, and Amount
import { state } from '../state.js';
import { isPhoneticMatch } from './phonetic.js';

export const EXPENSE_KEYWORDS = {
  diesel: ['डीजल', 'डीज़ल', 'diesel', 'tel'],
  electricity: ['बिजली', 'लाइट', 'light', 'bijli', 'power'],
  labor: ['मजदूरी', 'मज़दूरी', 'लेबर', 'labor', 'palledari', 'पल्लेदारी'],
  tea: ['चाय', 'नाश्ता', 'समोसा', 'tea', 'nasta', 'chay'],
  maintenance: ['मरम्मत', 'ग्रीस', 'बेल्ट', 'पार्ट्स', 'service', 'grease', 'repair'],
  other: ['खर्चा', 'खर्च', 'expense', 'other']
};

export function parseSmartQuery(rawText) {
  if (!rawText || !rawText.trim()) return null;
  const text = rawText.trim();
  const lower = text.toLowerCase();

  const customers = state.data?.customers || [];

  // 1. Check for Shop Expense keywords first
  let detectedExpenseCat = null;
  for (const [cat, words] of Object.entries(EXPENSE_KEYWORDS)) {
    if (words.some((w) => lower.includes(w.toLowerCase()))) {
      detectedExpenseCat = cat;
      break;
    }
  }

  // 2. Extract Numbers (Amount and/or Weight)
  // e.g. "1kg", "1.5 kg", "500", "₹500", "500 रुपया"
  let weightKg = null;
  let weightUnit = 'kg';
  const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|किलो|किग्रा|ग्राम|कट्टा|बोरी|क्विंटल)/i);
  if (weightMatch) {
    weightKg = parseFloat(weightMatch[1]);
    if (/बोरी|कट्टा/i.test(weightMatch[0])) weightUnit = 'बोरी';
    else if (/क्विंटल/i.test(weightMatch[0])) weightUnit = 'क्विंटल';
    else if (/ग्राम/i.test(weightMatch[0])) weightUnit = 'ग्राम';
  }

  // Extract amount in Rupees (numbers without kg/unit, or with ₹/रुपये/रु)
  let amount = null;
  const rupeeMatch = text.match(/(?:₹|रुपये|रु|rs\.?)\s*(\d+(?:\.\d+)?)/i) ||
                     text.match(/(\d+(?:\.\d+)?)\s*(?:₹|रुपये|रुपया|रु|rs)/i);
  if (rupeeMatch) {
    amount = parseFloat(rupeeMatch[1]);
  } else {
    // Look for standalone numbers that aren't the weight
    const numMatches = Array.from(text.matchAll(/\b(\d+(?:\.\d+)?)\b/g));
    for (const m of numMatches) {
      const val = parseFloat(m[1]);
      if (val !== weightKg) {
        amount = val;
        break;
      }
    }
  }

  // If detected expense and has amount (e.g. "डीजल 500" or "चाय 40")
  if (detectedExpenseCat && (amount || !text.includes('उधार'))) {
    return {
      type: 'expense',
      category: detectedExpenseCat,
      amount: amount || 0,
      note: text,
      rawText: text
    };
  }

  // 3. Customer Matching: Check for Customer Name and Village
  // Split query into words to find customer name and village
  let matchedCustomer = null;
  let matchedVillage = null;

  // First try direct multi-word match (e.g. "सतीश सहजनी")
  for (const c of customers) {
    const cName = (c.name || '').replace(/\(.*?\)/g, '').trim();
    const cVillage = (c.village || '').trim();

    const nameMatch = isPhoneticMatch(cName, text) || lower.includes(cName.toLowerCase());
    const villageMatch = cVillage ? (isPhoneticMatch(cVillage, text) || lower.includes(cVillage.toLowerCase())) : false;

    if (nameMatch && villageMatch) {
      matchedCustomer = c;
      matchedVillage = cVillage;
      break;
    } else if (nameMatch && !matchedCustomer) {
      matchedCustomer = c;
    }
  }

  // If customer found:
  if (matchedCustomer) {
    const isDebit = /उधार|दिया|दिये|दे दिया|ले गए|ले गया|पेशगी|काटेंगे|बाकी|खाते में/i.test(text);
    const isCredit = /जमा|मिला|मिले|भुगतान|दिया गया|चुकाया|वसूल/i.test(text);

    // If only name & village or no specific action, open customer profile
    if (!isDebit && !isCredit && !weightKg && !amount) {
      return {
        type: 'open_customer',
        customer: matchedCustomer,
        rawText: text
      };
    }

    // Detect item name
    let itemName = '';
    if (/आटा|atta/i.test(text)) itemName = 'आटा';
    else if (/गेहूं|गेहूँ|wheat/i.test(text)) itemName = 'गेहूं';
    else if (/सरसों|mustard/i.test(text)) itemName = 'सरसों';
    else if (/चोकर|choker/i.test(text)) itemName = 'चोकर';
    else if (/तेल|oil/i.test(text)) itemName = 'तेल';
    else if (/खली/i.test(text)) itemName = 'खली';
    else if (isDebit) itemName = 'उधार';
    else itemName = 'जमा';

    return {
      type: isDebit ? 'customer_debit' : (isCredit ? 'customer_credit' : (weightKg ? 'customer_debit' : 'open_customer')),
      customer: matchedCustomer,
      itemName,
      weightKg,
      unit: weightUnit,
      amount: amount || 0,
      note: text,
      rawText: text
    };
  }

  // Fallback: If no customer found but contains expense words
  if (detectedExpenseCat) {
    return {
      type: 'expense',
      category: detectedExpenseCat,
      amount: amount || 0,
      note: text,
      rawText: text
    };
  }

  return {
    type: 'unknown',
    rawText: text
  };
}
