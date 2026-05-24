import { fetchLatestVideosWithNav, fetchNav, getBiliJct } from "./bilibili.js";
import { addToWatchlaterInBilibiliPage } from "./page-add.js";
import {
  acquireSyncLock,
  getFailedVideos,
  getProcessedVideos,
  getSettings,
  releaseSyncLock,
  saveFailedVideos,
  saveLastSync,
  saveProcessedVideos
} from "./storage.js";

export async function runSync(trigger) {
  const lockResult = await acquireSyncLock(trigger);
  if (!lockResult.acquired) {
    const result = buildResult({
      trigger,
      dryRun: true,
      settings: await getSettings(),
      startedAt: new Date().toISOString(),
      results: [
        {
          status: "locked",
          category: "locked",
          message: `Sync already running since ${lockResult.lock.startedAt}`
        }
      ]
    });
    await saveLastSync(result);
    return result;
  }

  try {
    return await runSyncWithLock(trigger);
  } finally {
    await releaseSyncLock(lockResult.lock);
  }
}

async function runSyncWithLock(trigger) {
  const settings = await getSettings();
  const startedAt = new Date().toISOString();
  const results = [];

  if (trigger === "alarm" && !settings.dryRun && !settings.allowAutoLiveSync) {
    const result = buildResult({
      trigger,
      dryRun: settings.dryRun,
      settings,
      startedAt,
      results: [
        {
          status: "auto_live_blocked",
          category: "safety",
          message: "Auto live sync is blocked. Enable Allow auto live sync in Options."
        }
      ]
    });
    await saveLastSync(result);
    return result;
  }

  const nav = await fetchNav();
  if (!nav.isLogin) {
    const result = buildResult({
      trigger,
      dryRun: settings.dryRun,
      settings,
      startedAt,
      results: [
        {
          status: "login_expired",
          category: "auth",
          message: "Bilibili login state is not available."
        }
      ]
    });
    await saveLastSync(result);
    return result;
  }

  const processedVideos = await getProcessedVideos();
  const failedVideos = await getFailedVideos();
  const ownerStats = {};

  for (const owner of settings.owners.filter((item) => item.enabled)) {
    ownerStats[String(owner.mid)] = {
      owner,
      checkedAt: new Date().toISOString(),
      fetched: 0,
      candidates: 0,
      added: 0,
      failed: 0,
      skipped: 0
    };

    let videos;
    try {
      videos = await retry(
        () => fetchLatestVideosWithNav(owner.mid, settings.pageSize, nav),
        settings.fetchRetryCount,
        1000
      );
      ownerStats[String(owner.mid)].fetched = videos.length;
    } catch (error) {
      ownerStats[String(owner.mid)].failed += 1;
      results.push({
        status: "fetch_failed",
        category: "fetch",
        owner,
        message: serializeError(error).message
      });
      continue;
    }

    for (const video of filterRecent(videos, settings.maxAgeHours)) {
      ownerStats[String(owner.mid)].candidates += 1;
      const aid = String(video.aid);
      const existing = processedVideos[aid];
      if (existing?.status === "added") {
        ownerStats[String(owner.mid)].skipped += 1;
        results.push({
          status: "skipped_seen",
          category: "dedupe",
          owner,
          video
        });
        continue;
      }

      const failed = failedVideos[aid];
      if (shouldCooldownFailure(failed, settings)) {
        ownerStats[String(owner.mid)].skipped += 1;
        results.push({
          status: "skipped_failed_cooldown",
          category: "cooldown",
          owner,
          video,
          message: failed.message
        });
        continue;
      }

      if (settings.dryRun) {
        results.push({
          status: "dry_run",
          category: "candidate",
          owner,
          video
        });
        continue;
      }

      try {
        const csrf = await getBiliJct();
        await retry(
          () => addToWatchlaterInBilibiliPage(video.aid, csrf),
          settings.addRetryCount,
          1500
        );
        processedVideos[aid] = {
          status: "added",
          bvid: video.bvid,
          title: video.title,
          ownerMid: owner.mid,
          processedAt: new Date().toISOString()
        };
        delete failedVideos[aid];
        ownerStats[String(owner.mid)].added += 1;
        results.push({
          status: "added",
          category: "add",
          owner,
          video
        });
        await sleep(settings.addIntervalSeconds * 1000);
      } catch (error) {
        const classified = classifyAddError(error);
        ownerStats[String(owner.mid)].failed += 1;
        failedVideos[aid] = {
          aid: video.aid,
          bvid: video.bvid,
          title: video.title,
          ownerMid: owner.mid,
          failureCount: (failedVideos[aid]?.failureCount ?? 0) + 1,
          lastFailedAt: new Date().toISOString(),
          status: classified.status,
          category: classified.category,
          message: classified.message
        };
        results.push({
          status: classified.status,
          category: classified.category,
          owner,
          video,
          message: classified.message
        });
      }
    }
  }

  if (!settings.dryRun) {
    await Promise.all([
      saveProcessedVideos(processedVideos),
      saveFailedVideos(failedVideos)
    ]);
  }

  const result = buildResult({
    trigger,
    dryRun: settings.dryRun,
    settings,
    startedAt,
    ownerStats,
    results: results.slice(0, 100)
  });
  await saveLastSync(result);
  return result;
}

export function filterRecent(videos, maxAgeHours) {
  if (maxAgeHours === null) {
    return videos;
  }

  const cutoffSeconds = Date.now() / 1000 - maxAgeHours * 60 * 60;
  return videos.filter((video) => Number(video.created || 0) >= cutoffSeconds);
}

export function countByStatus(results) {
  return results.reduce((counts, item) => {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  }, {});
}

function buildResult({ trigger, dryRun, settings, startedAt, ownerStats = {}, results }) {
  return {
    ok: !results.some((item) => isFailureStatus(item.status)),
    trigger,
    startedAt,
    finishedAt: new Date().toISOString(),
    dryRun,
    settings,
    counts: countByStatus(results),
    ownerStats,
    results
  };
}

function isFailureStatus(status) {
  return [
    "fetch_failed",
    "add_http_failed",
    "add_api_failed",
    "inject_failed",
    "login_expired",
    "failed"
  ].includes(status);
}

function shouldCooldownFailure(failed, settings) {
  if (!failed) {
    return false;
  }
  if ((failed.failureCount ?? 0) < settings.maxFailureCount) {
    return false;
  }
  const lastFailedAt = Date.parse(failed.lastFailedAt ?? "");
  if (!Number.isFinite(lastFailedAt)) {
    return false;
  }
  return Date.now() - lastFailedAt < settings.failedCooldownMinutes * 60 * 1000;
}

function classifyAddError(error) {
  const message = serializeError(error).message;
  if (/HTTP\s+\d+/.test(message)) {
    return {
      status: "add_http_failed",
      category: "http",
      message
    };
  }
  if (/Bilibili API code=/.test(message)) {
    return {
      status: "add_api_failed",
      category: "api",
      message
    };
  }
  if (/script|inject|tab|frame|Cannot access|Timed out/i.test(message)) {
    return {
      status: "inject_failed",
      category: "inject",
      message
    };
  }
  return {
    status: "failed",
    category: "unknown",
    message
  };
}

async function retry(fn, retryCount, delayMs) {
  let lastError;
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retryCount) {
        await sleep(delayMs * (attempt + 1));
      }
    }
  }
  throw lastError;
}

function sleep(ms) {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function serializeError(error) {
  return {
    name: error?.name ?? "Error",
    message: error?.message ?? String(error),
    stack: error?.stack ?? null
  };
}
