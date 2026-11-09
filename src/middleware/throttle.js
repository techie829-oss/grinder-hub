const attempts = new Map();

export function throttleKey(request, phone) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'local';
  return ip + '|' + phone;
}

export function blocked(key) {
  const rec = attempts.get(key);
  if (!rec) return false;
  if (Date.now() - rec.at > 10 * 60 * 1000) {
    attempts.delete(key);
    return false;
  }
  return rec.count >= 8;
}

export function noteFail(key) {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.at > 10 * 60 * 1000) {
    attempts.set(key, { count: 1, at: now });
  } else {
    rec.count += 1;
    rec.at = now;
  }
  if (attempts.size > 2000) attempts.clear();
}

export function clearThrottle(key) {
  attempts.delete(key);
}

