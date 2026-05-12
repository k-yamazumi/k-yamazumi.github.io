// ここにリンクを追加していくだけでボタンが増える
const links = [
  {
    title: "OBSオーバーレイ 設定ページ",
    url: "./news-uhb/setting.html",
    icon: "📰",
  },
  {
    title: "ワードクラウドジェネレーター",
    url: "https://create-wordcloud.streamlit.app/",
    comment: "テキストマイニング(選挙配信で使用)",
    icon: "☁️",
  },
  {
    title: "タイトルコピペアプリ",
    url: "https://title-copy.streamlit.app/",
    icon: "📜",
  },
  {
    title: "YouTubeLiveリアルタイム監視",
    url: "https://ytlivestat.streamlit.app/",
    comment: "YouTubeLiveの視聴数などを比較するツール",
    icon: "📊",
  },

  // 追加例：
  // {
  //   title: "X (Twitter)",
  //   url: "https://x.com/",
  //   comment: "旧Twitter",
  //   icon: "𝕏", // 絵文字でもOK
  // },
];

function normalizeUrlDisplay(url) {
  try {
    const u = new URL(url);
    return u.host + u.pathname.replace(/\/$/, "");
  } catch {
    return url;
  }
}

function createLinkButton({ title, url, comment, icon }) {
  const a = document.createElement("a");
  a.className = "link-btn";
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";

  a.innerHTML = `
    <span class="link-left">
      <span class="badge" aria-hidden="true">${icon ?? "🔗"}</span>
      <span class="link-text">
        <span class="link-title">${title ?? "Link"}</span>
        <span class="link-comment">${comment ?? ""}</span>
      </span>
    </span>
    <span class="arrow" aria-hidden="true">→</span>
  `;

  return a;
}

function renderLinks() {
  const container = document.getElementById("links");
  if (!container) return;

  container.innerHTML = "";
  links.forEach((link) => container.appendChild(createLinkButton(link)));
}

function setYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = String(new Date().getFullYear());
}

renderLinks();
setYear();
