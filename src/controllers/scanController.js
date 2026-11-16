import { json, bad } from '../utils/response.js';
import { clean, dayKey, standardizeVillage, normName, normVillage } from '../utils/helpers.js';
import { isPhoneticMatch, canonicalNameKey, toBilingualName } from '../utils/phonetic.js';
import { issueToken } from '../services/tokenService.js';
import { buildState } from '../services/stateService.js';

export async function testAiConnection(request, env) {
  if (!env.AI) {
    return json({ ok: false, error: 'env.AI binding not found in worker environment' });
  }
  try {
    const res = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      prompt: 'Respond with exactly {"status":"ready"} in JSON.',
      max_tokens: 50,
    });
    return json({ ok: true, model: '@cf/meta/llama-3.2-11b-vision-instruct', response: res });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

export async function processScanImage(request, env, business) {
  if (!env.AI) {
    return bad('Cloudflare AI सेवा उपलब्ध नहीं है (env.AI binding missing)');
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return bad('अमान्य डेटा (JSON expected)');
  }

  const rawImage = body.image;
  if (!rawImage || typeof rawImage !== 'string') {
    return bad('कृपया रजिस्टर के पन्ने की फोटो अपलोड करें');
  }

  // Convert base64 data to byte array for Workers AI
  let imageBytes;
  try {
    const base64Data = rawImage.replace(/^data:image\/\w+;base64,/, '');
    const binaryStr = atob(base64Data);
    imageBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      imageBytes[i] = binaryStr.charCodeAt(i);
    }
  } catch (err) {
    return bad('फोटो डेटा अमान्य है (Base64 decode failed)');
  }

  // Vision Prompt for Indian Chakki Register
  const prompt = `You are an expert OCR assistant for Indian flour mill (atta chakki) handwritten registers and notebook pages.
The image contains handwritten Hindi and English records with serial/token numbers, customer names, village names, and weights in kg.
Analyze the rows line by line.

For each readable line or customer entry, extract:
- rowNo: line number or serial number (1, 2, 3...)
- name: customer name in Hindi or English (e.g. लतीफ़, रामनरेश, सचिन, आशीष मौर्य)
- village: village name if mentioned (e.g. अशोगापुर, केवलपुरवा, सहजनी, नकहा, लोनियन पुरवा) or ""
- grossWeight: gross or total grain weight in kg (decimal number like 20.61 or 20.7 or 27)
- lossG: loss/katoti in grams (e.g. 309, 405, or 0 if not written)
- netWeight: net or return flour weight in kg (e.g. 20.301, 26.595, or equal to grossWeight)
- rawText: raw text as visible on that line

Return ONLY a valid JSON object in this exact schema, with NO extra markdown or formatting:
{
  "rows": [
    {
      "rowNo": 1,
      "name": "ग्राहक नाम",
      "village": "गाँव नाम",
      "grossWeight": 20.5,
      "lossG": 0,
      "netWeight": 20.5,
      "rawText": "कच्चा टेक्स्ट"
    }
  ]
}`;

  let aiResult;
  try {
    aiResult = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      image: Array.from(imageBytes),
      prompt,
      max_tokens: 2500,
    });
  } catch (err) {
    console.error('workers_ai_vision_failed', err);
    return bad('Cloudflare AI द्वारा फोटो पढ़ने में त्रुटि: ' + (err.message || String(err)), 500);
  }

  // Parse AI response to JSON
  let parsedRows = [];
  try {
    const rawContent = (aiResult && (aiResult.response || aiResult.text || aiResult.description || JSON.stringify(aiResult))) || '';
    // Strip possible markdown fences like ```json ... ```
    const cleanedJsonStr = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
    const jsonStart = cleanedJsonStr.indexOf('{');
    const jsonEnd = cleanedJsonStr.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const parsed = JSON.parse(cleanedJsonStr.slice(jsonStart, jsonEnd + 1));
      parsedRows = Array.isArray(parsed.rows) ? parsed.rows : (Array.isArray(parsed) ? parsed : []);
    }
  } catch (err) {
    console.warn('json_parse_ai_vision_error', err, aiResult);
  }

  if (!parsedRows.length) {
    return json({
      ok: false,
      error: 'फोटो से कोई पंक्ति नहीं पहचानी जा सकी। कृपया साफ़ फोटो खींचकर दोबारा प्रयास करें।',
      rawAiResponse: aiResult,
    });
  }

  // Fetch existing customers for this business to perform smart matching
  const custRes = await env.DB.prepare(
    'SELECT id, name, name_key, village, village_key, phone FROM customers WHERE business_id = ?'
  ).bind(business.id).all();
  const existingCustomers = custRes?.results || [];

  const now = Date.now();
  const scanId = 'scan_' + now + '_' + Math.random().toString(36).slice(2, 7);

  // Match each row against customers
  const stagingItems = [];
  let rowIdx = 1;

  for (const row of parsedRows) {
    let name = clean(row.name, 60);
    if (!name || name === 'Customer') continue;
    name = toBilingualName(name);

    const stdVillage = standardizeVillage(clean(row.village, 60));
    const gross = Number(row.grossWeight) || 0;
    const lossG = Number(row.lossG) || 0;
    let net = Number(row.netWeight) || gross;
    if (lossG > 0 && net === gross) {
      net = Math.max(0, gross - (lossG / 1000));
    }

    // Matching logic
    let matchedCust = null;
    let confidence = 0;

    const rowNameKey = normName(name);
    const rowVillKey = normVillage(stdVillage);

    // 1. Try exact name + village match
    if (stdVillage) {
      matchedCust = existingCustomers.find(
        (c) => normName(c.name) === rowNameKey && normVillage(c.village) === rowVillKey
      );
      if (matchedCust) confidence = 1.0;
    }

    // 2. Try exact name match
    if (!matchedCust) {
      matchedCust = existingCustomers.find((c) => normName(c.name) === rowNameKey);
      if (matchedCust) {
        confidence = stdVillage ? 0.80 : 0.90;
      }
    }

    // 3. Try phonetic matching
    if (!matchedCust) {
      matchedCust = existingCustomers.find((c) => isPhoneticMatch(c.name, name));
      if (matchedCust) confidence = 0.70;
    }

    const itemId = 'scani_' + now + '_' + rowIdx;
    stagingItems.push({
      id: itemId,
      scanId,
      rowIndex: rowIdx,
      rawText: clean(row.rawText || `${row.name} ${row.village || ''} ${gross}kg`, 120),
      parsedName: name,
      parsedVillage: stdVillage || (matchedCust ? matchedCust.village : ''),
      grossWeight: Math.round(gross * 1000) / 1000,
      lossG: Math.round(lossG),
      netWeight: Math.round(net * 1000) / 1000,
      matchedCustomerId: matchedCust ? matchedCust.id : null,
      matchedCustomerName: matchedCust ? matchedCust.name : null,
      matchedCustomerVillage: matchedCust ? matchedCust.village : null,
      matchConfidence: confidence,
      status: 'pending',
    });
    rowIdx++;
  }

  // Insert into D1 staging tables
  const statements = [
    env.DB.prepare(
      'INSERT INTO scans (id, business_id, image_data, status, total_rows, approved_rows, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(scanId, business.id, '', 'pending', stagingItems.length, 0, now)
  ];

  for (const it of stagingItems) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO scan_items (id, scan_id, business_id, row_index, raw_text, parsed_name, parsed_village,
                                gross_weight, loss_g, net_weight, matched_customer_id, match_confidence, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        it.id,
        it.scanId,
        business.id,
        it.rowIndex,
        it.rawText,
        it.parsedName,
        it.parsedVillage,
        it.grossWeight,
        it.lossG,
        it.netWeight,
        it.matchedCustomerId,
        it.matchConfidence,
        'pending',
        now
      )
    );
  }

  await env.DB.batch(statements);

  return json({
    ok: true,
    scanId,
    totalRows: stagingItems.length,
    items: stagingItems,
  });
}

