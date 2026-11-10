// Automated WhatsApp Ready-to-Pickup & Token Notifications
import { state } from '../state.js';
import { inr, qtyFmt, unitOf } from '../utils/formatters.js';
import { openWhatsApp } from '../utils/whatsapp.js';

export function sendAataReadyNotification(tokenRow) {
  const biz = state.data.business || { name: 'Chakki' };
  const svc = tokenRow.serviceId ? state.data.services.find((s) => s.id === tokenRow.serviceId) : null;
  const svcName = svc ? svc.name : 'सुविधा / सेवा';
  const unit = svc ? unitOf(svc.unit) : 'kg';

  // Find customer to see if phone number exists
  const customer = state.data.customers.find((c) => {
    const nameMatch = c.name.toLowerCase() === tokenRow.name.trim().toLowerCase();
    if (!nameMatch) return false;
    if (tokenRow.village && c.village) {
      return c.village.trim().toLowerCase() === tokenRow.village.trim().toLowerCase();
    }
    return true;
  });

  const phone = customer ? customer.phone : '';

  const gross = tokenRow.grossWeight || 0;
  const net = tokenRow.netWeight;
  const lossG = tokenRow.lossG || 0;

  const lines = [
    `*🙏 ${biz.name} की ओर से सूचना*`,
    '',
    `श्री *${tokenRow.name}*${tokenRow.village ? ' (' + tokenRow.village + ')' : ''}, आपका कार्य तैयार है!`,
    '',
    `🏷️ टोकन नंबर: *#${tokenRow.no}*`,
    `🌾 उत्पाद/सेवा: *${svcName}*`,
  ];

  if (gross > 0) {
    lines.push(`⚖️ कुल वजन: *${qtyFmt(gross)} ${unit}*`);
  }
  if (lossG > 0) {
    lines.push(`✂️ कटौती / जलन: *-${lossG} g*`);
  }
  if (net > 0) {
    lines.push(`🥡 शुद्ध वापसी माल: *${qtyFmt(net)} ${unit}*`);
  }

  lines.push('');
  lines.push('कृपया दुकान पर आकर अपना सामान प्राप्त कर लें। धन्यवाद!');
  if (biz.phone) lines.push(`संपर्क: ${biz.phone}`);

  const msg = lines.join('\n');
  openWhatsApp(msg, phone);
}

export function sendTokenIssuedNotification(tokenRow) {
  const biz = state.data?.business || { name: 'तौल-माल (TolMaal)' };
  const svc = tokenRow.serviceId ? state.data.services.find((s) => s.id === tokenRow.serviceId) : null;
  const svcName = svc ? svc.name : (tokenRow.serviceName || 'सुविधा / सेवा');
  const unit = svc ? unitOf(svc.unit) : 'kg';

  let phone = tokenRow.phone || '';
  if (!phone) {
    const cust = (state.data?.customers || []).find((c) => {
      const nameMatch = c.name.toLowerCase() === tokenRow.name.trim().toLowerCase();
      if (!nameMatch) return false;
      if (tokenRow.village && c.village) {
        return c.village.trim().toLowerCase() === tokenRow.village.trim().toLowerCase();
      }
      return true;
    });
    if (cust && cust.phone) phone = cust.phone;
  }

  const gross = tokenRow.grossWeight || 0;
  const net = tokenRow.netWeight || gross;
  const lossG = tokenRow.lossG || 0;

  const lines = [
    `*🙏 ${biz.name} - टोकन पर्ची (Token Slip)*`,
    '',
    `श्री *${tokenRow.name}*${tokenRow.village ? ' (' + tokenRow.village + ')' : ''}, आपका माल दुकान पर जमा हो चुका है।`,
    '',
    `🎫 टोकन नंबर: *#${tokenRow.no}*`,
    `🌾 उत्पाद/सेवा: *${svcName}*`,
  ];

  if (gross > 0) {
    lines.push(`⚖️ कुल आवक वजन: *${qtyFmt(gross)} ${unit}*`);
  }
  if (lossG > 0) {
    lines.push(`✂️ काट / घटौती: *-${lossG} g*`);
  }
  if (net > 0) {
    lines.push(`🥡 शुद्ध वापसी माल: *${qtyFmt(net)} ${unit}*`);
  }

  lines.push('');
  lines.push(`📱 लाइव स्टेटस चेक: https://tolmaal.solidrix.com/#status?token=${tokenRow.no}&phone=${phone}`);
  lines.push('');
  lines.push('माल तैयार होने पर आपको पुनः सूचित किया जाएगा। धन्यवाद!');
  if (biz.phone) lines.push(`संपर्क: ${biz.phone}`);

  const msg = lines.join('\n');
  openWhatsApp(msg, phone);
}


