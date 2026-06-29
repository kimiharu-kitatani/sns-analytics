const STRATEGY_STORAGE_KEY = 'sns_analytics_strategy_notes_v1';
const EXPERIMENT_STORAGE_KEY = 'sns_analytics_experiment_notes_v1';
const CATEGORY_ALL = '全体';
const DASHBOARD_MENU_LEFT_KEY = 'kita_dashboard_menu_left_v1';
const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';
const INSIGHT_ORDER = ['X', 'YouTube', 'LINE公式', 'TikTok', 'Instagram'];

const PLATFORM_URLS = {
  'LINE公式': 'https://manager.line.biz/',
  'YouTube': 'https://studio.youtube.com/',
  'TikTok': 'https://www.tiktok.com/creator-center/analytics',
  'Instagram': 'https://www.instagram.com/',
  'X': 'https://x.com/',
};

let globalData = {};
let fetchedHistoryData = {};
let fetchLogData = [];
let analyticsChart = null;
let currentChartPeriod = '1m';
let currentChartTarget = 'total';
let currentInsightCategory = 'X';
let currentHistoryMonth = null;
let strategyNotes = loadFromStorage(STRATEGY_STORAGE_KEY, []);
let experimentLogs = loadFromStorage(EXPERIMENT_STORAGE_KEY, []);

document.addEventListener('DOMContentLoaded', () => {
  renderCommonSidebar();
  initCommonSidebarState();
  updateSidebarClock();
  setupBaseDates();
  fetchData();
  setupDataForm();
  setupStrategyForm();
  setupExperimentForm();
  setupExportButton();
  setupInsightFilter();
  setupImportExport();
  setupSideNav();
  setupHistoryNavigation();
  setInterval(updateSidebarClock, 60 * 1000);
});

