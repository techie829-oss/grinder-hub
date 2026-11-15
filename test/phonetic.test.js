import test from 'node:test';
import assert from 'node:assert/strict';
import {
  devaToLatin,
  latinToDeva,
  normalizePhoneticKey,
  isPhoneticMatch
} from '../public/js/utils/phonetic.js';

test('Bilingual Phonetic Suite: Devanagari to Latin Transliteration', () => {
  assert.equal(devaToLatin('दिनेश'), 'dinesh');
  assert.equal(devaToLatin('रमेश'), 'ramesh');
  assert.equal(devaToLatin('सुरेश'), 'suresh');
  assert.equal(devaToLatin('महेश'), 'mahesh');
  assert.equal(devaToLatin('मोहन'), 'mohan');
  assert.equal(devaToLatin('अमित'), 'amit');
});

test('Bilingual Phonetic Suite: Latin to Devanagari Transliteration', () => {
  assert.equal(latinToDeva('dinesh'), 'दिनेश');
  assert.equal(latinToDeva('ramesh'), 'रमेश');
  assert.equal(latinToDeva('suresh'), 'सुरेश');
  assert.equal(latinToDeva('rampur'), 'रामपुर');
  assert.equal(latinToDeva('gehu'), 'गेहूं');
  assert.equal(latinToDeva('dinesh kumar'), 'दिनेश कुमार');
});

test('Bilingual Phonetic Suite: Cross-Language Customer Matching', () => {
  // English search for Hindi saved customer
  assert.equal(isPhoneticMatch('दिनेश कुमार', 'dinesh'), true);
  assert.equal(isPhoneticMatch('रमेश', 'ramesh'), true);
  assert.equal(isPhoneticMatch('रामपुर', 'rampur'), true);
  assert.equal(isPhoneticMatch('सुरेश', 'sur'), true);

  // Hindi search for English saved customer
  assert.equal(isPhoneticMatch('Dinesh Kumar', 'दिनेश'), true);
  assert.equal(isPhoneticMatch('Ramesh', 'रमेश'), true);
  assert.equal(isPhoneticMatch('Rampur', 'रामपुर'), true);

  // Partial / prefix matching
  assert.equal(isPhoneticMatch('दिनेश कुमार', 'din'), true);
  assert.equal(isPhoneticMatch('रमेश यादव', 'ram'), true);

  // Phone number matching
  assert.equal(isPhoneticMatch('9876543210', '9876'), true);
});

test('Customer Disambiguation Safety Suite: Same Village Duplicate Name Protection', () => {
  const existingCustomers = [
    { id: 'c1', name: 'दिनेश कुमार', village: 'रामपुर', phone: '9876543210', balancePaise: 15000 },
    { id: 'c2', name: 'दिनेश कुमार', village: 'रामपुर', phone: '9876500000', balancePaise: 0 },
    { id: 'c3', name: 'दिनेश कुमार', village: 'शिवपुर', phone: '', balancePaise: 5000 },
  ];

  // 1. Search by name & village returns multiple candidates (must NOT pick c1 or c2 blindly)
  const matches = existingCustomers.filter((c) => {
    return isPhoneticMatch(c.name, 'dinesh') && isPhoneticMatch(c.village, 'rampur');
  });
  assert.equal(matches.length, 2);
  assert.equal(matches[0].id, 'c1');
  assert.equal(matches[1].id, 'c2');

  // 2. Strict Phone Conflict Rule: If new customer has phone 9876511111, neither c1 nor c2 should match
  const newPhone = '9876511111';
  const phoneConflictFiltered = matches.filter((c) => {
    if (c.phone && c.phone !== newPhone) return false;
    return true;
  });
  assert.equal(phoneConflictFiltered.length, 0, 'Different phone number must never auto-merge into another person with same name');

  // 3. Exact Phone Match Rule: If phone matches c1, it resolves uniquely to c1
  const c1PhoneMatches = matches.filter((c) => c.phone === '9876543210');
  assert.equal(c1PhoneMatches.length, 1);
  assert.equal(c1PhoneMatches[0].id, 'c1');
});

