import { state } from '../state.js';
import { esc, logoMark } from '../utils/formatters.js';
import { langSelector } from '../components/shell.js';
import { t } from '../i18n.js';

export function viewAuth() {
  const mode = state.auth.mode || 'status';
  const isStatus = mode === 'status';
  const isLogin = mode === 'login';

  return `
  <div class="public-page">
    <header class="public-header">
      <div class="public-brand">
        ${logoMark(38)}
        <div>
          <div class="public-brand-title">${t('appName')}</div>
          <div class="public-brand-sub">${isStatus ? 'टोकन व पिसाई ट्रैकर' : 'दुकानदार पोर्टल'}</div>
        </div>
      </div>
      <div class="public-header-actions">
        <a href="/chakkibook.apk" download="chakkibook.apk" class="btn btn-sm btn-apk-dl" title="Android ऐप डाउनलोड करें">
          <span>📥</span> <span class="apk-text">APK डाउनलोड</span>
        </a>
        ${langSelector()}
      </div>
    </header>

    <main class="public-content">
      ${isStatus ? renderStatusView() : renderShopkeeperAuthView(isLogin)}
    </main>
  </div>`;
}

function renderStatusView() {
  return `
  <div class="public-card">
    <div class="status-card-header">
      <div class="status-pill">🌾 ग्राहक सेवा</div>
      <h1 class="status-title">पिसाई व टोकन स्टेटस</h1>
      <p class="status-subtitle">रसीद का QR स्कैन करें या टोकन व फोन नंबर दर्ज करें</p>
    </div>

    <button type="button" class="btn btn-block btn-qr-scan" data-act="status-scan-qr">
      <span class="qr-icon">📷</span>
      <span class="qr-text">रसीद / पर्ची का QR कोड स्कैन करें</span>
    </button>

    <div class="or-separator">
      <span>या नंबर से खोजें</span>
    </div>

    <form id="status-check-form" data-act="status-check-submit" novalidate>
      <div class="field">
        <label for="status-token-no">टोकन नंबर (Token No.)</label>
        <input id="status-token-no" name="tokenNo" type="number" inputmode="numeric" placeholder="उदा. 1, 2, 14..." required autofocus>
      </div>

      <div class="field">
        <label for="status-phone">ग्राहक का मोबाइल नंबर (10 अंक)</label>
        <input id="status-phone" name="phone" type="tel" inputmode="numeric" maxlength="10" placeholder="10 अंकों का फोन नंबर" required>
        <span class="hint">सुरक्षा व प्राइवेसी के लिए टोकन के साथ फोन नंबर ज़रूरी है</span>
      </div>

      <button type="submit" class="btn btn-primary btn-block btn-lg" style="margin-top:10px;">
        🔍 लाइव स्थिति देखें
      </button>
    </form>

    <div id="status-result-box" class="status-result-wrap"></div>
  </div>

  <div class="public-switch-card">
    <div class="switch-info">
      <b>चक्की या घानी संचालक हैं?</b>
      <span>दुकान का हिसाब, लेज़र और टोकन बोर्ड खोलें</span>
    </div>
    <button type="button" class="btn btn-login-switch" data-act="auth-mode" data-mode="login">
      🔐 दुकानदार लॉगिन ➔
    </button>
  </div>`;
}

function renderShopkeeperAuthView(isLogin) {
  return `
  <div class="public-card">
    <div style="margin-bottom:14px;">
      <button type="button" class="btn btn-sm btn-subtle" data-act="auth-mode" data-mode="status" style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;padding:6px 12px;border-radius:10px;font-weight:700;border:1.5px solid #cbd5e1;">
        <span>←</span> <span>ग्राहक स्टेटस चेक पर वापस जाएँ</span>
      </button>
    </div>

    <div class="status-card-header">
      <div class="status-pill" style="background:#e0e7ff;color:#4338ca;">🏢 चक्की संचालक पोर्टल</div>
      <h1 class="status-title">${isLogin ? t('welcomeBack') : t('addShop')}</h1>
      <p class="status-subtitle">${isLogin ? t('loginSub') : t('signupSub')}</p>
    </div>

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
      <button class="btn btn-primary btn-block btn-lg" type="submit" style="margin-top:10px;">${isLogin ? t('loginBtn') : t('signupBtn')}</button>
    </form>

    <p class="auth-alt" style="margin-top:16px;">${isLogin ? t('noAccount') : t('haveAccount')}
      <button class="link-btn" data-act="auth-mode" data-mode="${isLogin ? 'signup' : 'login'}">${isLogin ? t('signupBtn') : t('loginBtn')}</button>
    </p>
    <p class="auth-note">${t('authNote')}</p>
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
