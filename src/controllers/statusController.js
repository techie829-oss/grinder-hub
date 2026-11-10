// Public and In-App Token & Grinding Order Status Controller
import { json, bad, readJson } from '../utils/response.js';
import { currentBusiness } from '../middleware/auth.js';
import { clean, normalizePhone } from '../utils/helpers.js';

export async function checkStatus(request, env, url) {
  let tokenNo = null;
  let phone = '';
  let qr = '';

  if (request.method === 'GET') {
    const p = url.searchParams;
    tokenNo = p.get('token') ? parseInt(p.get('token').replace(/\D/g, ''), 10) : null;
    phone = p.get('phone') ? normalizePhone(p.get('phone')) : '';
    qr = p.get('qr') || '';
  } else {
    const body = await readJson(request);
    tokenNo = body.token != null ? parseInt(String(body.token).replace(/\D/g, ''), 10) : null;
    phone = body.phone ? normalizePhone(body.phone) : '';
    qr = body.qr || '';
  }

  // Parse QR if provided
  if (qr) {
    const tokenMatch = String(qr).match(/(?:token[:#\s]*|#\s*)(\d+)/i);
    if (tokenMatch) {
      tokenNo = parseInt(tokenMatch[1], 10);
    }
    const phoneMatch = String(qr).match(/(?:\+91|0)?([6-9]\d{9})/);
    if (phoneMatch && !phone) {
      phone = phoneMatch[1];
    }
  }

  if (!tokenNo || Number.isNaN(tokenNo) || tokenNo <= 0) {
    return bad('मान्य टोकन नंबर दर्ज करें (जैसे #12)', 400);
  }

  // Check if authenticated as a shopkeeper
  const loggedBiz = await currentBusiness(request, env).catch(() => null);

  // If customer public check, require customer 10-digit mobile number
  if (!loggedBiz && (!phone || phone.length !== 10)) {
    return bad('टोकन स्थिति देखने के लिए ग्राहक का 10-अंकों का मोबाइल नंबर और टोकन नंबर दोनों ज़रूरी हैं', 400);
  }

  let tokenQuery;
  if (loggedBiz) {
    // Shopkeeper looking up token in their own shop
    tokenQuery = await env.DB.prepare(`
      SELECT 
        t.id, t.business_id, t.no, t.day, t.name, t.village, t.phone,
        t.gross_weight, t.loss_g, t.net_weight, t.status, t.created_at,
        s.name AS service_name, s.unit,
        b.name AS shop_name, b.phone AS shop_phone, b.address AS shop_address,
        COALESCE(b.hide_loss_on_slip, 1) AS hide_loss_on_slip
      FROM tokens t
      JOIN businesses b ON b.id = t.business_id
      LEFT JOIN services s ON s.id = t.service_id
      WHERE t.business_id = ? AND t.no = ?
      ORDER BY t.created_at DESC
      LIMIT 1
    `).bind(loggedBiz.id, tokenNo).first();
  } else {
    // Customer looking up by tokenNo + phone
    tokenQuery = await env.DB.prepare(`
      SELECT 
        t.id, t.business_id, t.no, t.day, t.name, t.village, t.phone,
        t.gross_weight, t.loss_g, t.net_weight, t.status, t.created_at,
        s.name AS service_name, s.unit,
        b.name AS shop_name, b.phone AS shop_phone, b.address AS shop_address,
        COALESCE(b.hide_loss_on_slip, 1) AS hide_loss_on_slip
      FROM tokens t
      JOIN businesses b ON b.id = t.business_id
      LEFT JOIN services s ON s.id = t.service_id
      WHERE t.no = ? AND (
        t.phone = ? OR
        EXISTS (
          SELECT 1 FROM customers c 
          WHERE c.business_id = t.business_id 
            AND c.name = t.name 
            AND c.phone = ?
        ) OR
        EXISTS (
          SELECT 1 FROM entries e
          LEFT JOIN customers c ON c.id = e.customer_id
          WHERE e.business_id = t.business_id
            AND e.token_no = t.no
            AND c.phone = ?
        )
      )
      ORDER BY t.created_at DESC
      LIMIT 1
    `).bind(tokenNo, phone, phone, phone).first();
  }

  // Fallback: Check finished entries if token record was cleared or completed
  let entryFallback = null;
  if (!tokenQuery) {
    let entrySql;
    if (loggedBiz) {
      entrySql = env.DB.prepare(`
        SELECT 
          e.id, e.business_id, e.token_no, e.day, e.name, e.village,
          e.gross_weight, e.loss_g, e.net_weight, e.amount_paise, e.paid, e.created_at,
          s.name AS service_name, s.unit,
          b.name AS shop_name, b.phone AS shop_phone, b.address AS shop_address
        FROM entries e
        JOIN businesses b ON b.id = e.business_id
        LEFT JOIN services s ON s.id = e.service_id
        WHERE e.business_id = ? AND e.token_no = ?
        ORDER BY e.created_at DESC
        LIMIT 1
      `).bind(loggedBiz.id, tokenNo);
    } else {
      entrySql = env.DB.prepare(`
        SELECT 
          e.id, e.business_id, e.token_no, e.day, e.name, e.village,
          e.gross_weight, e.loss_g, e.net_weight, e.amount_paise, e.paid, e.created_at,
          s.name AS service_name, s.unit,
          b.name AS shop_name, b.phone AS shop_phone, b.address AS shop_address
        FROM entries e
        JOIN businesses b ON b.id = e.business_id
        LEFT JOIN services s ON s.id = e.service_id
        LEFT JOIN customers c ON c.id = e.customer_id
        WHERE e.token_no = ? AND (c.phone = ? OR b.phone = ?)
        ORDER BY e.created_at DESC
        LIMIT 1
      `).bind(tokenNo, phone, phone);
    }
    entryFallback = await entrySql.first();
  }

  if (!tokenQuery && !entryFallback) {
    return bad('इस नंबर और टोकन का कोई रिकॉर्ड नहीं मिला। कृपया नंबर और टोकन जाँचें।', 404);
  }

  const record = tokenQuery || entryFallback;
  const isDone = !tokenQuery || record.status === 'done';
  const isServing = tokenQuery && record.status === 'serving';

  // Calculate queue position if waiting
  let queuePosition = 0;
  if (tokenQuery && record.status === 'waiting') {
    const ahead = await env.DB.prepare(`
      SELECT COUNT(*) AS c FROM tokens 
      WHERE business_id = ? AND day = ? AND status = 'waiting' AND no < ?
    `).bind(record.business_id, record.day, record.no).first();
    queuePosition = ahead ? ahead.c : 0;
  }

  // Fetch payment status if available
  let amountPaise = record.amount_paise || null;
  let paid = record.paid != null ? !!record.paid : null;

  if (tokenQuery && amountPaise == null) {
    const entry = await env.DB.prepare(`
      SELECT amount_paise, paid FROM entries 
      WHERE business_id = ? AND token_no = ? 
      ORDER BY created_at DESC LIMIT 1
    `).bind(record.business_id, record.no).first();
    if (entry) {
      amountPaise = entry.amount_paise;
      paid = !!entry.paid;
    }
  }

  const hideLoss = Number(record.hide_loss_on_slip != null ? record.hide_loss_on_slip : 1) === 1;

  return json({
    ok: true,
    found: true,
    token: {
      tokenNo: record.no || record.token_no,
      status: isDone ? 'done' : (isServing ? 'serving' : 'waiting'),
      statusText: isDone ? 'कार्य पूरा — तैयार है ✓' : (isServing ? 'प्रक्रिया चल रही है ⚙️' : 'लाइन में प्रतीक्षा जारी ⏳'),
      queuePosition,
      name: record.name,
      village: record.village || '',
      serviceName: record.service_name || 'सुविधा / सेवा कार्य',
      grossWeight: Number(record.gross_weight) || 0,
      lossG: hideLoss ? 0 : (Number(record.loss_g) || 0),
      netWeight: hideLoss ? (Number(record.gross_weight) || 0) : (Number(record.net_weight) || 0),
      hideLoss,
      unit: record.unit || 'kg',
      amountPaise,
      paid,
      createdAt: record.created_at,
      shopName: record.shop_name,
      shopPhone: record.shop_phone,
      shopAddress: record.shop_address || '',
    }
  });
}

