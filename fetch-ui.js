let latestFetchPayload = null;
let fetchInProgress = false;

document.addEventListener('DOMContentLoaded', () => {
  const fetchButton = document.getElementById('fetch-latest-btn');
  const openLoginButton = document.getElementById('open-login-btn');

  if (!hasLocalApi()) {
    [fetchButton, openLoginButton].forEach((button) => {
      if (!button) return;
      button.disabled = true;
      button.title = 'GitHub Pagesでは手動取得APIを使えません。定期取得はGitHub Actionsで実行します。';
    });
    return;
  }

  if (fetchButton) {
    fetchButton.addEventListener('click', runLatestFetch);
  }

  if (openLoginButton) {
    openLoginButton.addEventListener('click', () => openLoginChrome(getPlatformsByStatus(['login_required', 'manual_action'])));
  }
});

function hasLocalApi() {
  return ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
}

async function runLatestFetch() {
  if (fetchInProgress) {
    return;
  }

  setFetchBusy(true);
  setFetchStatus('各SNSを巡回して最新値を取得しています。終わるまでこのままお待ちください。', 'loading');
  renderFetchResults({});

  try {
    const { response, payload } = await requestJson('/api/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!response.ok || !payload) {
      throw new Error(payload?.message || 'データ取得に失敗しました。');
    }

    latestFetchPayload = payload;
    renderFetchResults(payload.platforms || {});

    if (payload.skipped) {
      setFetchStatus(payload.message || '今日はすでに取得済みです。再取得はスキップしました。', 'success');
      if (typeof fetchData === 'function') {
        await fetchData();
      }
      return;
    }

    const manualPrompt = payload.manual_prompt;
    const loginRequiredPlatforms = getPlatformsByStatus(['login_required', 'manual_action']);

    if (payload.ok) {
      const successCount = Object.keys(payload.counts || {}).length;
      const summary = loginRequiredPlatforms.length
        ? `最新値を ${successCount} 件保存しました。取得できなかったSNSの確認用ページを開きました。必要なら手動でログインして、もう一度「データ取得」を押してください。`
        : `最新値を ${successCount} 件保存しました。`;
      setFetchStatus(manualPrompt?.message || summary, loginRequiredPlatforms.length ? 'warning' : 'success');

      if (typeof fetchData === 'function') {
        await fetchData();
      }
      return;
    }

    if (loginRequiredPlatforms.length) {
      setFetchStatus(manualPrompt?.message || '取得できなかったSNSの確認用ページを開きました。必要なら手動でログインして、もう一度データ取得を押してください。', 'warning');
      return;
    }

    setFetchStatus(payload.message || 'データ取得できませんでした。', 'error');
  } catch (error) {
    console.error(error);
    setFetchStatus(error.message || 'データ取得に失敗しました。', 'error');
  } finally {
    setFetchBusy(false);
  }
}

async function openLoginChrome(platforms) {
  const targetPlatforms = Array.isArray(platforms) && platforms.length ? platforms : undefined;
  setFetchStatus('ログイン用Chromeを開いています。', 'loading');

  try {
    const { response, payload } = await requestJson('/api/open-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(targetPlatforms ? { platforms: targetPlatforms } : {}),
    });

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || 'ログイン用Chromeを開けませんでした。');
    }

    setFetchStatus(payload.message, 'warning');
  } catch (error) {
    console.error(error);
    setFetchStatus(error.message || 'ログイン用Chromeを開けませんでした。', 'error');
  }
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return { response, payload: JSON.parse(text) };
    } catch (error) {
      throw new Error('APIのJSON解析に失敗しました。ページを再読み込みして、もう一度お試しください。');
    }
  }

  const preview = text.trim().slice(0, 120);
  if (preview.startsWith('<!DOCTYPE') || preview.startsWith('<html') || preview.startsWith('<')) {
    throw new Error('APIではなくHTMLが返っています。旧サーバーで起動している可能性があります。SNS Analytics を `run_dashboard.bat` で起動し直してください。');
  }

  throw new Error('APIレスポンスを読み取れませんでした。SNS Analytics を再起動してからもう一度お試しください。');
}

function getPlatformsByStatus(statuses) {
  if (!latestFetchPayload?.platforms) {
    return [];
  }

  return Object.values(latestFetchPayload.platforms)
    .filter((platformResult) => statuses.includes(platformResult.status))
    .map((platformResult) => platformResult.platform);
}

function setFetchBusy(isBusy) {
  fetchInProgress = isBusy;

  const fetchButton = document.getElementById('fetch-latest-btn');
  const openLoginButton = document.getElementById('open-login-btn');

  if (fetchButton) {
    fetchButton.disabled = isBusy;
    fetchButton.textContent = isBusy ? '取得中...' : 'データ取得';
  }

  if (openLoginButton) {
    openLoginButton.disabled = isBusy;
  }
}

function setFetchStatus(message, tone = 'loading') {
  const status = document.getElementById('fetch-status');
  if (!status) {
    return;
  }

  status.className = `fetch-status is-visible is-${tone}`;
  status.textContent = message;
}

function renderFetchResults(platformResults) {
  const container = document.getElementById('fetch-results');
  if (!container) {
    return;
  }

  const items = Object.values(platformResults || {});
  if (!items.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = items.map((item) => {
    const countText = Number.isFinite(item.count) ? `${item.count.toLocaleString()}人` : '未取得';
    return `
      <article class="fetch-result-card">
        <div class="fetch-result-head">
          <div class="fetch-result-platform">${escapeFetchHtml(item.platform)}</div>
          <span class="fetch-result-badge ${getFetchBadgeClass(item.status)}">${getFetchStatusLabel(item.status)}</span>
        </div>
        <div class="fetch-result-count">${countText}</div>
        <div class="fetch-result-message">${escapeFetchHtml(item.message || '')}</div>
      </article>
    `;
  }).join('');
}

function getFetchStatusLabel(status) {
  switch (status) {
    case 'success':
      return '保存済み';
    case 'skipped':
      return '取得済み';
    case 'login_required':
      return 'ログイン要';
    case 'manual_action':
      return '確認要';
    case 'timeout':
      return 'タイムアウト';
    case 'error':
      return 'エラー';
    default:
      return '待機中';
  }
}

function getFetchBadgeClass(status) {
  switch (status) {
    case 'success':
      return 'is-success';
    case 'skipped':
      return 'is-muted';
    case 'login_required':
    case 'manual_action':
      return 'is-warning';
    case 'timeout':
    case 'error':
      return 'is-error';
    default:
      return 'is-muted';
  }
}

function escapeFetchHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