function setupSideNav() {
  const navLinks = document.querySelectorAll('.nav-link');
  if (!navLinks.length) return;

  const sectionIds = [...navLinks].map((a) => a.getAttribute('href').slice(1));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navLinks.forEach((a) => a.classList.remove('is-active'));
        const active = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
        if (active) active.classList.add('is-active');
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });

  sectionIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(link.getAttribute('href').slice(1));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Failed to load ${key}`, error);
    return fallback;
  }
}

const DEFAULT_LEFT_MENU = [
  { id: 'dashboard-multitask', type: 'link', label: 'マルチタスク', subtitle: 'トップページ', href: 'file:///C:/Kita/webdocs/kitatani/dashboard/index.html', mode: 'blank', appId: 'dashboard', trackingId: '', iconText: 'M', iconBg: 'var(--dashboard-accent)', iconUrl: '', enabled: true },
  { id: 'section-management', type: 'section', label: '管理', enabled: true },
  { id: 'sales-management', type: 'link', label: '売上管理', subtitle: '最大100プロジェクト', href: 'file:///C:/Kita/project/%E6%9C%8860%E7%AE%A1%E7%90%86.html', mode: 'blank', appId: '', trackingId: '売上管理', iconText: '', iconBg: '#f59e0b', iconUrl: 'https://ui-avatars.com/api/?name=%24&background=f59e0b&color=fff', enabled: true },
  { id: 'recorder-summary', type: 'link', label: '録音要約', subtitle: 'Recorder', href: 'http://127.0.0.1:8766/', mode: 'blank', appId: '', trackingId: 'recorder-summary', iconText: 'R', iconBg: '#16a34a', iconUrl: '', serverPort: '8766', enabled: true },
  { id: 'daily-summary', type: 'link', label: '何を学んだ？', subtitle: 'Daily Summary', href: 'http://127.0.0.1:3000/daily-summary/', mode: 'blank', appId: '', trackingId: 'daily-summary', iconText: '学', iconBg: '#334155', iconUrl: '', serverPort: '3000', enabled: true },
  { id: 'section-projects', type: 'section', label: 'Projects', enabled: true },
  { id: 'project-ai-support', type: 'link', label: 'AIサポート', subtitle: 'AI開発', href: 'file:///C:/Kita/project/AI%E3%82%B5%E3%83%9D%E3%83%BC%E3%83%88/index.html', mode: 'blank', appId: '', trackingId: 'proj-AIサポート', iconText: '', iconBg: '#7c3aed', iconUrl: 'https://ui-avatars.com/api/?name=AI&background=7c3aed&color=fff', enabled: true },
  { id: 'project-sales-support', type: 'link', label: '案件獲得サポート', subtitle: '自社開発', href: 'file:///C:/Kita/project/%E6%A1%88%E4%BB%B6%E7%8D%B2%E5%BE%97%E3%82%B5%E3%83%9D%E3%83%BC%E3%83%88/index.html', mode: 'blank', appId: '', trackingId: 'proj-案件獲得サポート', iconText: '', iconBg: '#33aaff', iconUrl: 'https://ui-avatars.com/api/?name=S&background=33aaff&color=fff', enabled: true },
  { id: 'project-kagaribi', type: 'link', label: 'KAGARIBI', subtitle: 'クライアント', href: 'file:///C:/Kita/project/KAGARIBI/index.html', mode: 'blank', appId: '', trackingId: 'proj-KAGARIBI', iconText: '', iconBg: '#ff9966', iconUrl: 'https://ui-avatars.com/api/?name=K&background=ff9966&color=fff', enabled: true },
  { id: 'project-matsuyama', type: 'link', label: '松山さん', subtitle: '動画制作', href: 'file:///C:/Kita/project/%E3%81%BE%E3%81%95%E3%83%87%E3%82%B6%E3%82%A4%E3%83%B3%E6%A7%98/index.html', mode: 'blank', appId: '', trackingId: 'proj-松山さん', iconText: '', iconBg: '#6a11cb', iconUrl: 'https://ui-avatars.com/api/?name=M&background=6a11cb&color=fff', enabled: true },
  { id: 'project-hongo', type: 'link', label: '本郷さん', subtitle: 'EC運用', href: 'file:///C:/Kita/project/%E6%9C%AC%E9%83%B7%E3%81%95%E3%82%93/index.html', mode: 'blank', appId: '', trackingId: 'proj-本郷さん', iconText: '', iconBg: '#ff5e62', iconUrl: 'https://ui-avatars.com/api/?name=H&background=ff5e62&color=fff', enabled: true },
  { id: 'project-samurai', type: 'link', label: 'SAMURAI', subtitle: '学習環境', href: 'file:///C:/Kita/project/SAMURAI/index.html', mode: 'blank', appId: '', trackingId: 'proj-SAMURAI', iconText: '', iconBg: '#222', iconUrl: 'https://ui-avatars.com/api/?name=S&background=222&color=fff', enabled: true },
  { id: 'project-nomad', type: 'link', label: 'Nomad', subtitle: 'ノマド', href: 'file:///C:/Kita/project/trip_nomad/202606_awaji/index.html', mode: 'blank', appId: '', trackingId: 'proj-Nomad', iconText: '', iconBg: '#20b2aa', iconUrl: 'https://ui-avatars.com/api/?name=N&background=20b2aa&color=fff', enabled: true },
  { id: 'project-sales-applications', type: 'link', label: '営業応募', subtitle: 'Sales', href: '../../../sales_applications.html', mode: 'blank', appId: 'sales', trackingId: 'proj-Sales', iconText: '', iconBg: '#e11d48', iconUrl: 'https://ui-avatars.com/api/?name=SA&background=e11d48&color=fff', enabled: true },
  { id: 'project-futsal', type: 'link', label: 'フットサル', subtitle: 'フットサル', href: 'file:///C:/Kita/project/%E3%83%95%E3%83%83%E3%83%88%E3%82%B5%E3%83%AB/index.html', mode: 'blank', appId: '', trackingId: 'proj-Futsal', iconText: '', iconBg: '#168a5b', iconUrl: 'https://ui-avatars.com/api/?name=FS&background=168a5b&color=fff', enabled: true },
];

function getDashboardLeftMenu() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DASHBOARD_MENU_LEFT_KEY) || 'null');
    return Array.isArray(parsed) ? parsed : DEFAULT_LEFT_MENU;
  } catch (_) {
    return DEFAULT_LEFT_MENU;
  }
}

function renderCommonSidebar() {
  const nav = document.getElementById('common-sidebar-nav');
  if (!nav) return;
  const items = getDashboardLeftMenu().filter((item) => item.enabled !== false);
  nav.innerHTML = items.map((item) => {
    if (item.type === 'section') {
      return `<div class="nav-section-title">${escapeHtml(item.label || 'Section')}</div>`;
    }
    const iconText = item.iconText || (item.label || '?').slice(0, 1);
    const icon = item.iconUrl
      ? `<img src="${escapeHtml(item.iconUrl)}" alt="" onerror="this.style.display='none'; this.parentElement.textContent='${escapeHtml(iconText)}'">`
      : escapeHtml(iconText);
    const target = item.mode === 'blank' ? ' target="_blank"' : '';
    const href = item.mode === 'dashboard-tab' ? 'file:///C:/Kita/webdocs/kitatani/dashboard/index.html' : (item.href || '#');
    return `
      <a class="nav-item${item.id === 'sns-analytics' ? ' is-current' : ''}" href="${escapeHtml(href)}"${target}>
        <div class="nav-icon" style="background:${escapeHtml(item.iconBg || 'var(--dashboard-accent)')}; color:#fff;">${icon}</div>
        <div class="nav-content">
          <div class="nav-label">${escapeHtml(item.label || '')}</div>
          <div class="nav-stats">${escapeHtml(item.subtitle || '')}${item.serverPort ? ` <span class="server-dot" data-port="${escapeHtml(item.serverPort)}">●</span>` : ''}</div>
        </div>
      </a>
    `;
  }).join('');
}

function initCommonSidebarState() {
  const sidebar = document.getElementById('common-sidebar');
  const isCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  if (isCollapsed) sidebar?.classList.add('collapsed');
  updateCommonSidebarIcon(isCollapsed);
}

function toggleCommonSidebar() {
  const sidebar = document.getElementById('common-sidebar');
  if (!sidebar) return;
  const isCollapsed = sidebar.classList.toggle('collapsed');
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  updateCommonSidebarIcon(isCollapsed);
}

function updateCommonSidebarIcon(isCollapsed) {
  const icon = document.getElementById('toggle-icon');
  if (icon) icon.textContent = isCollapsed ? '❯' : '❮';
}

function updateSidebarClock() {
  const dateEl = document.getElementById('hdr-date');
  if (!dateEl) return;
  const now = new Date();
  dateEl.textContent = now.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function setupBaseDates() {
  const today = new Date().toISOString().slice(0, 10);
  ['entry-date', 'strategy-date', 'experiment-date'].forEach((id) => {
    const field = document.getElementById(id);
    if (field) {
      field.value = today;
    }
  });
}

async function fetchData() {
  try {
    const cloudPayload = await fetchSupabaseDashboardData();
    if (cloudPayload) {
      globalData = cloudPayload.trendData;
      fetchedHistoryData = cloudPayload.trendData;
      fetchLogData = cloudPayload.fetchLog;

      populateCategorySelects();
      renderSummary(globalData);
      renderCharts(globalData);
      renderHistory();
      renderFetchLog();
      renderInsights();
      renderStrategyBoard();
      renderExperimentLog();
      generateInputFields(globalData);
      prefillLatestFetchedData(cloudPayload.latestCounts);
      return;
    }

    const cacheBuster = `?t=${Date.now()}`;
    const [manualResponse, fetchedHistoryResponse, fetchedResponse, fetchLogResponse] = await Promise.all([
      fetch(`data.json${cacheBuster}`),
      fetch(`fetched_history.json${cacheBuster}`).catch(() => null),
      fetch(`fetched_data.json${cacheBuster}`).catch(() => null),
      fetch(`fetch_log.json${cacheBuster}`).catch(() => null)
    ]);

    globalData = await manualResponse.json();
    fetchedHistoryData = fetchedHistoryResponse && fetchedHistoryResponse.ok ? await fetchedHistoryResponse.json() : {};
    fetchLogData = fetchLogResponse && fetchLogResponse.ok ? await fetchLogResponse.json() : [];

    populateCategorySelects();
    renderSummary(globalData);
    renderCharts(globalData);
    renderHistory();
    renderFetchLog();
    renderInsights();
    renderStrategyBoard();
    renderExperimentLog();
    generateInputFields(globalData);

    if (fetchedResponse && fetchedResponse.ok) {
      const fetchedData = await fetchedResponse.json();
      prefillLatestFetchedData(fetchedData);
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    alert('データの読み込みに失敗しました');
  }
}

function getSupabaseDashboardConfig() {
  const config = window.SNS_ANALYTICS_CONFIG;
  if (!config || !config.supabaseUrl || !config.supabaseAnonKey) {
    return null;
  }
  if (
    config.supabaseUrl.includes('YOUR_PROJECT_ID') ||
    config.supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')
  ) {
    return null;
  }
  return {
    supabaseUrl: config.supabaseUrl.replace(/\/$/, ''),
    supabaseAnonKey: config.supabaseAnonKey,
    table: config.table || 'sns_follower_records',
  };
}

async function fetchSupabaseDashboardData() {
  const config = getSupabaseDashboardConfig();
  if (!config) return null;

  const endpoint = `${config.supabaseUrl}/rest/v1/${encodeURIComponent(config.table)}?select=platform,record_date,follower_count,source,status,error_message,created_at&order=record_date.asc,platform.asc`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${config.supabaseAnonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabaseからデータを取得できませんでした: ${response.status}`);
  }

  const rows = await response.json();
  return buildDashboardDataFromSupabaseRows(Array.isArray(rows) ? rows : []);
}

