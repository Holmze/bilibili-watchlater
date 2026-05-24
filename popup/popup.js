const modeEl = document.querySelector("#mode");
const syncButton = document.querySelector("#sync");
const diagnoseButton = document.querySelector("#diagnose");
const toggleAutoButton = document.querySelector("#toggleAuto");
const addCurrentButton = document.querySelector("#addCurrent");
const summaryEl = document.querySelector("#summary");
const resultsEl = document.querySelector("#results");
const diagnosticsEl = document.querySelector("#diagnostics");

let currentSettings = null;

init();

syncButton.addEventListener("click", async () => {
  setBusy(true, "Syncing...");
  try {
    const response = await sendMessage({ type: "runSync" });
    renderState({
      settings: response.result.settings,
      lastSync: response.result
    });
  } catch (error) {
    summaryEl.textContent = error.message;
  } finally {
    setBusy(false);
    await refresh();
  }
});

diagnoseButton.addEventListener("click", async () => {
  setBusy(true, "Running diagnostics...");
  try {
    const state = await sendMessage({ type: "getState" });
    const response = await sendMessage({
      type: "runDiagnostics",
      mid: state.result.settings.testMid
    });
    renderDiagnostics(response.result);
  } catch (error) {
    diagnosticsEl.textContent = error.message;
  } finally {
    setBusy(false);
  }
});

toggleAutoButton.addEventListener("click", async () => {
  try {
    const next = !currentSettings?.autoSyncEnabled;
    const response = await sendMessage({
      type: "toggleAutoSync",
      enabled: next
    });
    currentSettings = response.result;
    await refresh();
  } catch (error) {
    summaryEl.textContent = error.message;
  }
});

addCurrentButton.addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await sendMessage({
      type: "addOwnerFromTab",
      tabId: tab?.id
    });
    summaryEl.textContent = response.result.added
      ? `Added UP ${response.result.owner.mid}.`
      : `UP ${response.result.owner.mid} is already configured.`;
    await refresh();
  } catch (error) {
    summaryEl.textContent = error.message;
  }
});

async function init() {
  await refresh();
}

async function refresh() {
  const response = await sendMessage({ type: "getState" });
  renderState(response.result);
}

function renderState(state) {
  const settings = state.settings ?? {};
  currentSettings = settings;
  const activeOwners = settings.owners?.filter((owner) => owner.enabled).length ?? 0;
  const lockText = state.syncLock?.expiresAt && state.syncLock.expiresAt > Date.now() ? "Locked" : "Ready";

  modeEl.textContent = [
    settings.dryRun ? "Dry-run" : "Live",
    settings.autoSyncEnabled ? `Auto ${settings.alarmPeriodMinutes}m` : "Manual",
    !settings.dryRun && settings.autoSyncEnabled && !settings.allowAutoLiveSync ? "Auto live blocked" : lockText,
    `${activeOwners} UPs`
  ].join(" | ");
  toggleAutoButton.textContent = settings.autoSyncEnabled ? "Pause auto" : "Resume auto";

  if (state.lastSync) {
    renderSync(state.lastSync);
  }

  if (state.lastDiagnostics) {
    renderDiagnostics(state.lastDiagnostics);
  }
}

function renderSync(sync) {
  const counts = sync.counts ?? {};
  summaryEl.textContent = [
    sync.dryRun ? "Dry-run" : "Live",
    `trigger=${sync.trigger}`,
    `dry_run=${counts.dry_run ?? 0}`,
    `added=${counts.added ?? 0}`,
    `seen=${counts.skipped_seen ?? 0}`,
    `cooldown=${counts.skipped_failed_cooldown ?? 0}`,
    `failed=${failureCount(counts)}`,
    sync.finishedAt ?? ""
  ].join(" | ");

  const results = sync.results ?? [];
  if (!results.length) {
    resultsEl.innerHTML = '<p class="empty">No candidate videos.</p>';
    return;
  }

  resultsEl.innerHTML = "";
  for (const item of results.slice(0, 30)) {
    const row = document.createElement("article");
    row.className = "result";

    const title = item.video?.title ?? item.message ?? "No title";
    const owner = item.owner?.name || item.owner?.mid || item.video?.author || "";
    const avatarUrl = item.owner?.avatarUrl || "";
    const bvid = item.video?.bvid ?? "";
    const href = bvid ? `https://www.bilibili.com/video/${encodeURIComponent(bvid)}` : "";
    const titleHtml = href
      ? `<a href="${href}" target="_blank">${escapeHtml(title)} (${escapeHtml(bvid)})</a>`
      : escapeHtml(title);

    row.innerHTML = `
      <span class="badge ${item.status}">${item.status}</span>
      <div>
        <div class="result-title">
          ${avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="">` : ""}
          <strong>${titleHtml}</strong>
        </div>
        <p>${escapeHtml(String(owner))}${item.message ? ` | ${escapeHtml(item.message)}` : ""}</p>
      </div>
    `;
    resultsEl.append(row);
  }
}

function renderDiagnostics(result) {
  const flags = [
    ["cookies", result.cookies?.ok],
    ["nav", result.nav?.ok],
    ["space", result.space?.ok],
    ["alarm", result.alarm?.ok]
  ].map(([name, ok]) => `${name}:${ok ? "ok" : "fail"}`);

  diagnosticsEl.textContent = JSON.stringify({
    status: flags.join(" | "),
    startedAt: result.startedAt,
    nav: result.nav?.ok
      ? {
          isLogin: result.nav.data.isLogin,
          mid: result.nav.data.mid,
          uname: result.nav.data.uname
        }
      : result.nav,
    videos: result.space?.ok ? result.space.data.length : null,
    alarm: result.alarm
  }, null, 2);
}

function setBusy(isBusy, text = "") {
  syncButton.disabled = isBusy;
  diagnoseButton.disabled = isBusy;
  toggleAutoButton.disabled = isBusy;
  addCurrentButton.disabled = isBusy;
  if (text) {
    summaryEl.textContent = text;
  }
}

async function sendMessage(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) {
    throw new Error(response?.error?.message ?? "Extension request failed.");
  }
  return response;
}

function failureCount(counts) {
  return [
    "failed",
    "fetch_failed",
    "add_http_failed",
    "add_api_failed",
    "inject_failed",
    "login_expired"
  ].reduce((total, key) => total + (counts[key] ?? 0), 0);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}
