// ==UserScript==
// @name         Perplexity – Usage Limits Panel
// @namespace    https://perplexity.ai/
// @version      1.0.0
// @license      MIT 
// @description  Usage-limits panel for Perplexity.ai, showing remaining searches, MCP source limits, and key settings in one place.
// @author       corbanistan
// @match        https://www.perplexity.ai/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ── CONFIG ─────────────────────────────────────────────────────────────────
  const SEARCH_LIMITS = {
    remaining_pro:              { label: 'Pro',      total: 200  },
    remaining_research:         { label: 'Research', total: 20   },
    remaining_agentic_research: { label: 'Agentic',  total: null },
    remaining_labs:             { label: 'Labs',     total: 25   },
  };

  const SETTINGS_FIELDS = [
    { key: 'upload_limit',                   label: 'Uploads',       type: 'number' },
    { key: 'pages_limit',                    label: 'Pages',         type: 'number' },
    { key: 'create_limit',                   label: 'Create',        type: 'number' },
    { key: 'article_image_upload_limit',     label: 'Img Uploads',   type: 'number' },
    { key: 'daily_attachment_limit',         label: 'Attachments',   type: 'number' },
    { key: 'disable_training',               label: 'Training Disabled', type: 'bool'   },
    { key: 'has_ai_profile',                 label: 'AI Profile',    type: 'bool'   },
    { key: 'default_model',                  label: 'Model',         type: 'string' },
    { key: 'default_image_generation_model', label: 'Image Model',   type: 'string' },
    { key: 'default_video_generation_model', label: 'Video Model',   type: 'string' },
  ];

  const MCP_NAMES = {
    asana_mcp_merge:           'Asana',           box:                       'Box',
    cbinsights_mcp_cashmere:   'CBInsights',      confluence_mcp_merge:      'Confluence',
    crunchbase:                'Crunchbase',      dropbox:                   'Dropbox',
    factset:                   'FactSet',         gcal:                      'Google Calendar',
    github_mcp_direct:         'GitHub',          google_drive:              'Google Drive',
    jira_mcp_merge:            'Jira',            linear_alt:                'Linear',
    microsoft_teams_mcp_merge: 'MS Teams',        notion_mcp:                'Notion',
    onedrive:                  'OneDrive',        org:                       'Organization',
    outlook:                   'Outlook',         pitchbook_mcp_cashmere:    'Pitchbook',
    scholar:                   'Scholar',         sharepoint:                'SharePoint',
    slack_direct:              'Slack',           social:                    'Social',
    statista_mcp_cashmere:     'Statista',        web:                       'Web',
    wiley_mcp_cashmere:        'Wiley',
  };

  const INPUT_SEL = [
    'textarea[placeholder]', '[data-testid="search-input"]',
    'div[contenteditable="true"]', '[role="textbox"]', 'form textarea', 'input[placeholder]'
  ].join(', ');

  // ── PREFERENCES (localStorage) ─────────────────────────────────────────────
  const PREFS_KEY = 'pplx_panel_v5';
  const loadPrefs  = () => { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; } };
  const savePrefs  = patch => { try { localStorage.setItem(PREFS_KEY, JSON.stringify({ ...loadPrefs(), ...patch })); } catch {} };

  // ── CSS ────────────────────────────────────────────────────────────────────
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: `

    /* ── CSS variables — dark (default) ─────────────────────── */
    #pplx-panel {
      --bg:        #1c1c1c;
      --border:    rgba(255,255,255,0.09);
      --sep:       rgba(255,255,255,0.06);
      --hover:     rgba(255,255,255,0.035);
      --text:      #ededed;
      --lbl:       #95959d;
      --sec:       #a3a3a4;
      --dim:       #a0a0aa;
      --shadow:    0 -2px 10px rgba(0,0,0,0.3);
    }

    /* ── CSS variables — light ───────────────────────────────── */
    #pplx-panel.pp-light {
      --bg:        #ffffff;
      --border:    rgba(0,0,0,0.1);
      --sep:       rgba(0,0,0,0.07);
      --hover:     rgba(0,0,0,0.03);
      --text:      #3f4145;
      --lbl:       #6b7280;
      --sec:       #5f636c;
      --dim:       #cecece;
      --shadow:    0 -2px 10px rgba(0,0,0,0.08);
    }

    /* ── Panel shell ─────────────────────────────────────────── */
    #pplx-panel {
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 50px;
      z-index: 99999;
      display: flex;
      align-items: center;
      background: var(--bg);
      border-top: 1px solid var(--border);
      color: var(--text);
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      box-shadow: var(--shadow);
      transition: transform 0.3s ease;
      user-select: none;
      padding: 0 16px;
      box-sizing: border-box;
      gap: 16px;
    }
    #pplx-panel.pp-hidden { transform: translateY(100%); }

    /* ── Header / Controls ──────────────────────────────────── */
    .pp-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      border-left: 1px solid var(--sep);
      padding-left: 12px;
    }

    .pp-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--dim);
      transition: background 0.35s, box-shadow 0.35s;
    }
    .pp-dot.live    { background: #20b2aa; box-shadow: 0 0 0 3px rgba(32,178,170,0.2); }
    .pp-dot.pending { background: #fbbf24; box-shadow: 0 0 0 3px rgba(251,191,36,0.2); }

    .pp-btn-icon {
      appearance: none; background: none; border: none;
      padding: 2px 4px; border-radius: 4px; cursor: pointer;
      color: var(--sec); font-size: 14px; line-height: 1;
      transition: color 0.15s, background 0.15s;
      display: flex; align-items: center; justify-content: center;
    }
    .pp-btn-icon:hover { color: var(--text); background: var(--hover); }

    #pplx-countdown { font-size: 10px; font-weight: 400; color: #fbbf24; margin-left: -4px; min-width: 24px; }

    /* ── Scrollable row body ─────────────────────────────────── */
    .pp-body {
      flex: 1;
      display: flex;
      align-items: center;
      overflow-x: auto;
      overflow-y: hidden;
      white-space: nowrap;
      scrollbar-width: none; /* Hide scrollbar for cleaner look */
      gap: 16px;
      height: 100%;
    }
    .pp-body::-webkit-scrollbar { display: none; }

    /* ── Sections ────────────────────────────────────────────── */
    .pp-group {
      display: flex;
      align-items: center;
      gap: 12px;
      border-right: 1px solid var(--sep);
      padding-right: 16px;
      height: 100%;
    }
    .pp-group:last-child { border-right: none; padding-right: 0; }
    
    .pp-group-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--sec);
    }

    .pp-item {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .pp-lbl { color: var(--lbl); font-size: 11px; }
    .pp-val { font-weight: 600; color: var(--text); }

    .pp-val.v-zero  { color: var(--dim); font-weight: 400; font-style: italic; }
    .pp-val.v-crit  { color: #f87171; }
    .pp-val.v-low   { color: #fb923c; }
    .pp-val.v-warn  { color: #fbbf24; }
    .pp-val.v-bool-y { color: #20b2aa; }
    .pp-val.v-bool-n { color: var(--lbl); font-weight: 400; }
    .pp-val.v-str    { color: #818cf8; font-weight: 500; font-size: 11px; }

    /* ── Toggle button ───────────────────────────────────────── */
    #pplx-toggle {
      position: fixed;
      bottom: 0;
      right: 16px;
      z-index: 99998;
      background: var(--bg, #1c1c1c);
      border: 1px solid var(--border, rgba(255,255,255,0.09));
      border-bottom: none;
      border-radius: 8px 8px 0 0;
      height: 24px; padding: 0 12px;
      display: flex; align-items: center; gap: 6px;
      cursor: pointer;
      color: var(--sec, #52525b);
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      font-size: 11px; font-weight: 600;
      box-shadow: 0 -2px 8px rgba(0,0,0,0.2);
      transition: background 0.15s, color 0.15s;
    }
    #pplx-toggle.pp-light {
      background: #ffffff;
      border-color: rgba(0,0,0,0.1);
      color: #6b7280;
      box-shadow: 0 -2px 8px rgba(0,0,0,0.08);
    }
    #pplx-toggle:hover { color: var(--text, #ededed); background: var(--hover, rgba(255,255,255,0.035)); }

    /* ── States ─────────────────────────────────────────────── */
    .pp-loading { font-size: 11px; color: var(--sec); font-style: italic; }
    .pp-error   { font-size: 11px; color: #f87171; }

    /* ── Layout Fixes ───────────────────────────────────────── */
    body.pp-panel-active main {
      padding-bottom: 50px !important;
    }
    body.pp-panel-active .pp-chat-shifted {
      translate: 0 calc(-1 * var(--pp-shift, 0px)) !important;
      transition: translate 0.3s ease;
    }
  ` }));

  // ── HELPERS ────────────────────────────────────────────────────────────────
  function searchValClass(n) {
    if (n === 0)  return 'v-zero';
    if (n <= 3)   return 'v-crit';
    if (n <= 10)  return 'v-low';
    if (n <= 25)  return 'v-warn';
    return '';
  }

  function settingRender(v, type) {
    if (v === null || v === undefined) return { html: '—', cls: 'v-zero' };
    if (type === 'bool')   return { html: v ? '✓' : '✗', cls: v ? 'v-bool-y' : 'v-bool-n' };
    if (type === 'string') return { html: v, cls: 'v-str' };
    return { html: String(v), cls: '' };
  }

  // ── BUILD HTML ─────────────────────────────────────────────────────────────
  function buildHTML(rate, settings) {
    let h = '';

    // Searches
    if (rate) {
      h += '<div class="pp-group"><span class="pp-group-label">Searches</span>';
      Object.entries(SEARCH_LIMITS).forEach(([key, { label, total }]) => {
        const remaining = rate[key];
        if (remaining === undefined) return;
        const vcls = searchValClass(remaining);
        const valText = total !== null ? `${remaining}/${total}` : remaining;
        h += `<div class="pp-item"><span class="pp-lbl">${label}</span><span class="pp-val ${vcls}">${valText}</span></div>`;
      });
      h += '</div>';
    } else {
      h += '<div class="pp-group"><span class="pp-error">⚠ Rate limit data unavailable</span></div>';
    }

    // MCP Sources
    const mcpRaw = rate?.sources?.source_to_limit;
    if (mcpRaw) {
      const active = Object.entries(mcpRaw).filter(([, v]) => v.monthly_limit !== null && v.monthly_limit !== 0);
      if (active.length) {
        h += '<div class="pp-group"><span class="pp-group-label">MCP</span>';
        active.forEach(([key, { monthly_limit, remaining }]) => {
          const vcls = searchValClass(remaining);
          h += `<div class="pp-item"><span class="pp-lbl">${MCP_NAMES[key] || key}</span><span class="pp-val ${vcls}">${remaining}/${monthly_limit}</span></div>`;
        });
        h += '</div>';
      }
    }

    // Settings
    if (settings) {
      h += '<div class="pp-group"><span class="pp-group-label">Settings</span>';
      SETTINGS_FIELDS.forEach(({ key, label, type }) => {
        const raw = settings[key];
        if (raw === undefined) return;
        const { html: vhtml, cls } = settingRender(raw, type);
        h += `<div class="pp-item"><span class="pp-lbl">${label}</span><span class="pp-val ${cls}">${vhtml}</span></div>`;
      });
      h += '</div>';
    }

    return h || '<div class="pp-loading">No data to display</div>';
  }

  // ── FETCH & RENDER ─────────────────────────────────────────────────────────
  async function fetchAndRender() {
    const panel = document.getElementById('pplx-panel');
    if (!panel) return;
    const body  = panel.querySelector('.pp-body');
    const dot   = panel.querySelector('.pp-dot');
    const cd    = document.getElementById('pplx-countdown');

    if (dot)  dot.classList.remove('live', 'pending');

    const [r1, r2] = await Promise.allSettled([
      fetch('/rest/rate-limit/all', { credentials: 'include' }).then(r => r.json()),
      fetch('/rest/user/settings',  { credentials: 'include' }).then(r => r.json()),
    ]);

    const rate     = r1.status === 'fulfilled' ? r1.value : null;
    const settings = r2.status === 'fulfilled' ? r2.value : null;

    if (body) body.innerHTML = buildHTML(rate, settings);
    if (dot)  dot.classList.add('live');
    if (cd)   cd.textContent = '';
  }

  // ── POST-QUERY REFRESH ─────────────────────────────────────────────────────
  let _rt = null, _ct = null;

  function scheduleRefresh() {
    clearTimeout(_rt); clearInterval(_ct);
    const dot  = document.querySelector('#pplx-panel .pp-dot');
    const cd   = document.getElementById('pplx-countdown');
    if (dot)  { dot.classList.remove('live'); dot.classList.add('pending'); }
    let s = 3;
    if (cd) cd.textContent = ` (${s}s)`;
    _ct = setInterval(() => { s--; if (cd) cd.textContent = s > 0 ? ` (${s}s)` : ''; if (s <= 0) clearInterval(_ct); }, 1000);
    _rt = setTimeout(() => { clearInterval(_ct); fetchAndRender(); }, 3000);
  }

  function hookSubmitEvents() {
    const _orig = window.fetch;
    window.fetch = function (...a) {
      try {
        const url = typeof a[0] === 'string' ? a[0] : a[0] instanceof Request ? a[0].url : '';
        const method = (a[0] instanceof Request ? a[0].method : a[1]?.method) || 'GET';
        if (method.toUpperCase() === 'POST' &&
            url.includes('/rest/') && !url.includes('/rest/rate-limit') && !url.includes('/rest/user/settings'))
          scheduleRefresh();
      } catch (_) {}
      return _orig.apply(this, a);
    };
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey &&
          (e.target.matches(INPUT_SEL) || !!e.target.closest('[role="textbox"],form')))
        scheduleRefresh();
    }, true);
    document.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      const lbl = (b.getAttribute('aria-label') || '').toLowerCase();
      if (b.type === 'submit' || lbl.includes('send') || lbl.includes('submit') || lbl.includes('search'))
        scheduleRefresh();
    }, true);
  }

  // ── THEME ──────────────────────────────────────────────────────────────────
  function applyTheme(isDark) {
    const panel  = document.getElementById('pplx-panel');
    const toggle = document.getElementById('pplx-toggle');
    if (panel)  panel.classList.toggle('pp-light', !isDark);
    if (toggle) toggle.classList.toggle('pp-light', !isDark);
    const btn = document.querySelector('[data-a="theme"]');
    if (btn) btn.textContent = isDark ? '☀' : '☾';
  }

  function toggleTheme() {
    const panel = document.getElementById('pplx-panel');
    if (!panel) return;
    const nowDark = panel.classList.contains('pp-light');
    applyTheme(nowDark);
    savePrefs({ dark: nowDark });
  }

  // ── TOGGLE PANEL ───────────────────────────────────────────────────────────
  function togglePanelVisibility() {
    const panel = document.getElementById('pplx-panel');
    const toggle = document.getElementById('pplx-toggle');
    if (!panel) return;
    const isHidden = panel.classList.toggle('pp-hidden');
    if (toggle) toggle.style.display = isHidden ? 'flex' : 'none';
    savePrefs({ hidden: isHidden });
    updateChatSafeArea();
  }

  // ── LAYOUT ─────────────────────────────────────────────────────────────────
  let _ro = null;
  
  function updateChatSafeArea() {
    const panel = document.getElementById('pplx-panel');
    if (!panel) return;
    const isHidden = panel.classList.contains('pp-hidden');
    document.body.classList.toggle('pp-panel-active', !isHidden);

    if (isHidden) {
      document.querySelectorAll('.pp-chat-shifted').forEach(el => {
        el.classList.remove('pp-chat-shifted');
        el.style.removeProperty('--pp-shift');
      });
      return;
    }

    const inputs = document.querySelectorAll(INPUT_SEL);
    for (const input of inputs) {
      if (input.closest('.pp-chat-shifted')) continue;
      
      let el = input;
      let candidate = null;
      while (el && el !== document.body && el.tagName !== 'MAIN') {
        const style = window.getComputedStyle(el);
        if (style.position === 'sticky' || style.position === 'fixed') {
          candidate = el;
          break;
        }
        if (!candidate && style.position === 'absolute') {
          candidate = el;
        }
        el = el.parentElement;
      }
      if (candidate) candidate.classList.add('pp-chat-shifted');
    }

    // Dynamically calculate the required shift to clear the 50px panel
    document.querySelectorAll('.pp-chat-shifted').forEach(candidate => {
      const currentShift = parseFloat(candidate.style.getPropertyValue('--pp-shift')) || 0;
      const rect = candidate.getBoundingClientRect();
      const naturalBottom = rect.bottom + currentShift;
      const gap = window.innerHeight - naturalBottom;
      const shift = Math.min(50, Math.max(0, 50 - gap));
      candidate.style.setProperty('--pp-shift', `${shift}px`);
    });
  }

  function updatePanelLayout() {
    const panel = document.getElementById('pplx-panel');
    if (!panel) return;
    
    let left = 0, width = '100%';
    const main = document.querySelector('main');
    
    if (main) {
      const rect = main.getBoundingClientRect();
      if (rect.left > 0 && rect.width > 0) {
        left = rect.left;
        width = rect.width + 'px';
      }
    } else {
      const sidebar = document.querySelector('aside, nav');
      if (sidebar) {
        const rect = sidebar.getBoundingClientRect();
        if (rect.left <= 10 && rect.width > 0 && rect.width < window.innerWidth / 2) {
          left = rect.right;
          width = `calc(100% - ${left}px)`;
        }
      }
    }

    panel.style.left = left + 'px';
    panel.style.width = width;

    updateChatSafeArea();
  }

  let _roFrame = null;
  function debouncedUpdateLayout() {
    if (_roFrame) cancelAnimationFrame(_roFrame);
    _roFrame = requestAnimationFrame(updatePanelLayout);
  }

  function observeLayout() {
    if (_ro) _ro.disconnect();
    _ro = new ResizeObserver(debouncedUpdateLayout);
    _ro.observe(document.body);
    const main = document.querySelector('main');
    if (main) _ro.observe(main);
    const sidebar = document.querySelector('aside, nav');
    if (sidebar) _ro.observe(sidebar);
  }

  // ── INJECT ─────────────────────────────────────────────────────────────────
  function inject() {
    if (document.getElementById('pplx-panel')) return;

    const prefs  = loadPrefs();
    const isDark = prefs.dark !== false;
    const isHidden = prefs.hidden === true;

    const panel = document.createElement('div');
    panel.id = 'pplx-panel';
    if (isHidden) panel.classList.add('pp-hidden');
    
    panel.innerHTML = `
      <div class="pp-body"><div class="pp-loading">Loading…</div></div>
      <div class="pp-controls">
        <span class="pp-dot" title="Status"></span>
        <button class="pp-btn-icon" data-a="theme" title="Toggle Theme">☀</button>
        <button class="pp-btn-icon" data-a="refresh" title="Refresh Data">↻</button>
        <button class="pp-btn-icon" data-a="close" title="Hide Panel">✕</button>
        <span id="pplx-countdown"></span>
      </div>
    `;

    document.body.appendChild(panel);

    const toggle = document.createElement('button');
    toggle.id = 'pplx-toggle';
    toggle.innerHTML = 'Show Usage';
    toggle.style.display = isHidden ? 'flex' : 'none';
    document.body.appendChild(toggle);

    // Apply saved theme
    applyTheme(isDark);

    // Events
    panel.addEventListener('click', e => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'close')   togglePanelVisibility();
      if (a === 'refresh') fetchAndRender();
      if (a === 'theme')   toggleTheme();
    });
    toggle.addEventListener('click', togglePanelVisibility);

    // Initial fetch
    fetchAndRender();
    
    // Initial Layout & Tracking
    updatePanelLayout();
    observeLayout();
  }

  // ── BOOT ───────────────────────────────────────────────────────────────────
  hookSubmitEvents();
  const boot = () => setTimeout(inject, 1600);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  function handleNavigation() {
    setTimeout(() => { 
      if (!document.getElementById('pplx-panel')) inject(); 
      else { updatePanelLayout(); observeLayout(); }
    }, 1200);
  }

  const origPush = history.pushState;
  history.pushState = function(...args) { origPush.apply(this, args); handleNavigation(); };
  
  const origReplace = history.replaceState;
  history.replaceState = function(...args) { origReplace.apply(this, args); handleNavigation(); };
  
  window.addEventListener('popstate', handleNavigation);

})();