function buildDashboardDataFromSupabaseRows(rows) {
  const trendData = {};
  const fetchLog = [];

  rows.forEach((row) => {
    const platform = row.platform;
    if (!platform) return;

    if (row.status === 'success' && row.follower_count !== null && row.follower_count !== undefined) {
      const series = trendData[platform] || [];
      series.push({
        date: row.record_date,
        count: Number(row.follower_count),
        comment: row.source || 'cloud',
      });
      trendData[platform] = series;
    }

    if (row.status && row.status !== 'success') {
      fetchLog.push({
        timestamp: row.created_at,
        source: row.source || 'cloud',
        date: row.record_date,
        status: row.status,
        counts: {},
        saved: false,
        errors: row.error_message ? [row.error_message] : [],
      });
    }
  });

  Object.values(trendData).forEach((series) => {
    series.sort((a, b) => a.date.localeCompare(b.date));
  });

  const latestCounts = {};
  Object.entries(trendData).forEach(([platform, series]) => {
    const latest = series[series.length - 1];
    if (latest) latestCounts[platform] = latest.count;
  });

  return { trendData, fetchLog, latestCounts };
}

function prefillLatestFetchedData(fetchedData) {
  Object.keys(fetchedData).forEach((platform) => {
    const input = document.getElementById(`input-${platform}`);
    if (input) {
      input.value = fetchedData[platform];
      input.style.backgroundColor = '#e8f5e9';
      input.title = '取得した最新値';
    }
  });
}

function getPlatforms() {
  return Object.keys(globalData);
}

function getCategories() {
  return [CATEGORY_ALL, ...getPlatforms()];
}

function populateCategorySelects() {
  const selectIds = [
    'strategy-category',
    'experiment-category',
  ];
  const options = getCategories().map((category) => `<option value="${category}">${category}</option>`).join('');
  selectIds.forEach((id) => {
    const select = document.getElementById(id);
    if (select) {
      select.innerHTML = options;
    }
  });
}

function renderHeroHeader(data) {
  const container = document.getElementById('hero-section');
  if (!container) return;

  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  const total = Object.values(data).reduce((sum, entries) => {
    const last = entries[entries.length - 1];
    return sum + (last ? last.count : 0);
  }, 0);
  const platformCount = Object.keys(data).length;

  container.innerHTML = `
    <div class="hero-inner">
      <div class="hero-left">
        <div class="hero-label">SNS Analytics</div>
        <div class="hero-date">${today}</div>
        <div class="hero-subtitle">フォロワー管理ダッシュボード</div>
      </div>
      <div class="hero-right">
        <div class="hero-stat">
          <div class="hero-stat-value">${total.toLocaleString()}</div>
          <div class="hero-stat-label">総フォロワー数</div>
        </div>
        <div class="hero-stat-divider"></div>
        <div class="hero-stat">
          <div class="hero-stat-value">${platformCount}</div>
          <div class="hero-stat-label">プラットフォーム</div>
        </div>
      </div>
    </div>
  `;
}

function renderSummary(data) {
  renderHeroHeader(data);
  const container = document.getElementById('summary-section');
  container.innerHTML = '';

  Object.keys(data).forEach((platform) => {
    const entries = data[platform];
    const last = entries[entries.length - 1];
    const prev = entries[entries.length - 2];
    const diff = (last && prev) ? last.count - prev.count : null;
    const url = PLATFORM_URLS[platform] || '#';

    const card = document.createElement('div');
    card.className = 'summary-card';
    card.innerHTML = `
      <div class="summary-platform">
        <a href="${url}" target="_blank" rel="noopener noreferrer" class="platform-link">${platform}</a>
      </div>
      <div class="summary-count">${last ? last.count.toLocaleString() : '0'}</div>
      ${renderDiffChip(diff)}
      <div class="summary-date">
        <svg class="summary-date-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3v2M17 3v2M4 8h16M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ${last ? last.date : '-'}
      </div>
    `;
    container.appendChild(card);
  });
}

function renderDiffChip(diff) {
  if (diff === null) {
    return '';
  }
  const diffClass = diff > 0 ? 'diff-up' : diff < 0 ? 'diff-down' : 'diff-zero';
  const diffText = diff > 0 ? `+${diff}` : `${diff}`;
  return `<div class="summary-diff ${diffClass}">${diffText}</div>`;
}

function getFilteredData(data, period) {
  const cutoff = getPeriodCutoff(period);
  if (!cutoff) {
    return data;
  }

  const filtered = {};
  Object.keys(data).forEach((platform) => {
    filtered[platform] = data[platform].filter((e) => e.date >= cutoff);
  });
  return filtered;
}

