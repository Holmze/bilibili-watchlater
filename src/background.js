import { fetchLatestVideos, fetchNav, fetchOwnerProfile, getBilibiliCookies } from "./bilibili.js";
import { runSync } from "./sync.js";
import {
  DEFAULT_SETTINGS,
  DIAGNOSTIC_ALARM_NAME,
  SYNC_ALARM_NAME,
  getPopupState,
  getSettings,
  saveLastSync,
  saveSettings
} from "./storage.js";

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await saveSettings(settings);
  await refreshSyncAlarm(settings);
});

chrome.runtime.onStartup.addListener(async () => {
  const settings = await getSettings();
  await refreshSyncAlarm(settings);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== SYNC_ALARM_NAME) return;
  runSync("alarm").catch(async (error) => {
    await saveLastSync({
      ok: false,
      trigger: "alarm",
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      dryRun: true,
      counts: { failed: 1 },
      ownerStats: {},
      results: [],
      error: serializeError(error)
    });
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "getState") {
    getPopupState()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: serializeError(error) }));
    return true;
  }

  if (message?.type === "runDiagnostics") {
    runDiagnostics(message.mid)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: serializeError(error) }));
    return true;
  }

  if (message?.type === "runSync") {
    runSync("manual")
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: serializeError(error) }));
    return true;
  }

  if (message?.type === "saveSettings") {
    updateSettings(message.settings)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: serializeError(error) }));
    return true;
  }

  if (message?.type === "toggleAutoSync") {
    toggleAutoSync(message.enabled)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: serializeError(error) }));
    return true;
  }

  if (message?.type === "addOwnerFromTab") {
    addOwnerFromTab(message.tabId, sender.tab)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: serializeError(error) }));
    return true;
  }

  return false;
});

async function runDiagnostics(mid) {
  const settings = await getSettings();
  const parsedMid = Number(mid || settings.testMid || DEFAULT_SETTINGS.testMid);
  const startedAt = new Date().toISOString();
  const cookies = await step(() => getBilibiliCookies());
  const nav = await step(() => fetchNav());
  const space = await step(() => fetchLatestVideos(parsedMid, 5));
  const alarm = await step(async () => {
    await chrome.alarms.create(DIAGNOSTIC_ALARM_NAME, {
      delayInMinutes: 1
    });
    const current = await chrome.alarms.get(DIAGNOSTIC_ALARM_NAME);
    await chrome.alarms.clear(DIAGNOSTIC_ALARM_NAME);
    return {
      created: Boolean(current),
      name: current?.name ?? null,
      scheduledTime: current?.scheduledTime ? new Date(current.scheduledTime).toISOString() : null
    };
  });

  const result = {
    startedAt,
    mid: parsedMid,
    cookies,
    nav,
    space,
    alarm
  };

  await chrome.storage.local.set({
    lastDiagnostics: result
  });

  return result;
}

async function updateSettings(settings) {
  const enriched = await enrichOwners(settings);
  const saved = await saveSettings(enriched);
  await refreshSyncAlarm(saved);
  return saved;
}

async function toggleAutoSync(enabled) {
  const settings = await getSettings();
  const saved = await saveSettings({
    ...settings,
    autoSyncEnabled: enabled === true
  });
  await refreshSyncAlarm(saved);
  return saved;
}

async function addOwnerFromTab(tabId, senderTab) {
  const tab = tabId ? await chrome.tabs.get(tabId) : senderTab;
  const url = tab?.url ?? "";
  const match = url.match(/^https:\/\/space\.bilibili\.com\/(\d+)/);
  if (!match) {
    throw new Error("Open a Bilibili UP owner page first.");
  }

  const mid = Number(match[1]);
  const settings = await getSettings();
  const exists = settings.owners.some((owner) => owner.mid === mid);
  if (!exists) {
    settings.owners.push({
      mid,
      name: tab.title?.replace(/的个人空间.*$/, "").trim() ?? "",
      enabled: true
    });
  }

  const saved = await saveSettings({
    ...settings,
    testMid: mid
  });
  await refreshSyncAlarm(saved);
  return {
    settings: saved,
    added: !exists,
    owner: saved.owners.find((owner) => owner.mid === mid)
  };
}

async function enrichOwners(settings) {
  const owners = [];
  for (const owner of settings.owners ?? []) {
    if (!owner?.mid) {
      continue;
    }
    try {
      const profile = await fetchOwnerProfile(owner.mid);
      owners.push({
        ...owner,
        name: owner.name || profile.name,
        avatarUrl: profile.avatarUrl || owner.avatarUrl || "",
        spaceUrl: profile.spaceUrl,
        profileFetchedAt: profile.fetchedAt
      });
    } catch (_error) {
      owners.push({
        ...owner,
        spaceUrl: owner.spaceUrl || `https://space.bilibili.com/${owner.mid}`
      });
    }
  }
  return {
    ...settings,
    owners
  };
}

async function refreshSyncAlarm(settings) {
  await chrome.alarms.clear(SYNC_ALARM_NAME);
  if (!settings.autoSyncEnabled) {
    return null;
  }

  await chrome.alarms.create(SYNC_ALARM_NAME, {
    delayInMinutes: settings.alarmPeriodMinutes,
    periodInMinutes: settings.alarmPeriodMinutes
  });
  return chrome.alarms.get(SYNC_ALARM_NAME);
}

async function step(fn) {
  try {
    const data = await fn();
    return {
      ok: true,
      data
    };
  } catch (error) {
    return {
      ok: false,
      error: serializeError(error)
    };
  }
}

function serializeError(error) {
  return {
    name: error?.name ?? "Error",
    message: error?.message ?? String(error),
    stack: error?.stack ?? null
  };
}
