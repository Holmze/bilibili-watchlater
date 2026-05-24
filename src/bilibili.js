import { signWbiParams } from "./wbi.js";

const NAV_URL = "https://api.bilibili.com/x/web-interface/nav";
const SPACE_ARC_URL = "https://api.bilibili.com/x/space/wbi/arc/search";
const SPACE_CARD_URL = "https://api.bilibili.com/x/web-interface/card";

export async function getBilibiliCookies() {
  const [sessdata, biliJct] = await Promise.all([
    chrome.cookies.get({ url: "https://www.bilibili.com/", name: "SESSDATA" }),
    chrome.cookies.get({ url: "https://www.bilibili.com/", name: "bili_jct" })
  ]);
  return {
    hasSessdata: Boolean(sessdata?.value),
    hasBiliJct: Boolean(biliJct?.value),
    sessdataDomain: sessdata?.domain ?? null,
    biliJctDomain: biliJct?.domain ?? null
  };
}

export async function getBiliJct() {
  const cookie = await chrome.cookies.get({
    url: "https://www.bilibili.com/",
    name: "bili_jct"
  });
  return cookie?.value ?? "";
}

export async function fetchNav() {
  const payload = await getJson(NAV_URL);
  const data = payload.data ?? {};
  return {
    isLogin: Boolean(data.isLogin),
    mid: data.mid ?? null,
    uname: data.uname ?? null,
    raw: payload
  };
}

export async function fetchLatestVideos(mid, pageSize = 5) {
  const nav = await fetchNav();
  return fetchLatestVideosWithNav(mid, pageSize, nav);
}

export async function fetchLatestVideosWithNav(mid, pageSize = 5, nav) {
  const wbiImg = nav.raw?.data?.wbi_img ?? {};
  const imgKey = stem(wbiImg.img_url);
  const subKey = stem(wbiImg.sub_url);

  if (!imgKey || !subKey) {
    throw new Error("Failed to read WBI keys from nav response.");
  }

  const params = await signWbiParams(
    {
      mid,
      pn: 1,
      ps: pageSize,
      order: "pubdate",
      platform: "web",
      web_location: 1550101
    },
    imgKey,
    subKey
  );
  const query = new URLSearchParams(params).toString();
  const payload = await getJson(`${SPACE_ARC_URL}?${query}`);
  const videos = payload?.data?.list?.vlist ?? [];

  return videos.map((video) => ({
    aid: video.aid,
    bvid: video.bvid,
    title: video.title,
    author: video.author,
    created: video.created,
    length: video.length
  }));
}

export async function fetchOwnerProfile(mid) {
  const query = new URLSearchParams({
    mid: String(mid),
    photo: "true"
  });
  const payload = await getJson(`${SPACE_CARD_URL}?${query}`);
  const card = payload.data?.card ?? {};

  return {
    mid: Number(card.mid || mid),
    name: card.name ?? "",
    avatarUrl: normalizeBilibiliUrl(card.face ?? ""),
    spaceUrl: `https://space.bilibili.com/${mid}`,
    fetchedAt: new Date().toISOString()
  };
}

async function getJson(url) {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    referrer: "https://www.bilibili.com/",
    headers: {
      "Accept": "application/json, text/plain, */*"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (payload.code !== 0) {
    throw new Error(`Bilibili API code=${payload.code}, message=${payload.message}`);
  }
  return payload;
}

function stem(url) {
  if (!url) return "";
  const pathname = new URL(url).pathname;
  const filename = pathname.split("/").pop() ?? "";
  return filename.split(".")[0] ?? "";
}

function normalizeBilibiliUrl(url) {
  if (!url) return "";
  if (url.startsWith("//")) {
    return `https:${url}`;
  }
  return url;
}