test('Bilingual Customer Name & Cross-Script Duplicate Collision Suite', async () => {
  const { toBilingualName, canonicalNameKey } = await import('../src/utils/phonetic.js');
  const { normName } = await import('../src/utils/helpers.js');

  // 1. Automatic Bilingual Formatter Tests
  assert.equal(toBilingualName('Shahnawaz'), 'शाहनवाज़ (Shahnawaz)');
  assert.equal(toBilingualName('ganeshi'), 'गणेशी (Ganeshi)');
  assert.equal(toBilingualName('इंद्रजीत मौर्य'), 'इंद्रजीत मौर्य (Indrajeet Maurya)');
  assert.equal(toBilingualName('रामसागर'), 'रामसागर (Ramsagar)');
  assert.equal(toBilingualName('ब्रजकिशोर'), 'ब्रजकिशोर (Brajkishore)');
  assert.equal(toBilingualName('Ramesh Kumar'), 'रमेश कुमार (Ramesh Kumar)');
  assert.equal(toBilingualName('Dinesh', 'Dinesh Master Ji'), 'Dinesh (Dinesh Master Ji)');

  // 2. Canonical Name Key Collision Resistance (Hindi == English == Bilingual)
  const key1 = canonicalNameKey('Shahnawaz');
  const key2 = canonicalNameKey('शाहनवाज');
  const key3 = canonicalNameKey('शाहनवाज़ (Shahnawaz)');
  assert.equal(key1, key2);
  assert.equal(key2, key3);

  const g1 = canonicalNameKey('ganeshi');
  const g2 = canonicalNameKey('गणेशी');
  const g3 = canonicalNameKey('गणेशी (Ganeshi)');
  assert.equal(g1, g2);
  assert.equal(g2, g3);

  // 3. Helper normName must produce same key to prevent database duplicates
  assert.equal(normName('Shahnawaz'), normName('शाहनवाज'));
  assert.equal(normName('ganeshi'), normName('गणेशी'));
  assert.equal(normName('Ramesh'), normName('रमेश'));
});

test('Seeded Village Standardization & Fast Mapping Suite', async () => {
  const { standardizeVillage, SEEDED_VILLAGES } = await import('../src/utils/helpers.js');
  
  assert.equal(SEEDED_VILLAGES.length, 12);
  assert.ok(SEEDED_VILLAGES.some((v) => v.includes('लोधनपुरवा') && v.includes('Lodhanpurwa')));
  assert.ok(SEEDED_VILLAGES.some((v) => v.includes('केवलपुरवा') && v.includes('Kewalpurwa')));
  assert.ok(SEEDED_VILLAGES.some((v) => v.includes('अशोगापुर') && v.includes('Ashogapur')));
  assert.ok(SEEDED_VILLAGES.some((v) => v.includes('नकहा') && v.includes('Nakaha')));
  assert.ok(SEEDED_VILLAGES.some((v) => v.includes('सहजनी') && v.includes('Sahajani')));
  assert.ok(SEEDED_VILLAGES.some((v) => v.includes('पडरी पुरवा') && v.includes('Padari Purwa')));

  // Test aliases and English mapping to unified bilingual format
  assert.equal(standardizeVillage('Ashogapur'), 'अशोगापुर (Ashogapur)');
  assert.equal(standardizeVillage('kewalpurwa'), 'केवलपुरवा (Kewalpurwa)');
  assert.equal(standardizeVillage('केवल पुरवा'), 'केवलपुरवा (Kewalpurwa)');
  assert.equal(standardizeVillage('padri Purva'), 'पडरी पुरवा (Padari Purwa)');
  assert.equal(standardizeVillage('padri purwa'), 'पडरी पुरवा (Padari Purwa)');
  assert.equal(standardizeVillage('लोनिअन पुरवा'), 'लोनियन पुरवा (Loniyan Purwa)');
  assert.equal(standardizeVillage('सहजनी'), 'सहजनी (Sahajani)');
  assert.equal(standardizeVillage('sahajani'), 'सहजनी (Sahajani)');
  assert.equal(standardizeVillage('lodhanpurwa'), 'लोधनपुरवा (Lodhanpurwa)');
  assert.equal(standardizeVillage('Lodhanpurwa'), 'लोधनपुरवा (Lodhanpurwa)');
});
