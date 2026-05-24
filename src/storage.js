export const SYNC_ALARM_NAME = "watchlater-sync";
export const DIAGNOSTIC_ALARM_NAME = "watchlater-diagnostic";

export const DEFAULT_SETTINGS = {
  testMid: 946974,
    owners: [
    {
      mid: 946974,
      name: "示例UP主",
      avatarUrl: "",
      spaceUrl: "https://space.bilibili.com/946974",
      enabled: true
    }
  ],
  dryRun: true,
  allowAutoLiveSync: false,
  autoSyncEnabled: false,
  pageSize: 10,
  maxAgeHours: 72,
  alarmPeriodMinutes: 30,
  addIntervalSeconds: 2,
  fetchRetryCount: 1,
  addRetryCount: 1,
  failedCooldownMinutes: 60,
  maxFailureCount: 3
};

const MAX_HISTORY_ITEMS = 20;
const MAX_PROCESSED_ITEMS = 1000;
const MAX_FAILED_ITEMS = 1000;
const SYNC_LOCK_KEY = "syncLock";
const SYNC_LOCK_TTL_MS = 10 * 60 * 1000;

export async function getSettings() {
  const { settings } = await chrome.storage.local.get(["settings"]);
  return normalizeSettings(settings);
}

export async function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  await chrome.storage.local.set({ settings: normalized });
  return normalized;
}

export async function getProcessedVideos() {
  const { processedVideos } = await chrome.storage.local.get(["processedVideos"]);
  return processedVideos && typeof processedVideos === "object" ? processedVideos : {};
}

export async function saveProcessedVideos(processedVideos) {
  await chrome.storage.local.set({
    processedVideos: pruneProcessedVideos(processedVideos)
  });
}

export async function getFailedVideos() {
  const { failedVideos } = await chrome.storage.local.get(["failedVideos"]);
  return failedVideos && typeof failedVideos === "object" ? failedVideos : {};
}

export async function saveFailedVideos(failedVideos) {
  await chrome.storage.local.set({
    failedVideos: pruneFailedVideos(failedVideos)
  });
}

export async function saveLastSync(result) {
  const { syncHistory } = await chrome.storage.local.get(["syncHistory"]);
  const history = Array.isArray(syncHistory) ? syncHistory : [];
  await chrome.storage.local.set({
    lastSync: result,
    syncHistory: [result, ...history].slice(0, MAX_HISTORY_ITEMS)
  });
}

export async function getPopupState() {
  const [settings, stored] = await Promise.all([
    getSettings(),
    chrome.storage.local.get(["lastDiagnostics", "lastSync", "syncHistory", "syncLock"])
  ]);
  return {
    settings,
    lastDiagnostics: stored.lastDiagnostics ?? null,
    lastSync: stored.lastSync ?? null,
    syncHistory: Array.isArray(stored.syncHistory) ? stored.syncHistory : [],
    syncLock: stored.syncLock ?? null
  };
}

export async function acquireSyncLock(trigger) {
  const now = Date.now();
  const { syncLock } = await chrome.storage.local.get([SYNC_LOCK_KEY]);
  if (syncLock?.expiresAt && syncLock.expiresAt > now) {
    return {
      acquired: false,
      lock: syncLock
    };
  }

  const lock = {
    id: `${trigger}-${now}-${Math.random().toString(36).slice(2)}`,
    trigger,
    startedAt: new Date(now).toISOString(),
    expiresAt: now + SYNC_LOCK_TTL_MS
  };
  await chrome.storage.local.set({ [SYNC_LOCK_KEY]: lock });
  return {
    acquired: true,
    lock
  };
}

export async function releaseSyncLock(lock) {
  const { syncLock } = await chrome.storage.local.get([SYNC_LOCK_KEY]);
  if (syncLock?.id === lock?.id) {
    await chrome.storage.local.remove(SYNC_LOCK_KEY);
  }
}

export function normalizeSettings(settings) {
  const input = settings && typeof settings === "object" ? settings : {};
  return {
    ...DEFAULT_SETTINGS,
    ...input,
    testMid: positiveInteger(input.testMid, DEFAULT_SETTINGS.testMid),
    owners: normalizeOwners(input.owners),
    dryRun: input.dryRun !== false,
    allowAutoLiveSync: input.allowAutoLiveSync === true,
    autoSyncEnabled: input.autoSyncEnabled === true,
    pageSize: clampInteger(input.pageSize, 1, 50, DEFAULT_SETTINGS.pageSize),
    maxAgeHours: input.maxAgeHours === null ? null : clampInteger(input.maxAgeHours, 1, 24 * 30, DEFAULT_SETTINGS.maxAgeHours),
    alarmPeriodMinutes: clampInteger(input.alarmPeriodMinutes, 1, 24 * 60, DEFAULT_SETTINGS.alarmPeriodMinutes),
    addIntervalSeconds: clampInteger(input.addIntervalSeconds, 0, 60, DEFAULT_SETTINGS.addIntervalSeconds),
    fetchRetryCount: clampInteger(input.fetchRetryCount, 0, 5, DEFAULT_SETTINGS.fetchRetryCount),
    addRetryCount: clampInteger(input.addRetryCount, 0, 5, DEFAULT_SETTINGS.addRetryCount),
    failedCooldownMinutes: clampInteger(input.failedCooldownMinutes, 1, 24 * 60, DEFAULT_SETTINGS.failedCooldownMinutes),
    maxFailureCount: clampInteger(input.maxFailureCount, 1, 20, DEFAULT_SETTINGS.maxFailureCount)
  };
}

function normalizeOwners(owners) {
  if (!Array.isArray(owners)) {
    return DEFAULT_SETTINGS.owners;
  }

  return owners
    .map((owner) => ({
      mid: positiveInteger(owner?.mid, 0),
      name: typeof owner?.name === "string" ? owner.name.trim() : "",
      avatarUrl: typeof owner?.avatarUrl === "string" ? owner.avatarUrl : "",
      spaceUrl: typeof owner?.spaceUrl === "string" ? owner.spaceUrl : "",
      profileFetchedAt: typeof owner?.profileFetchedAt === "string" ? owner.profileFetchedAt : "",
      enabled: owner?.enabled !== false
    }))
    .filter((owner) => owner.mid > 0);
}

function pruneProcessedVideos(processedVideos) {
  const entries = Object.entries(processedVideos)
    .sort((left, right) => String(right[1]?.processedAt ?? "").localeCompare(String(left[1]?.processedAt ?? "")))
    .slice(0, MAX_PROCESSED_ITEMS);
  return Object.fromEntries(entries);
}

function pruneFailedVideos(failedVideos) {
  const entries = Object.entries(failedVideos)
    .sort((left, right) => String(right[1]?.lastFailedAt ?? "").localeCompare(String(left[1]?.lastFailedAt ?? "")))
    .slice(0, MAX_FAILED_ITEMS);
  return Object.fromEntries(entries);
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) {
    return fallback;
  }
  return Math.min(Math.max(Math.floor(parsed), min), max);
}
