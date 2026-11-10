// Platform Super Admin & Multi-Tenant Management View
import { state } from '../state.js';
import { esc, inr, dateTxt, relTxt } from '../utils/formatters.js';

export function viewAdmin() {
  if (!state.admin.authenticated) {
    return viewAdminLogin();
  }
  return viewAdminDashboard();
}

function viewAdminLogin() {
  return `
  <div style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding:24px 16px;">
    <div style="max-width:420px;width:100%;background:#fff;border-radius:20px;padding:36px 28px;box-shadow:0 12px 36px rgba(15,23,42,0.12);border:1px solid #e2e8f0;text-align:center;">
      <div style="width:64px;height:64px;background:linear-gradient(135deg, #1e1b4b, #4338ca);color:#fbbf24;border-radius:18px;display:inline-flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:18px;box-shadow:0 8px 20px rgba(67,56,202,0.3);">
        🛡️
      </div>
      <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:6px;letter-spacing:-0.5px;">सुपर एडमिन पोर्टल</h1>
      <p style="font-size:13px;color:#64748b;margin-bottom:24px;">चककी बुक प्लेटफॉर्म एवं टेनेंट (चक्की) प्रबंधन</p>

      ${state.admin.error ? `<div style="background:#fee2e2;color:#b91c1c;padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:18px;font-weight:600;">${esc(state.admin.error)}</div>` : ''}

      <form id="admin-login-form" data-act="admin-login-submit" style="display:flex;flex-direction:column;gap:14px;text-align:left;">
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;">मास्टर सीक्रेट की (Master Secret Key)</label>
          <input type="password" id="admin-master-key" class="input" placeholder="मास्टर की दर्ज करें..." required autofocus style="width:100%;padding:12px 14px;border-radius:12px;border:1.5px solid #cbd5e1;font-size:14px;">
        </div>

        <button type="submit" class="btn btn-primary" style="width:100%;padding:13px;border-radius:12px;font-weight:700;font-size:14px;margin-top:6px;background:linear-gradient(135deg, #4338ca, #312e81);">
          सुपर एडमिन लॉगिन करें
        </button>
      </form>

      <div style="margin-top:24px;border-top:1px solid #f1f5f9;padding-top:16px;">
        <button type="button" class="btn btn-subtle" data-act="goto" data-view="dashboard" style="font-size:13px;color:#64748b;">
          ← मुख्य ऐप पर लौटें
        </button>
      </div>
    </div>
  </div>`;
}