function getPeriodCutoff(period) {
  const now = new Date();
  if (period === '1m') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  }
  if (period === '3m') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  }
  if (period === '6m') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().slice(0, 10);
  }
  if (period === '1y') {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function getChartTargets(data) {
  const labelMap = {
    'LINE公式': 'LINE',
    Instagram: 'Insta',
  };
  const preferredOrder = ['X', 'YouTube', 'LINE公式', 'TikTok', 'Instagram'];
  const platforms = [
    ...preferredOrder.filter((platform) => data[platform]),
    ...Object.keys(data).filter((platform) => !preferredOrder.includes(platform)),
  ];
  return [
    { key: 'total', label: '合計' },
    ...platforms.map((platform) => ({ key: platform, label: labelMap[platform] || platform })),
  ];
}

function getLatestCountOnOrBefore(entries, targetDate) {
  let latest = null;
  for (const entry of entries) {
    if (entry.date > targetDate) break;
    latest = entry.count;
  }
  return latest;
}

function buildTotalChartData(data, labels) {
  const sortedByPlatform = Object.fromEntries(
    Object.entries(data).map(([platform, entries]) => [
      platform,
      [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    ])
  );

  return labels.map((label) => {
    let total = 0;
    let hasValue = false;
    Object.values(sortedByPlatform).forEach((entries) => {
      const count = getLatestCountOnOrBefore(entries, label);
      if (count !== null) {
        total += count;
        hasValue = true;
      }
    });
    return hasValue ? total : null;
  });
}

function renderCharts(data) {
  const controls = document.getElementById('chart-controls');
  const body = document.getElementById('chart-body');
  if (!controls || !body) return;

  controls.innerHTML = '';
  body.innerHTML = '';

  const chartTargets = getChartTargets(data);
  if (!chartTargets.some((target) => target.key === currentChartTarget)) {
    currentChartTarget = 'total';
  }

  const controlGrid = document.createElement('div');
  controlGrid.className = 'chart-control-grid';

  const targetGroup = document.createElement('div');
  targetGroup.className = 'chart-control-group';
  targetGroup.innerHTML = '<div class="chart-control-label">表示対象</div>';
  const targetTabBar = document.createElement('div');
  targetTabBar.className = 'chart-tab-bar';
  targetTabBar.id = 'chart-target-tabs';
  chartTargets.forEach(({ key, label }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `chart-tab-btn chart-target-tab${key === currentChartTarget ? ' is-active' : ''}`;
    btn.textContent = label;
    btn.addEventListener('click', () => {
      currentChartTarget = key;
      renderCharts(data);
    });
    targetTabBar.appendChild(btn);
  });
  targetGroup.appendChild(targetTabBar);

  const periodGroup = document.createElement('div');
  periodGroup.className = 'chart-control-group';
  periodGroup.innerHTML = '<div class="chart-control-label">期間</div>';
  const periodTabBar = document.createElement('div');
  periodTabBar.className = 'chart-tab-bar';
  periodTabBar.id = 'chart-period-tabs';
  const periods = [
    { key: '1m', label: '1ヶ月' },
    { key: '3m', label: '3ヶ月' },
    { key: '6m', label: '6ヶ月' },
    { key: '1y', label: '1年' },
  ];
  periods.forEach(({ key, label }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `chart-tab-btn chart-period-tab${key === currentChartPeriod ? ' is-active' : ''}`;
    btn.textContent = label;
    btn.addEventListener('click', () => {
      currentChartPeriod = key;
      renderCharts(data);
    });
    periodTabBar.appendChild(btn);
  });
  periodGroup.appendChild(periodTabBar);
  controlGrid.appendChild(targetGroup);
  controlGrid.appendChild(periodGroup);
  controls.appendChild(controlGrid);

  const filteredData = getFilteredData(data, currentChartPeriod);

  const wrapper = document.createElement('div');
  wrapper.className = 'chart-container chart-container-wide';
  const canvas = document.createElement('canvas');
  wrapper.appendChild(canvas);
  body.appendChild(wrapper);

  const palette = {
    total: '#2563eb',
    'LINE公式': '#20b857',
    YouTube: '#ef4444',
    TikTok: '#111827',
    Instagram: '#d946ef',
    X: '#0f172a',
  };

  let labels = [];
  let datasets = [];
  if (currentChartTarget === 'total') {
    labels = [...new Set(
      Object.values(filteredData).flatMap((entries) => entries.map((entry) => entry.date))
    )].sort();
    datasets = [{
      label: '合計',
      data: buildTotalChartData(data, labels),
      borderColor: palette.total,
      backgroundColor: palette.total,
      spanGaps: true,
      fill: false,
      tension: 0.25,
      pointRadius: 3,
      pointHoverRadius: 5,
    }];
  } else {
    const entries = filteredData[currentChartTarget] || [];
    labels = entries.map((entry) => entry.date);
    datasets = [{
      label: getChartTargets(data).find((target) => target.key === currentChartTarget)?.label || currentChartTarget,
      data: entries.map((entry) => entry.count),
      borderColor: palette[currentChartTarget] || '#6bb6ff',
      backgroundColor: palette[currentChartTarget] || '#6bb6ff',
      spanGaps: true,
      fill: false,
      tension: 0.25,
      pointRadius: 3,
      pointHoverRadius: 5,
    }];
  }

  if (analyticsChart) {
    analyticsChart.destroy();
  }

  analyticsChart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        title: { display: true, text: `${datasets[0]?.label || 'SNS'} フォロワー推移` },
        legend: { display: false }
      },
      scales: { x: { ticks: { maxTicksLimit: 10 } } }
    }
  });
}

function generateInputFields(data) {
  const container = document.getElementById('inputs-container');
  if (!container) return;
  container.innerHTML = '';

  Object.keys(data).forEach((platform) => {
    const div = document.createElement('div');
    div.className = 'form-group';

    const label = document.createElement('label');
    label.htmlFor = `input-${platform}`;
    label.textContent = `${platform}（現在の総数）`;

    const input = document.createElement('input');
    input.type = 'number';
    input.id = `input-${platform}`;
    input.name = platform;

    const lastEntry = data[platform][data[platform].length - 1];
    if (lastEntry) {
      input.value = lastEntry.count;
      input.placeholder = `前回: ${lastEntry.count}`;
    }

    div.appendChild(label);
    div.appendChild(input);
    container.appendChild(div);
  });
}

function setupDataForm() {
  const form = document.getElementById('data-entry-form');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const date = document.getElementById('entry-date').value;
    if (!date) {
      alert('日付を入力してください');
      return;
    }

    const newData = JSON.parse(JSON.stringify(globalData));
    let hasUpdate = false;

    Object.keys(globalData).forEach((platform) => {
      const input = document.getElementById(`input-${platform}`);
      const value = parseInt(input.value, 10);

      if (!Number.isNaN(value)) {
        hasUpdate = true;
        newData[platform] = newData[platform].filter(e => e.date !== date);
        const lastEntry = globalData[platform][globalData[platform].length - 1];
        const diff = lastEntry ? value - lastEntry.count : 0;
        const sign = diff >= 0 ? '+' : '';
        newData[platform].push({ date, count: value, comment: `手動入力(${sign}${diff})` });
      }
    });

    if (!hasUpdate) {
      alert('少なくとも1つの数値を入力してください');
      return;
    }

    globalData = newData;
    renderSummary(globalData);
    renderCharts(globalData);
    renderHistory();
    renderInsights();
    generateInputFields(globalData);

    const jsonString = JSON.stringify(newData, null, 2);

    // 一覧プレビューを表示
    document.getElementById('output-section').style.display = 'block';
    renderHistoryTable('output-preview', globalData);

    // サーバーに自動保存を試みる
    let savedToServer = false;
    try {
      const response = await fetch('/api/save-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonString,
      });
      const payload = response.ok ? await response.json() : null;
      savedToServer = payload?.ok === true;
    } catch (_) {
      // サーバー未起動の場合はダウンロードにフォールバック
    }

    const saveMsg = document.getElementById('output-save-msg');
    const downloadBtn = document.getElementById('download-btn');

    if (savedToServer) {
      downloadBtn.style.display = 'none';
      if (saveMsg) {
        saveMsg.textContent = '✅ サーバーに保存しました';
        saveMsg.className = 'import-status is-success';
      }
    } else {
      downloadBtn.style.display = '';
      if (saveMsg) {
        saveMsg.textContent = 'サーバー未接続 — ダウンロードして差し替えてください';
        saveMsg.className = 'import-status is-error';
      }
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      downloadBtn.onclick = () => {
        const link = document.createElement('a');
        link.href = url;
        link.download = 'data.json';
        link.click();
      };
    }
  });
}

