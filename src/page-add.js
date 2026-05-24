const BILIBILI_HOME_URL = "https://www.bilibili.com/";

export async function addToWatchlaterInBilibiliPage(aid, csrf) {
  if (!csrf) {
    throw new Error("Missing bili_jct cookie.");
  }

  try {
    return await executeAddInTab(await getBilibiliTab({ createIfMissing: true }), aid, csrf);
  } catch (firstError) {
    const retryTab = await createBilibiliTab();
    try {
      return await executeAddInTab(retryTab, aid, csrf);
    } catch (secondError) {
      throw new Error(`${secondError.message}; first attempt: ${firstError.message}`);
    } finally {
      await closeTemporaryTab(retryTab);
    }
  }
}

async function executeAddInTab(tabInfo, aid, csrf) {
  let result;
  try {
    [result] = await chrome.scripting.executeScript({
      target: { tabId: tabInfo.tab.id },
      world: "MAIN",
      func: postAddToWatchlater,
      args: [Number(aid), csrf]
    });
  } finally {
    await closeTemporaryTab(tabInfo);
  }

  const value = result?.result;
  if (!value?.ok) {
    throw new Error(value?.message ?? "Failed to add video in Bilibili page context.");
  }

  return value.payload;
}

async function getBilibiliTab({ createIfMissing }) {
  const tabs = await chrome.tabs.query({
    url: [
      "https://www.bilibili.com/*",
      "https://space.bilibili.com/*"
    ]
  });

  const existing = tabs.find((tab) => tab.id && tab.url?.startsWith("https://"));
  if (existing?.id) {
    return {
      tab: existing,
      temporary: false
    };
  }

  if (!createIfMissing) {
    throw new Error("No Bilibili tab is available.");
  }

  return createBilibiliTab();
}

async function createBilibiliTab() {
  const tab = await chrome.tabs.create({
    url: BILIBILI_HOME_URL,
    active: false
  });
  await waitForTabComplete(tab.id);
  return {
    tab,
    temporary: true
  };
}

async function closeTemporaryTab(tabInfo) {
  if (!tabInfo?.temporary || !tabInfo.tab?.id) {
    return;
  }
  try {
    await chrome.tabs.remove(tabInfo.tab.id);
  } catch (_error) {
    // The user or browser may have already closed it.
  }
}

function waitForTabComplete(tabId) {
  return new Promise((resolve, reject) => {
    let done = false;

    const timeout = setTimeout(() => {
      finish(() => reject(new Error("Timed out while waiting for Bilibili tab to load.")));
    }, 15000);

    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId !== tabId || changeInfo.status !== "complete") {
        return;
      }
      finish(resolve);
    };

    const finish = (callback) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(listener);
      callback();
    };

    chrome.tabs.onUpdated.addListener(listener);

    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        finish(() => reject(new Error(chrome.runtime.lastError.message)));
        return;
      }
      if (tab?.status === "complete") {
        finish(resolve);
      }
    });
  });
}

async function postAddToWatchlater(aid, csrf) {
  try {
    const response = await fetch("https://api.bilibili.com/x/v2/history/toview/add", {
      method: "POST",
      credentials: "include",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
      },
      body: new URLSearchParams({
        aid: String(aid),
        csrf
      })
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `HTTP ${response.status} ${response.statusText}`
      };
    }

    const payload = await response.json();
    if (payload.code !== 0) {
      return {
        ok: false,
        message: `Bilibili API code=${payload.code}, message=${payload.message}`,
        payload
      };
    }

    return {
      ok: true,
      payload
    };
  } catch (error) {
    return {
      ok: false,
      message: error?.message ?? String(error)
    };
  }
}