export async function getScanBatch(request, env, business, url) {
  const scanId = clean(url.searchParams.get('id'), 40);
  if (!scanId) return bad('scanId आवश्यक है');

  const scan = await env.DB.prepare(
    'SELECT id, status, total_rows, approved_rows, created_at FROM scans WHERE id = ? AND business_id = ?'
  ).bind(scanId, business.id).first();

  if (!scan) return bad('स्कैन रिकॉर्ड नहीं मिला', 404);

  const itemsRes = await env.DB.prepare(
    `SELECT i.*, c.name AS customer_name, c.village AS customer_village
       FROM scan_items i
       LEFT JOIN customers c ON c.id = i.matched_customer_id AND c.business_id = i.business_id
      WHERE i.scan_id = ? AND i.business_id = ?
      ORDER BY i.row_index ASC`
  ).bind(scanId, business.id).all();

  return json({
    ok: true,
    scan,
    items: itemsRes?.results || [],
  });
}

export async function approveScanBatch(request, env, business, range) {
  const body = await request.json().catch(() => ({}));
  const scanId = clean(body.scanId, 40);
  const items = Array.isArray(body.items) ? body.items : [];

  if (!scanId || !items.length) {
    return bad('स्वीकृत करने के लिए पंक्तियाँ आवश्यक हैं');
  }

  const defaultService = await env.DB.prepare(
    'SELECT id, name, unit, rate_paise, loss_rate_g FROM services WHERE business_id = ? AND active = 1 ORDER BY sort ASC LIMIT 1'
  ).bind(business.id).first();

  let importedCount = 0;
  const now = Date.now();

  for (const item of items) {
    if (item.action === 'skip') {
      await env.DB.prepare(
        "UPDATE scan_items SET status = 'skipped' WHERE id = ? AND scan_id = ? AND business_id = ?"
      ).bind(clean(item.id, 40), scanId, business.id).run();
      continue;
    }

    const name = toBilingualName(clean(item.name, 60));
    const village = standardizeVillage(clean(item.village, 60));
    const phone = clean(item.phone, 15);
    const grossWeight = Number(item.grossWeight) || 0;
    const lossG = Number(item.lossG) || 0;
    const netWeight = Number(item.netWeight) || grossWeight;

    // Issue Token into main tokens table
    const token = await issueToken(
      env,
      business.id,
      name || 'ग्राहक',
      village || '',
      defaultService ? defaultService.id : null,
      grossWeight,
      lossG,
      netWeight,
      phone,
      'स्कैन से आयातित'
    );

    // If marked as done/ready directly
    if (item.markReady) {
      await env.DB.prepare(
        "UPDATE tokens SET status = 'done' WHERE id = ? AND business_id = ?"
      ).bind(token.id, business.id).run();
    }

    // Update scan item status
    await env.DB.prepare(
      "UPDATE scan_items SET status = 'imported', imported_token_id = ? WHERE id = ? AND scan_id = ? AND business_id = ?"
    ).bind(token.id, clean(item.id, 40), scanId, business.id).run();

    importedCount++;
  }

  // Update master scan status
  await env.DB.prepare(
    "UPDATE scans SET status = 'approved', approved_rows = ? WHERE id = ? AND business_id = ?"
  ).bind(importedCount, scanId, business.id).run();

  return json({
    ok: true,
    scanId,
    importedCount,
    state: await buildState(env, business.id, range),
  });
}