function setupStrategyForm() {
  const form = document.getElementById('strategy-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const note = {
      id: crypto.randomUUID(),
      date: document.getElementById('strategy-date').value,
      type: document.getElementById('strategy-type').value,
      category: document.getElementById('strategy-category').value,
      status: document.getElementById('strategy-status').value,
      title: document.getElementById('strategy-title').value.trim(),
      detail: document.getElementById('strategy-detail').value.trim()
    };

    if (!note.date || !note.title || !note.detail) {
      alert('日付、タイトル、詳細を入力してください');
      return;
    }

    strategyNotes.unshift(note);
    saveToStorage(STRATEGY_STORAGE_KEY, strategyNotes);
    form.reset();
    setupBaseDates();
    populateCategorySelects();
    renderStrategyBoard();
    renderInsights();
  });
}

function setupExperimentForm() {
  const form = document.getElementById('experiment-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const log = {
      id: crypto.randomUUID(),
      date: document.getElementById('experiment-date').value,
      category: document.getElementById('experiment-category').value,
      impact: document.getElementById('experiment-impact').value,
      metric: document.getElementById('experiment-metric').value.trim(),
      action: document.getElementById('experiment-action').value.trim(),
      note: document.getElementById('experiment-note').value.trim()
    };

    if (!log.date || !log.category || !log.action) {
      alert('開始日、カテゴリ、施策内容を入力してください');
      return;
    }

    experimentLogs.unshift(log);
    saveToStorage(EXPERIMENT_STORAGE_KEY, experimentLogs);
    form.reset();
    setupBaseDates();
    populateCategorySelects();
    renderExperimentLog();
    renderInsights();
  });
}

function setupExportButton() {
  document.getElementById('export-notes-btn')?.addEventListener('click', () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      strategyNotes,
      experimentLogs
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sns-analytics-memo.json';
    link.click();
  });
}

function setupInsightFilter() {
  document.getElementById('insight-tabs')?.addEventListener('click', (event) => {
    const button = event.target.closest('.insight-tab-btn');
    if (!button) return;
    currentInsightCategory = button.dataset.category;
    renderInsights();
  });
}

function setupImportExport() {
  document.getElementById('export-data-btn')?.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/export-data', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || 'エクスポートに失敗しました。');
      }
      setImportStatus(`エクスポートしました: ${payload.filename}`, 'success');
    } catch (error) {
      setImportStatus(`エラー: ${error.message}`, 'error');
    }
  });

  document.getElementById('open-export-folder-btn')?.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/open-export-folder', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || 'フォルダを開けませんでした。');
      }
      setImportStatus('エクスポートフォルダを開きました。', 'success');
    } catch (error) {
      setImportStatus(`エラー: ${error.message}`, 'error');
    }
  });

  document.getElementById('import-data-input')?.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('有効なdata.jsonではありません。');
      }
      for (const [key, value] of Object.entries(parsed)) {
        if (!Array.isArray(value)) {
          throw new Error(`"${key}" のデータ形式が正しくありません。`);
        }
      }

      const response = await fetch('/api/save-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'サーバーへの保存に失敗しました。');
      }

      globalData = parsed;
      renderSummary(globalData);
      renderCharts(globalData);
      renderHistory();
      renderInsights();
      generateInputFields(globalData);
      setImportStatus('インポートしました。', 'success');
    } catch (error) {
      setImportStatus(`エラー: ${error.message}`, 'error');
    }

    event.target.value = '';
  });
}

function setImportStatus(message, tone) {
  const el = document.getElementById('import-status');
  if (!el) return;
  el.textContent = message;
  el.className = `import-status is-${tone}`;
  setTimeout(() => {
    el.textContent = '';
    el.className = 'import-status';
  }, 4000);
}

function renderStrategyBoard() {
  const board = document.getElementById('strategy-board');
  const columns = [
    { type: 'issue', label: '課題' },
    { type: 'solution', label: '解決策' },
    { type: 'task', label: 'タスク' }
  ];

  board.innerHTML = columns.map(({ type, label }) => {
    const items = strategyNotes.filter((note) => note.type === type).sort((a, b) => b.date.localeCompare(a.date));
    return `
      <div class="board-column">
        <div class="column-title">${label}</div>
        <div class="column-items">
          ${items.length ? items.map(renderStrategyItem).join('') : '<div class="empty-state">まだありません。</div>'}
        </div>
      </div>
    `;
  }).join('');

  attachDeleteHandlers('.delete-strategy-btn', strategyNotes, STRATEGY_STORAGE_KEY, renderStrategyBoard);
}

function renderStrategyItem(item) {
  return `
    <article class="board-item">
      <div class="item-top">
        <div>
          <div class="item-title">${escapeHtml(item.title)}</div>
          <div class="item-meta">${item.date} ・ ${escapeHtml(item.category)}</div>
        </div>
        <span class="status-pill status-${item.status}">${getStatusLabel(item.status)}</span>
      </div>
      <div class="pill-row"><span class="pill">${getTypeLabel(item.type)}</span></div>
      <div class="item-detail">${escapeHtml(item.detail)}</div>
      <div class="item-actions">
        <button type="button" class="ghost-btn delete-strategy-btn" data-id="${item.id}">削除</button>
      </div>
    </article>
  `;
}

function renderExperimentLog() {
  const container = document.getElementById('experiment-log');
  const items = [...experimentLogs].sort((a, b) => b.date.localeCompare(a.date));
  container.innerHTML = items.length ? items.map(renderExperimentItem).join('') : '<div class="empty-state">まだありません。</div>';
  attachDeleteHandlers('.delete-experiment-btn', experimentLogs, EXPERIMENT_STORAGE_KEY, renderExperimentLog);
}

