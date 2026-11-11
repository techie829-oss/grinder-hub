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