function viewAdminDashboard() {
  const m = state.admin.metrics || {
    totalTenants: 0,
    activeTenants: 0,
    suspendedTenants: 0,
    proTenants: 0,
    totalJobs: 0,
    totalWeightKg: 0,
    totalRevenuePaise: 0,
    totalTokens: 0,
    totalCustomers: 0,
  };

  const q = (state.admin.q || '').trim().toLowerCase();
  const filter = state.admin.filter || 'all';

  const filteredTenants = (state.admin.tenants || []).filter((t) => {
    if (filter === 'active' && t.status === 'suspended') return false;
    if (filter === 'suspended' && t.status !== 'suspended') return false;
    if (filter === 'pro' && t.plan !== 'pro') return false;
    if (!q) return true;
    return (
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.phone && t.phone.includes(q)) ||
      (t.address && t.address.toLowerCase().includes(q))
    );
  });

  return `
  <div class="admin-dashboard" style="max-width:1200px;margin:0 auto;padding:12px 4px 60px;">
    <!-- Top Action Banner -->
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;padding-bottom:14px;border-bottom:1.5px solid #e2e8f0;">
      <div>
        <h1 style="font-size:22px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <span>🛡️</span> प्लेटफॉर्म टेनेंट मैनेजमेंट
        </h1>
        <p style="font-size:13px;color:#64748b;margin:0;">भारत भर की आटा चक्की, मसाला व तेल घानी इकाइयों का केंद्रीय नियंत्रण</p>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <a href="/tolmaal.apk" download="tolmaal.apk" class="btn btn-sm" title="TolMaal Android ऐप डाउनलोड करें" style="background:linear-gradient(135deg, #10b981, #059669);color:#fff;font-weight:700;display:inline-flex;align-items:center;gap:5px;padding:8px 14px;border-radius:10px;text-decoration:none;font-size:12px;box-shadow:0 2px 8px rgba(16,185,129,0.25);">
          <span>📱</span> <span>TolMaal App (.apk)</span>
        </a>
        <button type="button" class="btn btn-subtle btn-sm" data-act="admin-refresh" title="डेटा रीफ्रेश करें" style="border:1px solid #cbd5e1;padding:8px 14px;border-radius:10px;">
          🔄 रिफ्रेश
        </button>
        <button type="button" class="btn btn-subtle btn-sm" data-act="goto" data-view="dashboard" style="border:1px solid #cbd5e1;padding:8px 14px;border-radius:10px;">
          🏬 दुकान डैशबोर्ड
        </button>
        <button type="button" class="btn btn-subtle btn-sm" data-act="admin-logout" style="border:1px solid #fecaca;color:#b91c1c;padding:8px 14px;border-radius:10px;background:#fff5f5;">
          🚪 एडमिन लॉगआउट
        </button>
      </div>
    </div>

    <!-- Metrics Cards Grid -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:14px;margin-bottom:24px;">
      <div style="background:#fff;padding:18px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 2px 6px rgba(0,0,0,0.03);">
        <div style="font-size:12px;color:#64748b;font-weight:700;margin-bottom:6px;">🏪 कुल चक्कियां (Tenants)</div>
        <div style="font-size:26px;font-weight:800;color:#0f172a;">${m.totalTenants}</div>
        <div style="font-size:11.5px;color:#16a34a;margin-top:4px;font-weight:600;">✓ ${m.activeTenants} सक्रिय ${m.suspendedTenants ? `· <span style="color:#dc2626">${m.suspendedTenants} निलंबित</span>` : ''}</div>
      </div>

      <div style="background:#fff;padding:18px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 2px 6px rgba(0,0,0,0.03);">
        <div style="font-size:12px;color:#64748b;font-weight:700;margin-bottom:6px;">⚖️ कुल पिसाई वज़न</div>
        <div style="font-size:26px;font-weight:800;color:#4338ca;">${m.totalWeightKg >= 1000 ? (m.totalWeightKg / 1000).toFixed(2) + ' टन' : m.totalWeightKg.toFixed(1) + ' kg'}</div>
        <div style="font-size:11.5px;color:#64748b;margin-top:4px;">${m.totalJobs} पिसाई काम पूरे</div>
      </div>

      <div style="background:#fff;padding:18px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 2px 6px rgba(0,0,0,0.03);">
        <div style="font-size:12px;color:#64748b;font-weight:700;margin-bottom:6px;">🪙 प्लेटफॉर्म टर्नओवर</div>
        <div style="font-size:26px;font-weight:800;color:#059669;">${inr(m.totalRevenuePaise)}</div>
        <div style="font-size:11.5px;color:#64748b;margin-top:4px;">सभी दुकानों का कुल हिसाब</div>
      </div>

      <div style="background:#fff;padding:18px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 2px 6px rgba(0,0,0,0.03);">
        <div style="font-size:12px;color:#64748b;font-weight:700;margin-bottom:6px;">🎫 कुल टोकन कटे</div>
        <div style="font-size:26px;font-weight:800;color:#d97706;">${m.totalTokens}</div>
        <div style="font-size:11.5px;color:#64748b;margin-top:4px;">लाइन व टोकन ऑपरेशन्स</div>
      </div>

      <div style="background:#fff;padding:18px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 2px 6px rgba(0,0,0,0.03);">
        <div style="font-size:12px;color:#64748b;font-weight:700;margin-bottom:6px;">👥 कुल किसान / ग्राहक</div>
        <div style="font-size:26px;font-weight:800;color:#0284c7;">${m.totalCustomers}</div>
        <div style="font-size:11.5px;color:#64748b;margin-top:4px;">लेज़र खाते सुरक्षित</div>
      </div>
    </div>

    <!-- Search & Filter Controls -->
    <div style="background:#fff;padding:16px 20px;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div style="flex:1;min-width:260px;">
        <input type="search" id="admin-search-input" class="input" placeholder="🔍 दुकान का नाम, मोबाइल नंबर या गाँव खोजें..." value="${esc(state.admin.q || '')}" data-act="admin-search" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid #cbd5e1;font-size:13.5px;">
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        <button type="button" class="btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-subtle'}" data-act="admin-filter" data-filter="all" style="padding:6px 12px;border-radius:8px;font-size:12px;">
          सभी (${state.admin.tenants.length})
        </button>
        <button type="button" class="btn btn-sm ${filter === 'active' ? 'btn-primary' : 'btn-subtle'}" data-act="admin-filter" data-filter="active" style="padding:6px 12px;border-radius:8px;font-size:12px;">
          सक्रिय (${m.activeTenants})
        </button>
        <button type="button" class="btn btn-sm ${filter === 'suspended' ? 'btn-primary' : 'btn-subtle'}" data-act="admin-filter" data-filter="suspended" style="padding:6px 12px;border-radius:8px;font-size:12px;">
          निलंबित (${m.suspendedTenants})
        </button>
      </div>
    </div>

    <!-- Tenants List -->
    <div style="background:#fff;border-radius:18px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.03);">
      <div style="padding:16px 20px;border-bottom:1px solid #f1f5f9;background:#fafbfc;font-weight:700;font-size:14px;color:#334155;display:flex;justify-content:space-between;align-items:center;">
        <span>दुकान सूची (${filteredTenants.length} परिणाम)</span>
        <span style="font-size:12px;color:#64748b;font-weight:500;">क्लाउडफ्लेयर D1 मल्टी-टेनेंट सिंक</span>
      </div>

      ${filteredTenants.length === 0 ? `
        <div style="text-align:center;padding:48px 20px;color:#64748b;">
          <div style="font-size:36px;margin-bottom:8px;">🔍</div>
          <div style="font-weight:700;font-size:15px;color:#1e293b;">कोई दुकान नहीं मिली</div>
          <div style="font-size:12.5px;margin-top:4px;">सर्च फ़िल्टर बदल कर देखें</div>
        </div>
      ` : `
        <div style="display:flex;flex-direction:column;divide-y:1px solid #f1f5f9;">
          ${filteredTenants.map((t, idx) => `
            <div style="padding:18px 20px;border-bottom:1px solid #f1f5f9;display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between;transition:background 0.15s ease;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">
              <!-- Left Info -->
              <div style="flex:1;min-width:240px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                  <span style="font-weight:800;font-size:16px;color:#0f172a;">${esc(t.name)}</span>
                  ${t.status === 'suspended' ? `
                    <span style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">निलंबित (Suspended)</span>
                  ` : `
                    <span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">सक्रिय (Active)</span>
                  `}
                  <span style="background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;text-transform:uppercase;">${esc(t.plan)}</span>
                  ${t.isSuperAdmin ? `<span style="background:#fef3c7;color:#b45309;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">🛡️ Master</span>` : ''}
                </div>
                <div style="font-size:13px;color:#475569;margin-bottom:6px;">
                  📞 <b>${esc(t.phone)}</b> ${t.address ? `· 📍 ${esc(t.address)}` : ''}
                </div>
                <div style="font-size:11.5px;color:#94a3b8;">
                  पंजीकरण: ${dateTxt(t.createdAt)} · अंतिम सक्रिय: ${t.lastActiveAt ? relTxt(t.lastActiveAt) : 'N/A'}
                </div>
              </div>

              <!-- Mid Stats -->
              <div style="display:flex;gap:18px;align-items:center;font-size:12px;color:#475569;min-width:220px;">
                <div style="text-align:center;">
                  <div style="font-weight:800;font-size:15px;color:#0f172a;">${t.tokenCount}</div>
                  <div style="font-size:11px;color:#64748b;">टोकन</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-weight:800;font-size:15px;color:#0f172a;">${t.customerCount}</div>
                  <div style="font-size:11px;color:#64748b;">ग्राहक</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-weight:800;font-size:15px;color:#4338ca;">${t.totalWeightKg.toFixed(1)} kg</div>
                  <div style="font-size:11px;color:#64748b;">पिसाई</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-weight:800;font-size:15px;color:#059669;">${inr(t.totalRevenuePaise)}</div>
                  <div style="font-size:11px;color:#64748b;">हिसाब</div>
                </div>
              </div>

              <!-- Right Actions -->
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <button type="button" class="btn btn-sm btn-primary" data-act="admin-impersonate" data-id="${t.id}" data-name="${esc(t.name)}" style="padding:8px 12px;font-size:12px;font-weight:700;border-radius:8px;">
                  👁️ दुकान खोलें
                </button>
                <button type="button" class="btn btn-sm btn-subtle" data-act="admin-reset-pw" data-id="${t.id}" data-name="${esc(t.name)}" style="border:1px solid #cbd5e1;padding:8px 12px;font-size:12px;border-radius:8px;">
                  🔑 पासवर्ड बदलें
                </button>
                ${t.status === 'suspended' ? `
                  <button type="button" class="btn btn-sm btn-subtle" data-act="admin-toggle-status" data-id="${t.id}" data-status="active" style="border:1px solid #bbf7d0;background:#f0fdf4;color:#16a34a;padding:8px 12px;font-size:12px;border-radius:8px;font-weight:700;">
                    ✓ चालू करें
                  </button>
                ` : `
                  <button type="button" class="btn btn-sm btn-subtle" data-act="admin-toggle-status" data-id="${t.id}" data-status="suspended" style="border:1px solid #fecaca;background:#fff5f5;color:#dc2626;padding:8px 12px;font-size:12px;border-radius:8px;">
                    🚫 सस्पेंड करें
                  </button>
                `}
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  </div>`;
}
