// ===== Theme =====
const root = document.documentElement;
const themeBtn = document.getElementById("themeBtn");
const themeIcon = document.getElementById("themeIcon");

function getStoredTheme() {
  return localStorage.getItem("theme");
}
function setTheme(theme) {
  if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  localStorage.setItem("theme", theme);
  renderThemeIcon(theme);
}
function renderThemeIcon(theme) {
  // 小さめのアイコン（太陽/月）
  themeIcon.innerHTML =
    theme === "light"
      ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
           <path d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm0-16h1v3h-1V2Zm0 19h1v3h-1v-3ZM2 11h3v1H2v-1Zm19 0h3v1h-3v-1ZM4.2 4.2l2.1 2.1-.7.7L3.5 4.9l.7-.7Zm14 14 2.1 2.1-.7.7-2.1-2.1.7-.7ZM19.8 4.2l.7.7-2.1 2.1-.7-.7 2.1-2.1ZM6.3 17.7l.7.7-2.1 2.1-.7-.7 2.1-2.1Z"/>
         </svg>`
      : `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
           <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3a7 7 0 1 0 11.5 11.5Z"/>
         </svg>`;
}

const stored = getStoredTheme();
if (stored) setTheme(stored);
else {
  // OS設定に寄せる
  const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  setTheme(prefersLight ? "light" : "dark");
}

themeBtn?.addEventListener("click", () => {
  const isLight = root.getAttribute("data-theme") === "light";
  setTheme(isLight ? "dark" : "light");
});

// ===== Mobile menu =====
const menuBtn = document.getElementById("menuBtn");
const mobileNav = document.getElementById("mobileNav");

function closeMenu() {
  if (!mobileNav) return;
  mobileNav.hidden = true;
  menuBtn?.setAttribute("aria-expanded", "false");
}
function toggleMenu() {
  if (!mobileNav) return;
  const open = mobileNav.hidden === false;
  mobileNav.hidden = open;
  menuBtn?.setAttribute("aria-expanded", String(!open));
}
menuBtn?.addEventListener("click", toggleMenu);
mobileNav?.addEventListener("click", (e) => {
  const target = e.target;
  if (target && target.matches && target.matches("a")) closeMenu();
});

// ===== Reveal animation =====
const revealEls = document.querySelectorAll(".reveal");
const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.12 }
);
revealEls.forEach((el) => io.observe(el));

// ===== Footer year =====
document.getElementById("year").textContent = String(new Date().getFullYear());

// ===== Contact: make mail draft =====
const form = document.getElementById("contactForm");
form?.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const name = (fd.get("name") || "").toString().trim();
  const msg = (fd.get("message") || "").toString().trim();

  const subject = encodeURIComponent("Webサイトを見ました（相談）");
  const body = encodeURIComponent(
`お世話になっております。
${name ? `\n${name}です。` : ""}

【相談内容】
${msg || "（ここに内容を書いてください）"}

よろしくお願いいたします。`
  );

  const to = "your-email@example.com"; // 本当に送られても困るので書き換えてないよ
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
});
