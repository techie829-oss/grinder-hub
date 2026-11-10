import { state } from '../state.js';
import { esc, logoMark } from '../utils/formatters.js';
import { langSelector } from '../components/shell.js';
import { t } from '../i18n.js';

export function viewAuth() {
  const isLogin = state.auth.mode === 'login';
  return `
  <div class="auth">
    <aside class="auth-brand">
      <div class="brand-lock">
        ${logoMark(44)}
        <div>
          <div class="brand-name">${t('appName')}</div>
          <div class="brand-tag">${t('tagline')}</div>
        </div>
      </div>

      <div class="auth-hero">
        <span class="auth-kicker">● टोकन · हिसाब · उधार</span>
        <h1 class="auth-hero-title">चक्की, मसाला और तेल — सबका हिसाब एक जगह।</h1>
        <p class="auth-hero-sub">लाइन में किसका नंबर है, किसने कितना दिया और किसका कितना बाकी — सब मोबाइल पर, बिना कॉपी-पेंसिल।</p>
        <ul class="feature-list">
          <li><span class="fi">✓</span><span>टोकन बोर्ड — बड़ा नंबर, साफ़ लाइन</span></li>
          <li><span class="fi">✓</span><span>प्रति किलो, लीटर या नग — अपनी दरें खुद तय करें</span></li>
          <li><span class="fi">✓</span><span>हर ग्राहक का उधार और भुगतान का पूरा रिकॉर्ड</span></li>
          <li><span class="fi">✓</span><span>रसीद प्रिंट करें या WhatsApp पर भेजें</span></li>
        </ul>
      </div>

      <div class="auth-proof">
        <div><b>हर दुकान अलग</b>अपना खाता, अपना डेटा</div>
        <div><b>सुरक्षित</b>पासवर्ड हैश में सेव</div>
        <div><b>कहीं भी</b>मोबाइल या कंप्यूटर</div>
      </div>
    </aside>

    <main class="auth-panel">
      <div class="auth-lang-wrap" style="display:flex;align-items:center;gap:8px;">
        <button type="button" class="btn btn-sm btn-subtle" data-act="open-status-modal" title="टोकन व पिसाई स्टेटस देखें" style="border:1.5px solid #cbd5e1;padding:6px 12px;border-radius:10px;font-weight:700;display:inline-flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;background:#fff;">
          <span>🔍</span> <span>स्टेटस</span>
        </button>
        <a href="/chakkibook.apk" download="chakkibook.apk" class="btn btn-sm btn-apk-dl" title="Android ऐप डाउनलोड करें" style="background:linear-gradient(135deg, #10b981, #059669);color:#fff;font-weight:700;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:10px;text-decoration:none;box-shadow:0 2px 8px rgba(16,185,129,0.25);font-size:12px;white-space:nowrap;">
          <span>📥</span> <span>APK डाउनलोड</span>
        </a>
        ${langSelector()}
      </div>
      <div class="auth-card">
        <h1>${isLogin ? t('welcomeBack') : t('addShop')}</h1>
        <p class="muted">${isLogin ? t('loginSub') : t('signupSub')}</p>

        <div class="auth-tabs" role="tablist">
          <button type="button" class="auth-tab${isLogin ? ' is-on' : ''}" data-act="auth-mode" data-mode="login" role="tab">${t('loginTab')}</button>
          <button type="button" class="auth-tab${isLogin ? '' : ' is-on'}" data-act="auth-mode" data-mode="signup" role="tab">${t('signupTab')}</button>
        </div>

        <div id="auth-error" class="auth-error"${state.auth.error ? '' : ' hidden'}>${esc(state.auth.error)}</div>

        <form data-form="auth" novalidate>
          ${isLogin ? '' : `
          <div class="field">
            <label for="a-shop">${t('shopNameLabel')}</label>
            <input id="a-shop" name="shopName" maxlength="60" placeholder="${t('shopNamePlaceholder')}" autocomplete="organization">
          </div>`}
          <div class="field">
            <label for="a-phone">${t('phoneLabel')}</label>
            <input id="a-phone" name="phone" type="tel" inputmode="numeric" maxlength="10" placeholder="${t('phonePlaceholder')}" autocomplete="tel">
          </div>
          <div class="field">
            <label for="a-pass">${t('passwordLabel')}</label>
            <input id="a-pass" name="password" type="password" minlength="6" placeholder="${isLogin ? t('passwordPlaceholderLogin') : t('passwordPlaceholderSignup')}" autocomplete="${isLogin ? 'current-password' : 'new-password'}">
          </div>
          <button class="btn btn-primary btn-block" type="submit">${isLogin ? t('loginBtn') : t('signupBtn')}</button>
        </form>

        <p class="auth-alt">${isLogin ? t('noAccount') : t('haveAccount')}
          <button class="link-btn" data-act="auth-mode" data-mode="${isLogin ? 'signup' : 'login'}">${isLogin ? t('signupBtn') : t('loginBtn')}</button>
        </p>
        <p class="auth-note">${t('authNote')}</p>
        <div style="text-align:center;margin-top:14px;">
          <a href="#admin" data-act="goto" data-view="admin" style="font-size:11.5px;color:#94a3b8;text-decoration:none;">🛡️ प्लेटफॉर्म सुपर एडमिन पोर्टल</a>
        </div>
      </div>
    </main>
  </div>`;
}

export function showAuthError(msg) {
  state.auth.error = msg;
  const box = document.getElementById('auth-error');
  if (box) {
    box.textContent = msg;
    box.hidden = false;
  }
}

