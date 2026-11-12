// Automatic App Update Checker, Notification Banner & Direct APK Downloader
import { state } from '../state.js';
import { showModal, closeModal } from '../components/modals.js';

export const CURRENT_APP_VERSION = '2.8.2';
export const CURRENT_VERSION_CODE = 5;

let updateBannerDismissed = false;

export function getInstalledAppInfo() {
  if (typeof window !== 'undefined' && window.AndroidAppInfo) {
    try {
      return {
        isNative: true,
        version: window.AndroidAppInfo.getAppVersion() || '2.8.2',
        code: Number(window.AndroidAppInfo.getVersionCode()) || 5,
      };
    } catch (e) {}
  }

  // Check if running inside Capacitor native webview
  const isCapacitorNative = typeof window !== 'undefined' && !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if (isCapacitorNative) {
    // Legacy APK before AndroidAppInfo was added, or older build
    return {
      isNative: true,
      version: '2.4.0',
      code: 4,
    };
  }

  return {
    isNative: false,
    version: CURRENT_APP_VERSION,
    code: CURRENT_VERSION_CODE,
  };
}

export function isUpdateAvailable() {
  const installed = getInstalledAppInfo();
  const latestMeta = state.data?.appMeta || { latestVersion: '2.8.2', latestVersionCode: 5 };

  if (installed.isNative) {
    return installed.code < latestMeta.latestVersionCode;
  }
  // If not native, always up-to-date with web worker
  return false;
}

export function dismissUpdateBanner() {
  updateBannerDismissed = true;
  const banner = document.getElementById('app-update-banner');
  if (banner) banner.remove();
}

export function renderUpdateBanner() {
  if (updateBannerDismissed) return '';
  if (!isUpdateAvailable()) return '';
  const latestMeta = state.data?.appMeta || { latestVersion: '2.8.2' };

  return `
  <div id="app-update-banner" style="background:linear-gradient(135deg, #059669, #047857);color:#fff;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;box-shadow:0 2px 8px rgba(5,150,105,0.25);position:sticky;top:0;z-index:900;">
    <div style="display:flex;align-items:center;gap:8px;min-width:0;">
      <span style="font-size:20px;flex-shrink:0;">🚀</span>
      <div style="font-size:12px;line-height:1.25;min-width:0;">
        <strong style="display:block;font-size:12.5px;letter-spacing:-0.1px;">नया TolMaal ऐप अपडेट उपलब्ध है (v${latestMeta.latestVersion})!</strong>
        <span style="opacity:0.9;font-size:11px;">कैमरा, परमिशन और नए हिसाब सुधार के लिए अभी इंस्टॉल करें</span>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
      <button type="button" class="btn btn-xs" data-act="download-app-update" style="background:#fff;color:#065f46;font-weight:800;border-radius:8px;padding:6px 12px;font-size:12px;box-shadow:0 1px 3px rgba(0,0,0,0.15);white-space:nowrap;border:none;">
        📥 अभी अपडेट करें
      </button>
      <button type="button" class="btn btn-xs btn-ghost" data-act="dismiss-update-banner" style="color:#fff;padding:4px 6px;font-size:14px;line-height:1;" title="हटाएं">✕</button>
    </div>
  </div>`;
}

export function triggerAppDownload() {
  const downloadUrl = (state.data?.appMeta && state.data.appMeta.downloadUrl) || '/tolmaal.apk';

  // 1. Trigger APK file download
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = 'tolmaal.apk';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 100);

  // 2. Open instructional download modal
  openDownloadModal(downloadUrl);
}