function renderExperimentItem(item) {
  return `
    <article class="timeline-item">
      <div class="item-top">
        <div>
          <div class="timeline-date">${item.date}</div>
          <div class="item-title">${escapeHtml(item.action)}</div>
        </div>
        <span class="status-pill impact-${item.impact}">${getImpactLabel(item.impact)}</span>
      </div>
      <div class="pill-row">
        <span class="pill">${escapeHtml(item.category)}</span>
        ${item.metric ? `<span class="pill">${escapeHtml(item.metric)}</span>` : ''}
      </div>
      ${item.note ? `<div class="item-detail">${escapeHtml(item.note)}</div>` : ''}
      <div class="item-actions">
        <button type="button" class="ghost-btn delete-experiment-btn" data-id="${item.id}">削除</button>
      </div>
    </article>
  `;
}

function mergeHistoryData(manual, fetched) {
  const merged = {};
  const platforms = new Set([...Object.keys(manual), ...Object.keys(fetched)]);
  platforms.forEach((platform) => {
    const dateMap = new Map();
    (fetched[platform] || []).forEach((e) => dateMap.set(e.date, e));
    (manual[platform] || []).forEach((e) => dateMap.set(e.date, e));
    merged[platform] = [...dateMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  });
  return merged;
}

function renderHistory() {
  const source = mergeHistoryData(globalData, fetchedHistoryData);
  if (!currentHistoryMonth) {
    currentHistoryMonth = getLatestHistoryMonth(source);
  }
  renderHistoryTable('history-list', source, { month: currentHistoryMonth });
  updateHistoryMonthControls(source);
}

function getLatestHistoryMonth(source) {
  const dates = Object.values(source).flatMap((entries) => entries.map((entry) => entry.date)).sort();
  const latest = dates[dates.length - 1] || new Date().toISOString().slice(0, 10);
  return latest.slice(0, 7);
}

function addMonths(month, amount) {
  const [year, monthIndex] = month.split('-').map(Number);
  const date = new Date(year, monthIndex - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getAvailableHistoryMonths(source) {
  return [...new Set(Object.values(source).flatMap((entries) => entries.map((entry) => entry.date.slice(0, 7))))].sort();
}

function formatHistoryMonth(month) {
  const [year, monthIndex] = month.split('-');
  return `${year}年${Number(monthIndex)}月`;
}

function setupHistoryNavigation() {
  document.getElementById('history-prev-month')?.addEventListener('click', () => {
    currentHistoryMonth = addMonths(currentHistoryMonth || new Date().toISOString().slice(0, 7), -1);
    renderHistory();
  });
  document.getElementById('history-next-month')?.addEventListener('click', () => {
    currentHistoryMonth = addMonths(currentHistoryMonth || new Date().toISOString().slice(0, 7), 1);
    renderHistory();
  });
}

function updateHistoryMonthControls(source) {
  const label = document.getElementById('history-current-month');
  const prev = document.getElementById('history-prev-month');
  const next = document.getElementById('history-next-month');
  if (label) label.textContent = formatHistoryMonth(currentHistoryMonth);

  const months = getAvailableHistoryMonths(source);
  if (!months.length) return;
  if (prev) prev.disabled = currentHistoryMonth <= months[0];
  if (next) next.disabled = currentHistoryMonth >= months[months.length - 1];
}

function buildDateGroupedRows(source) {
  const platforms = Object.keys(source);
  const dateMap = new Map();

  platforms.forEach((platform) => {
    const entries = [...(source[platform] || [])].sort((a, b) => a.date.localeCompare(b.date));
    entries.forEach((entry, index) => {
      if (!dateMap.has(entry.date)) {
        dateMap.set(entry.date, {});
      }

      const previousEntry = entries[index - 1];
      const computedDiff = previousEntry ? entry.count - previousEntry.count : null;
      const commentDiff = extractDiff(entry.comment);
      const diff = commentDiff !== null ? commentDiff : computedDiff;

      dateMap.get(entry.date)[platform] = {
        count: entry.count,
        comment: entry.comment || '',
        diff,
      };
    });
  });

  const sortedDates = [...dateMap.keys()].sort((a, b) => b.localeCompare(a));
  return { platforms, rows: sortedDates.map((date) => ({ date, entries: dateMap.get(date) })) };
}

function extractDiff(comment) {
  const match = comment?.match(/([+-]\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function hasAnyChange(entries, platforms) {
  return platforms.some((p) => {
    const entry = entries[p];
    if (!entry) return false;
    return entry.diff !== null && entry.diff !== 0;
  });
}

function renderHistoryTable(containerId, source, options = {}) {
  const container = document.getElementById(containerId);
  const { platforms, rows } = buildDateGroupedRows(source);

  const filteredRows = options.changedOnly
    ? rows.filter(({ entries }) => hasAnyChange(entries, platforms))
    : rows;
  const displayRows = options.month
    ? filteredRows.filter(({ date }) => date.startsWith(options.month))
    : filteredRows;

  if (!displayRows.length || !platforms.length) {
    container.innerHTML = '<div class="empty-state">履歴データがありません。</div>';
    return;
  }

  const headerCells = platforms.map((p) => `<th>${escapeHtml(p)}</th>`).join('');

  const bodyRows = displayRows.map(({ date, entries }) => {
    const rowHasChange = hasAnyChange(entries, platforms);
    const cells = platforms.map((p) => {
      const entry = entries[p];
      if (!entry) return '<td class="hist-cell hist-empty">-</td>';

      const diff = entry.diff;
      const hasChange = diff !== null && diff !== 0;
      let diffHtml = '';
      if (diff !== null) {
        const cls = diff > 0 ? 'diff-up' : diff < 0 ? 'diff-down' : 'diff-zero';
        const sign = diff > 0 ? '+' : '';
        diffHtml = `<span class="hist-diff ${cls}">${sign}${diff}</span>`;
      }
      return `<td class="hist-cell${hasChange ? ' hist-cell-changed' : ''}">${entry.count.toLocaleString()}${diffHtml}</td>`;
    }).join('');

    return `<tr class="${rowHasChange ? 'hist-row-changed' : ''}"><td class="hist-date${rowHasChange ? ' hist-date-changed' : ''}">${escapeHtml(date)}</td>${cells}</tr>`;
  }).join('');

  container.innerHTML = `
    <div class="hist-table-wrap">
      <table class="hist-table">
        <thead><tr><th>日付</th>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

function renderFetchLog() {
  const container = document.getElementById('fetch-log-list');
  if (!container) return;

  if (!fetchLogData.length) {
    container.innerHTML = '<div class="empty-state">取得ログがありません。</div>';
    return;
  }

  const rows = [...fetchLogData].reverse().map((entry) => {
    const ts = entry.timestamp ? entry.timestamp.replace('T', ' ') : '-';
    const statusCls = entry.status === 'success' ? 'diff-up' : 'diff-down';
    const statusLabel = entry.status === 'success' ? '成功' : '失敗';
    const counts = entry.counts
      ? Object.entries(entry.counts).map(([k, v]) => `${escapeHtml(k)}: ${v}`).join(' / ')
      : '-';
    return `<tr>
      <td class="hist-date">${escapeHtml(ts)}</td>
      <td><span class="hist-diff ${statusCls}">${statusLabel}</span></td>
      <td class="fetch-log-counts">${counts}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="hist-table-wrap">
      <table class="hist-table">
        <thead><tr><th>取得日時</th><th>ステータス</th><th>取得値</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function attachDeleteHandlers(selector, collection, storageKey, rerender) {
  document.querySelectorAll(selector).forEach((button) => {
    button.addEventListener('click', () => {
      const { id } = button.dataset;
      const index = collection.findIndex((item) => item.id === id);
      if (index === -1) {
        return;
      }

      collection.splice(index, 1);
      saveToStorage(storageKey, collection);
      rerender();
      renderInsights();
    });
  });
}

function renderInsights() {
  const container = document.getElementById('insight-cards');
  const tabs = document.getElementById('insight-tabs');
  if (!container) return;
  const available = INSIGHT_ORDER.filter((category) => globalData[category]);
  if (!available.includes(currentInsightCategory)) {
    currentInsightCategory = available[0] || getPlatforms()[0] || '';
  }

  if (tabs) {
    tabs.innerHTML = available.map((category) => {
      const label = category === 'LINE公式' ? 'LINE' : category === 'Instagram' ? 'Instagram' : category;
      return `<button type="button" class="insight-tab-btn${category === currentInsightCategory ? ' is-active' : ''}" data-category="${escapeHtml(category)}">${escapeHtml(label)}</button>`;
    }).join('');
  }

  const categories = currentInsightCategory ? [currentInsightCategory] : [];
  const cards = categories.map((category) => buildInsightCard(category)).filter(Boolean);
  container.innerHTML = cards.length ? cards.join('') : '<div class="empty-state">分析できるデータがありません。</div>';
}

function buildInsightCard(category) {
  const entries = globalData[category];
  if (!entries || entries.length < 2) {
    return '';
  }

  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const last = sortedEntries[sortedEntries.length - 1];
  const prev = sortedEntries[sortedEntries.length - 2];
  const diff = last.count - prev.count;
  const recentWindow = sortedEntries.slice(-5);
  const windowStart = recentWindow[0];
  const windowDiff = last.count - windowStart.count;
  const zeroStreak = countRecentFlatDays(sortedEntries);
  const platformAdvice = getPlatformInsight(category, diff, windowDiff, zeroStreak);
  const recentExperiments = experimentLogs
    .filter((log) => log.category === category || log.category === CATEGORY_ALL)
    .filter((log) => log.date <= last.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  const relevantNotes = strategyNotes
    .filter((note) => note.category === category || note.category === CATEGORY_ALL)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 2);

  const trendLabel = diff > 0 ? '直近増加' : diff < 0 ? '直近減少' : '横ばい';
  const mediumTrend = windowDiff > 0 ? `直近${recentWindow.length}点で+${windowDiff}` : windowDiff < 0 ? `直近${recentWindow.length}点で${windowDiff}` : `直近${recentWindow.length}点で変化なし`;

  return `
    <article class="insight-card">
      <div class="insight-header">
        <div class="insight-title">${category}</div>
        <div class="insight-value ${diff > 0 ? 'diff-up' : diff < 0 ? 'diff-down' : 'diff-zero'}">${diff > 0 ? '+' : ''}${diff}</div>
      </div>
      <div class="item-meta">${prev.date} → ${last.date} ・ ${prev.count} → ${last.count}</div>
      <div class="pill-row">
        <span class="pill">${trendLabel}</span>
        <span class="pill">${mediumTrend}</span>
        ${zeroStreak >= 3 ? `<span class="pill">${zeroStreak}回連続横ばい</span>` : ''}
        ${recentExperiments.length ? `<span class="pill">関連施策 ${recentExperiments.length}件</span>` : ''}
      </div>
      <p class="insight-note">${escapeHtml(platformAdvice.summary)}</p>
      <div class="insight-focus"><strong>見るポイント:</strong> ${escapeHtml(platformAdvice.focus)}</div>
      <ul class="insight-advice-list">
        ${platformAdvice.actions.map((action) => `<li>${escapeHtml(action)}</li>`).join('')}
      </ul>
      ${recentExperiments.length ? `<div class="item-detail"><strong>最近の施策</strong><br>${recentExperiments.map((item) => `${escapeHtml(item.date)}: ${escapeHtml(item.action)}`).join('<br>')}</div>` : ''}
      ${relevantNotes.length ? `<div class="item-detail"><strong>関連メモ</strong><br>${relevantNotes.map((item) => `[${getTypeLabel(item.type)}] ${escapeHtml(item.title)}`).join('<br>')}</div>` : ''}
    </article>
  `;
}

function countRecentFlatDays(entries) {
  let streak = 0;
  for (let index = entries.length - 1; index > 0; index -= 1) {
    if (entries[index].count !== entries[index - 1].count) break;
    streak += 1;
  }
  return streak;
}

function getPlatformInsight(platform, diff, windowDiff, zeroStreak) {
  const direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  const playbooks = {
    'LINE公式': {
      focus: '登録導線の強さと、登録後に読む理由が伝わっているか。LINEは投稿量よりも「登録する動機」と特典の明確さが効きやすいです。',
      up: [
        '増えた日の直前に出したCTA、無料相談、資料請求、限定案内を同じ型でもう一度出す',
        '登録直後のあいさつメッセージに、次に取ってほしい行動を1つだけ置く',
        '他SNSのプロフィール冒頭にLINE登録の具体的メリットを短く入れる',
      ],
      flat: [
        'プロフィールと固定投稿のCTAを「相談する」「資料を受け取る」など行動語に変える',
        '登録特典が弱い場合は、チェックリストや事例PDFなど即時性のある受け皿を作る',
        'InstagramやXで伸びた投稿の末尾にLINE誘導を足し、流入元を分けて反応を見る',
      ],
      down: [
        '配信頻度、売り込み感、通知の重さを確認し、解除理由になりそうな配信を減らす',
        '直近配信のタイトルと冒頭文を見直し、相談者向けの実用情報を先に置く',
        '登録者向けの価値を再提示する投稿を他SNS側にも出す',
      ],
    },
    YouTube: {
      focus: '登録者は単発動画より、視聴維持率、シリーズ性、検索されるテーマで伸びます。入口動画と次に見る動画のつながりを見ます。',
      up: [
        '増えた動画のタイトル構造、冒頭15秒、サムネの約束をテンプレート化する',
        '関連動画へ自然に流れる再生リストを作り、同じ悩みの続編を出す',
        '動画説明欄と固定コメントで、LINEや相談導線を1つに絞る',
      ],
      flat: [
        '検索される悩み語をタイトル前半に置き、サムネは結果や対象者を明確にする',
        '冒頭で結論と視聴メリットを先に出し、離脱前に価値を見せる',
        '伸びたテーマをショート化し、本編へ送る導線を試す',
      ],
      down: [
        '直近動画のテーマが既存視聴者とズレていないか、クリック率と維持率を確認する',
        '登録解除が起きた動画の主張、長さ、告知量を見直す',
        '新規獲得用と既存向けの動画を分け、チャンネルの期待値を戻す',
      ],
    },
    TikTok: {
      focus: 'TikTokは初速と視聴完了率が重要です。フォロー理由は「続きが見たい」「この人から学びたい」に寄せます。',
      up: [
        '増えた投稿の冒頭1秒の言い切り、尺、字幕量を次の3本で再利用する',
        '同じテーマを角度違いで連投し、視聴者がフォローする理由をシリーズ化する',
        'プロフィール文を投稿テーマと一致させ、フォロー後に得られるものを明示する',
      ],
      flat: [
        '冒頭を説明から入らず、悩みの断定や意外な結論から始める',
        '1投稿1テーマに絞り、最後に「続きはフォロー」で次回予告を置く',
        '伸びない投稿は尺を短くし、字幕の密度とテンポを上げる',
      ],
      down: [
        '投稿テーマが散っていないか確認し、数日間は勝ちテーマだけに絞る',
        'トレンド音源よりも対象者の悩みに刺さる冒頭文を優先する',
        'プロフィール遷移後にフォローされない場合、肩書きと実績の見せ方を直す',
      ],
    },
    Instagram: {
      focus: 'Instagramは保存、プロフィール遷移、ストーリーズ接触が鍵です。見た目より「保存したい実用性」と信頼導線を見ます。',
      up: [
        '増えた投稿の構成を、1枚目の約束、本文の型、最後のCTAまで分解して再投稿する',
        'ストーリーズで反応があった話題を投稿化し、プロフィールへの流れを作る',
        'ハイライトを相談導線、実績、よくある質問に整理する',
      ],
      flat: [
        '1枚目に対象者と得られる結果を入れ、保存したくなるチェックリスト形式を増やす',
        'プロフィールの肩書き、実績、CTAを3行で伝わる形に圧縮する',
        'リールとカルーセルで同じテーマを出し、保存型と拡散型を分けて検証する',
      ],
      down: [
        '直近投稿のテーマがフォロー理由から外れていないか確認する',
        '売り込み投稿が続いている場合は、事例、学び、失敗談の比率を戻す',
        'プロフィール遷移はあるのに増えないなら、ハイライトとCTAを先に直す',
      ],
    },
    X: {
      focus: 'Xはプロフィール訪問と継続的な接触が重要です。単発の伸びより、誰向けに何を発信する人かが伝わるかを見ます。',
      up: [
        '増えた投稿の切り口をスレッド化し、固定ポストやプロフィールへ接続する',
        '反応した人に近いテーマで翌日も投稿し、接触回数を増やす',
        'プロフィール冒頭を、対象者、提供価値、実績の順に整える',
      ],
      flat: [
        '投稿を日記型から、対象者の悩みに答える型へ寄せる',
        '引用、返信、短文ノウハウを組み合わせ、プロフィール訪問の入口を増やす',
        '固定ポストを最新の実績や無料導線に差し替える',
      ],
      down: [
        '直近でテーマや言い方が尖りすぎていないか、反応の質を確認する',
        '宣伝比率が高い場合は、ノウハウ、事例、考察を先に戻す',
        'フォロー解除が続くなら、発信テーマを3本柱に絞り直す',
      ],
    },
  };

  const fallback = {
    focus: '直近の増減と、プロフィールに進んだ後のフォロー理由を確認します。',
    up: ['増えた日の直前に行った投稿や導線を再現する', 'プロフィールのCTAを最新の成果に合わせて更新する'],
    flat: ['投稿テーマを絞り、フォロー後のメリットを明確にする', '伸びた投稿の型を別角度で再利用する'],
    down: ['直近の投稿テーマ、頻度、告知比率を見直す', 'プロフィールと固定導線を現在の訴求に合わせる'],
  };
  const playbook = playbooks[platform] || fallback;
  const summaryMap = {
    up: `${platform} は直近で増加しています。偶然で終わらせず、増えた直前の投稿・導線・プロフィール状態を再現対象として扱うのが良さそうです。`,
    flat: zeroStreak >= 3
      ? `${platform} は横ばいが続いています。露出だけでなく、プロフィールに来た人がフォローする理由を作れているかを優先して見直したい状態です。`
      : `${platform} は大きな変化がありません。小さくテストしながら、フォロー理由が伝わる導線を強めたい状態です。`,
    down: `${platform} は直近で減少しています。投稿テーマのズレ、告知比率、プロフィールの期待値ズレを早めに確認したい状態です。`,
  };
  const actions = playbook[direction].slice(0, 3);
  if (windowDiff > 0 && direction !== 'up') {
    actions[0] = '中期では増加傾向もあるため、直近だけで判断せず増えた日の要因を優先して確認する';
  }
  if (windowDiff < 0 && direction !== 'down') {
    actions[0] = '中期では弱含みなので、直近で持ち直していても投稿テーマとプロフィール導線を点検する';
  }
  return {
    summary: summaryMap[direction],
    focus: playbook.focus,
    actions,
  };
}

function getTypeLabel(type) {
  return { issue: '課題', solution: '解決策', task: 'タスク' }[type] || type;
}

function getStatusLabel(status) {
  return { open: '未着手', doing: '進行中', done: '完了' }[status] || status;
}

function getImpactLabel(impact) {
  return { unknown: '未評価', up: '増加', down: '減少', flat: '横ばい' }[impact] || impact;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