export function openDownloadModal(downloadUrl = '/tolmaal.apk') {
  showModal(`
    <div class="sheet-head" style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:24px;">📥</span>
        <div>
          <div style="font-size:16px;font-weight:800;color:#0f172a;">नया ऐप डाउनलोड हो रहा है...</div>
          <div style="font-size:11.5px;color:#64748b;">TolMaal Android App (APK)</div>
        </div>
      </div>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Close">✕</button>
    </div>

    <div style="background:linear-gradient(135deg, #ecfdf5, #d1fae5);border:1.5px solid #a7f3d0;border-radius:12px;padding:14px;margin-bottom:14px;text-align:center;">
      <div style="font-size:32px;margin-bottom:4px;">📲</div>
      <div style="font-size:15px;font-weight:800;color:#065f46;">डाउनलोड शुरू हो चुका है!</div>
      <div style="font-size:12px;color:#047857;margin-top:4px;">
        कृपया अपने मोबाइल का <strong>Notification Bar</strong> (ऊपर से नीचे स्वाइप करके) देखें।
      </div>
    </div>

    <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:14px;">
      <div style="font-size:12.5px;font-weight:800;color:#1e293b;margin-bottom:8px;">अपडेट इंस्टॉल कैसे करें:</div>
      <div style="display:flex;flex-direction:column;gap:8px;font-size:12px;color:#475569;">
        <div style="display:flex;align-items:flex-start;gap:8px;">
          <span style="background:#4f46e5;color:#fff;border-radius:50%;width:18px;height:18px;display:grid;place-items:center;font-size:11px;font-weight:800;flex-shrink:0;">1</span>
          <span>डाउनलोड पूरा होने पर नोटिफिकेशन बार से <strong>tolmaal.apk</strong> पर क्लिक करें।</span>
        </div>
        <div style="display:flex;align-items:flex-start;gap:8px;">
          <span style="background:#4f46e5;color:#fff;border-radius:50%;width:18px;height:18px;display:grid;place-items:center;font-size:11px;font-weight:800;flex-shrink:0;">2</span>
          <span>स्क्रीन पर <strong>"Update"</strong> या <strong>"Install"</strong> बटन दबाएं।</span>
        </div>
        <div style="display:flex;align-items:flex-start;gap:8px;">
          <span style="background:#4f46e5;color:#fff;border-radius:50%;width:18px;height:18px;display:grid;place-items:center;font-size:11px;font-weight:800;flex-shrink:0;">3</span>
          <span>इंस्टॉल होते ही ऐप खोलें — आपका सारा पुराना डेटा सुरक्षित रहेगा!</span>
        </div>
      </div>
    </div>

    <div style="display:flex;gap:8px;flex-direction:column;">
      <a href="${downloadUrl}" download="tolmaal.apk" class="btn btn-primary" style="padding:11px;font-weight:800;font-size:13.5px;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px;">
        <span>🔄</span> <span>अगर डाउनलोड न हुआ हो तो दोबारा क्लिक करें</span>
      </a>
      <button type="button" class="btn btn-ghost" data-act="close-modal" style="padding:8px;font-weight:700;color:#64748b;">
        ✕ बंद करें
      </button>
    </div>
  `);
}

export function openUpdatePromptModal() {
  const latestMeta = state.data?.appMeta || { latestVersion: '2.8.2', latestVersionCode: 5 };
  const changelog = latestMeta.changelog || [
    'स्वचालित हिसाब गणना (तैयार माल / कुल वजन आधार)',
    'कैमरा, स्कैनर और वॉइस ऑर्डर परमिशन सुधार',
    '0ms तुरंत ग्राहक खाता लोड',
    'टोकन पर्ची और रसीद प्रिंटिंग फिक्स'
  ];

  showModal(`
    <div class="sheet-head" style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:24px;">🚀</span>
        <div>
          <div style="font-size:16px;font-weight:800;color:#0f172a;">नया ऐप अपडेट उपलब्ध है!</div>
          <div style="font-size:11.5px;color:#4f46e5;font-weight:750;">वर्ज़न v${latestMeta.latestVersion} तैयार है</div>
        </div>
      </div>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Close">✕</button>
    </div>

    <div style="background:linear-gradient(135deg, #eef2ff, #e0e7ff);border:1.5px solid #a5b4fc;border-radius:14px;padding:14px;margin-bottom:12px;">
      <div style="font-size:13px;font-weight:800;color:#312e81;margin-bottom:6px;">✨ इस अपडेट में नया क्या है:</div>
      <ul style="margin:0;padding-left:18px;font-size:12px;color:#3730a3;line-height:1.5;">
        ${changelog.map((c) => `<li>${c}</li>`).join('')}
      </ul>
    </div>

    <div style="font-size:11.5px;color:#64748b;margin-bottom:14px;line-height:1.4;">
      💡 ऐप अपडेट करने से आपका कोई भी डेटा या हिसाब डिलीट नहीं होगा।
    </div>

    <div style="display:flex;gap:8px;flex-direction:column;">
      <button type="button" class="btn btn-primary" data-act="download-app-update" style="padding:12px;font-weight:800;font-size:14px;background:linear-gradient(135deg, #10b981, #059669);border:none;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 12px rgba(16,185,129,0.3);">
        <span>📥</span> <span>अभी नया ऐप डाउनलोड करें (Update APK)</span>
      </button>
      <button type="button" class="btn btn-ghost" data-act="close-modal" style="padding:8px;font-weight:700;color:#64748b;">
        बाद में याद दिलाएं
      </button>
    </div>
  `);
}

export function autoCheckAppUpdate() {
  try {
    if (!isUpdateAvailable()) return;

    const lastPrompt = localStorage.getItem('cb_last_update_prompt');
    const today = new Date().toDateString();
    if (lastPrompt === today) return;

    // Show modal after 1.5 seconds so app interface loads first
    setTimeout(() => {
      if (isUpdateAvailable() && !document.querySelector('.sheet')) {
        localStorage.setItem('cb_last_update_prompt', today);
        openUpdatePromptModal();
      }
    }, 1500);
  } catch (e) {}
}

