(() => {
  'use strict';

  // =========================================================
  // Constants / Defaults
  // =========================================================
  const STORAGE_KEY = 'obs_overlay_settings_v2';

  const PROD_QUAKE_API = 'https://api-v2.p2pquake.net/v2';
  const SANDBOX_QUAKE_API = 'https://api-v2-sandbox.p2pquake.net/v2';

  // MP3のファイルパス
  const SOUND_LV1_SRC = './sound/Alert01.mp3';
  const SOUND_LV2_SRC = './sound/Alert02.mp3';

  const PREFS = [
    '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
    '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
    '新潟県','富山県','石川県','福井県','山梨県','長野県',
    '岐阜県','静岡県','愛知県','三重県',
    '滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県',
    '鳥取県','島根県','岡山県','広島県','山口県',
    '徳島県','香川県','愛媛県','高知県',
    '福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県',
    '沖縄県'
  ];

  // overlay（URLパラメータ / 保存値）としての基準値
  const DEFAULTS = {
    // clock
    timeOn: true,
    timeDate: true,
    timeDow: true,
    timeSec: false,
    time24h: true,

    // earthquake
    quakeOn: true,
    quakeMinScale: 30,
    quakePageSec: 5,
    quakePerPage: 9,
    quakePollSec: 20,
    quakePrefs: PREFS.slice(),
    quakeProxy: '',

    // sounds
    sound1Min: 30,
    sound1Repeat: 1,
    sound2Min: 50,
    sound2Repeat: 2,

    // news
    newsOn: true,
    newsRss: '', // 未設定なら非表示（フォールバック無し）
    newsAgeHours: 24,
    newsSpeed: 90, // px/sec
    newsExclude: '',
    newsProxy: '',

    // debug
    showStatus: false,

    // test flags (URL query only)
    testMode: false,
    quakeSandbox: false
  };

  // settingsページの「初期入力値」（更新でここに戻す）
  // ※ overlay側のフォールバックとは別枠で管理
  const SETTINGS_INITIAL = {
    newsRss: 'https://news.yahoo.co.jp/rss/media/hokkaibun/all.xml',
    newsProxy: 'https://api.allorigins.win/raw?url=',
    newsSpeed: 90,
    quakeProxy: ''
  };

  // =========================================================
  // Utils
  // =========================================================
  const $ = (id) => document.getElementById(id);

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const toInt = (v, fallback) => {
    const n = Number.parseInt(String(v ?? '').trim(), 10);
    return Number.isFinite(n) ? n : fallback;
  };

  const toStr = (v) => String(v ?? '').trim();

  const toBoolLoose = (v, fallback) => {
    if (v === undefined || v === null || v === '') return fallback;
    const s = String(v).toLowerCase();
    if (['1', 'true', 'on', 'yes'].includes(s)) return true;
    if (['0', 'false', 'off', 'no'].includes(s)) return false;
    return fallback;
  };

  const csvToArr = (s) => toStr(s)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  const uniq = (arr) => Array.from(new Set(arr));

  const safeJsonParse = (s, fallback) => {
    try {
      return JSON.parse(s);
    } catch {
      return fallback;
    }
  };

  const applyProxy = (url, proxy) => {
    const p = toStr(proxy);
    if (!p) return url;

    // Template style: https://example.com/?url={url}
    if (p.includes('{url}')) return p.replaceAll('{url}', encodeURIComponent(url));
    if (p.includes('%URL%')) return p.replaceAll('%URL%', encodeURIComponent(url));

    // Query style: https://example.com/?url=
    if (p.includes('?') || p.endsWith('=')) return `${p}${encodeURIComponent(url)}`;

    // Prefix style
    return `${p}${url}`;
  };

  const buildOverlayUrl = (cfg, { sandbox = false, test = false } = {}) => {
    const url = new URL('./main.html', location.href);
    const params = new URLSearchParams();

    // clock
    params.set('time_on', cfg.timeOn ? '1' : '0');
    params.set('time_date', cfg.timeDate ? '1' : '0');
    params.set('time_dow', cfg.timeDow ? '1' : '0');
    params.set('time_sec', cfg.timeSec ? '1' : '0');
    params.set('time_24h', cfg.time24h ? '1' : '0');

    // quake
    params.set('quake_on', cfg.quakeOn ? '1' : '0');
    params.set('quake_min', String(cfg.quakeMinScale));
    params.set('quake_page', String(cfg.quakePageSec));
    params.set('quake_per', String(cfg.quakePerPage));
    params.set('quake_poll', String(cfg.quakePollSec));
    params.set('quake_prefs', cfg.quakePrefs.join(','));
    if (toStr(cfg.quakeProxy)) params.set('quake_proxy', toStr(cfg.quakeProxy));

    // sounds
    params.set('sound1_min', String(cfg.sound1Min));
    params.set('sound1_rep', String(cfg.sound1Repeat));
    params.set('sound2_min', String(cfg.sound2Min));
    params.set('sound2_rep', String(cfg.sound2Repeat));

    // news
    params.set('news_on', cfg.newsOn ? '1' : '0');
    if (toStr(cfg.newsRss)) params.set('news_rss', toStr(cfg.newsRss));
    params.set('news_age', String(cfg.newsAgeHours));
    params.set('news_speed', String(cfg.newsSpeed));
    if (toStr(cfg.newsExclude)) params.set('news_ex', toStr(cfg.newsExclude));
    if (toStr(cfg.newsProxy)) params.set('news_proxy', toStr(cfg.newsProxy));

    // debug
    if (cfg.showStatus) params.set('debug', '1');

    // test
    if (sandbox) params.set('quake_sandbox', '1');
    if (test) params.set('test', '1');

    url.search = params.toString();
    return url.toString();
  };

  const copyToClipboard = async (text) => {
    const t = String(text);
    if (!t) return false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(t);
        return true;
      }
    } catch {
      // fallback below
    }

    try {
      const ta = document.createElement('textarea');
      ta.value = t;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  };

  const loadSavedConfig = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = safeJsonParse(raw, null);
    if (!saved || typeof saved !== 'object') return null;
    return saved;
  };

  const saveConfig = (cfg) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch {
      // ignore
    }
  };

  const mergeDefaults = (maybeCfg) => {
    const cfg = { ...DEFAULTS, ...(maybeCfg || {}) };

    // arrays
    cfg.quakePrefs = Array.isArray(cfg.quakePrefs) ? cfg.quakePrefs : csvToArr(cfg.quakePrefs);
    cfg.quakePrefs = uniq(cfg.quakePrefs).filter((p) => PREFS.includes(p));
    if (cfg.quakePrefs.length === 0) cfg.quakePrefs = PREFS.slice();

    // ints
    cfg.quakeMinScale = clamp(toInt(cfg.quakeMinScale, DEFAULTS.quakeMinScale), 10, 70);
    cfg.quakePageSec = clamp(toInt(cfg.quakePageSec, DEFAULTS.quakePageSec), 1, 60);
    cfg.quakePerPage = clamp(toInt(cfg.quakePerPage, DEFAULTS.quakePerPage), 4, 60);
    cfg.quakePollSec = clamp(toInt(cfg.quakePollSec, DEFAULTS.quakePollSec), 10, 120);

    cfg.sound1Min = clamp(toInt(cfg.sound1Min, DEFAULTS.sound1Min), 0, 70);
    cfg.sound1Repeat = clamp(toInt(cfg.sound1Repeat, DEFAULTS.sound1Repeat), 0, 10);
    cfg.sound2Min = clamp(toInt(cfg.sound2Min, DEFAULTS.sound2Min), 0, 70);
    cfg.sound2Repeat = clamp(toInt(cfg.sound2Repeat, DEFAULTS.sound2Repeat), 0, 10);

    cfg.newsAgeHours = clamp(toInt(cfg.newsAgeHours, DEFAULTS.newsAgeHours), 1, 365);
    cfg.newsSpeed = clamp(toInt(cfg.newsSpeed, DEFAULTS.newsSpeed), 40, 900);

    // strings
    cfg.newsRss = toStr(cfg.newsRss);
    cfg.newsExclude = String(cfg.newsExclude ?? '');
    cfg.newsProxy = toStr(cfg.newsProxy);
    cfg.quakeProxy = toStr(cfg.quakeProxy);

    // bools
    cfg.timeOn = Boolean(cfg.timeOn);
    cfg.timeDate = Boolean(cfg.timeDate);
    cfg.timeDow = Boolean(cfg.timeDow);
    cfg.timeSec = Boolean(cfg.timeSec);
    cfg.time24h = Boolean(cfg.time24h);

    cfg.quakeOn = Boolean(cfg.quakeOn);
    cfg.newsOn = Boolean(cfg.newsOn);
    cfg.showStatus = Boolean(cfg.showStatus);
    cfg.quakeSandbox = Boolean(cfg.quakeSandbox);
    cfg.testMode = Boolean(cfg.testMode);

    return cfg;
  };

  const scaleLabel = (scale) => {
    switch (scale) {
      case 10: return '1';
      case 20: return '2';
      case 30: return '3';
      case 40: return '4';
      case 45: return '5弱';
      case 50: return '5強';
      case 55: return '6弱';
      case 60: return '6強';
      case 70: return '7';
      default: return '--';
    }
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // =========================================================
  // Audio (MP3)
  // =========================================================
  const audioCache = new Map();

  const getAudio = (src) => {
    const key = String(src);
    if (audioCache.has(key)) return audioCache.get(key);

    const a = new Audio(key);
    a.preload = 'auto';
    audioCache.set(key, a);
    return a;
  };

  const playOnce = async (audioEl) => {
    try {
      audioEl.pause();
      audioEl.currentTime = 0;

      const p = audioEl.play();
      if (p && typeof p.then === 'function') await p;

      await new Promise((resolve) => {
        const done = () => resolve();
        audioEl.addEventListener('ended', done, { once: true });
        // 念のため（endedが来ない環境対策）
        setTimeout(done, Math.max(4000, (audioEl.duration || 0) * 1000 + 500));
      });
      return true;
    } catch {
      return false;
    }
  };

  const playMp3Alert = async (level, repeat = 1) => {
    const times = clamp(toInt(repeat, 1), 1, 9);
    const src = level === 2 ? SOUND_LV2_SRC : SOUND_LV1_SRC;
    const a = getAudio(src);

    for (let i = 0; i < times; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await playOnce(a);
      if (!ok) break;
      // eslint-disable-next-line no-await-in-loop
      await sleep(180);
    }
  };

  // =========================================================
  // Settings page
  // =========================================================
  const initSettings = () => {
    const toastEl = $('toast');
    const showToast = (msg) => {
      if (!toastEl) return;
      toastEl.textContent = String(msg);
      toastEl.classList.add('is-show');
      setTimeout(() => toastEl.classList.remove('is-show'), 1600);
    };

    const el = {
      // clock
      timeOn: $('s_timeOn'),
      timeBody: $('s_timeBody'),
      timeDate: $('s_timeDate'),
      timeDow: $('s_timeDow'),
      timeSec: $('s_timeSec'),
      time24h: $('s_time24h'),

      // quake
      quakeOn: $('s_quakeOn'),
      quakeBody: $('s_quakeBody'),
      quakeMinScale: $('s_quakeMinScale'),
      quakePageSec: $('s_quakePageSec'),
      quakePerPage: $('s_quakePerPage'),
      quakePollSec: $('s_quakePollSec'),
      prefList: $('prefList'),
      prefCount: $('prefCount'),
      btnPrefAll: $('btnPrefAll'),
      btnPrefNone: $('btnPrefNone'),

      // sound
      sound1Min: $('s_eqSound1Min'),
      sound1Repeat: $('s_eqSound1Repeat'),
      sound2Min: $('s_eqSound2Min'),
      sound2Repeat: $('s_eqSound2Repeat'),
      btnPreview1: $('btnPreviewSound1'),
      btnPreview2: $('btnPreviewSound2'),
      soundWarn: $('soundWarn'),

      // news
      newsOn: $('s_newsOn'),
      newsBody: $('s_newsBody'),
      newsRss: $('s_newsRss'),
      newsAge: $('s_newsAgeValue'),
      newsSpeed: $('s_newsSpeed'),
      newsExclude: $('s_newsExclude'),

      // details
      btnToggleDetails: $('btnToggleDetails'),
      detailsArea: $('detailsArea'),
      newsProxy: $('s_newsProxy'),
      quakeProxy: $('s_quakeProxy'),
      outUrl: $('outUrl'),
      btnQuakeDevTest: $('btnQuakeDevTest'),

      // actions
      btnBuild: $('btnBuild')
    };

    const renderPrefs = (selected) => {
      if (!el.prefList) return;
      el.prefList.innerHTML = '';

      for (const name of PREFS) {
        const label = document.createElement('label');
        label.className = 'pref-item';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = name;
        cb.checked = selected.includes(name);
        cb.addEventListener('change', onAnyChange);

        label.appendChild(cb);
        label.appendChild(document.createTextNode(name));
        el.prefList.appendChild(label);
      }

      updatePrefCount();
    };

    const getSelectedPrefs = () => {
      if (!el.prefList) return PREFS.slice();
      const cbs = Array.from(el.prefList.querySelectorAll('input[type="checkbox"]'));
      return cbs.filter((x) => x.checked).map((x) => x.value);
    };

    const setAllPrefs = (on) => {
      if (!el.prefList) return;
      const cbs = Array.from(el.prefList.querySelectorAll('input[type="checkbox"]'));
      for (const cb of cbs) cb.checked = on;
      updatePrefCount();
      onAnyChange();
    };

    const updatePrefCount = () => {
      if (!el.prefCount) return;
      const n = getSelectedPrefs().length;
      el.prefCount.textContent = `${n} / ${PREFS.length} 選択中`;
    };

    const readUi = () => {
      const cfg = {
        timeOn: !!el.timeOn?.checked,
        timeDate: !!el.timeDate?.checked,
        timeDow: !!el.timeDow?.checked,
        timeSec: !!el.timeSec?.checked,
        time24h: !!el.time24h?.checked,

        quakeOn: !!el.quakeOn?.checked,
        quakeMinScale: toInt(el.quakeMinScale?.value, DEFAULTS.quakeMinScale),
        quakePageSec: toInt(el.quakePageSec?.value, DEFAULTS.quakePageSec),
        quakePerPage: toInt(el.quakePerPage?.value, DEFAULTS.quakePerPage),
        quakePollSec: toInt(el.quakePollSec?.value, DEFAULTS.quakePollSec),
        quakePrefs: getSelectedPrefs(),

        sound1Min: toInt(el.sound1Min?.value, DEFAULTS.sound1Min),
        sound1Repeat: toInt(el.sound1Repeat?.value, DEFAULTS.sound1Repeat),
        sound2Min: toInt(el.sound2Min?.value, DEFAULTS.sound2Min),
        sound2Repeat: toInt(el.sound2Repeat?.value, DEFAULTS.sound2Repeat),

        newsOn: !!el.newsOn?.checked,
        newsRss: toStr(el.newsRss?.value),
        newsAgeHours: toInt(el.newsAge?.value, DEFAULTS.newsAgeHours),
        newsSpeed: toInt(el.newsSpeed?.value, DEFAULTS.newsSpeed),
        newsExclude: String(el.newsExclude?.value ?? ''),

        newsProxy: toStr(el.newsProxy?.value),
        quakeProxy: toStr(el.quakeProxy?.value)
      };

      return mergeDefaults(cfg);
    };

    const writeUi = (cfg) => {
      if (el.timeOn) el.timeOn.checked = !!cfg.timeOn;
      if (el.timeDate) el.timeDate.checked = !!cfg.timeDate;
      if (el.timeDow) el.timeDow.checked = !!cfg.timeDow;
      if (el.timeSec) el.timeSec.checked = !!cfg.timeSec;
      if (el.time24h) el.time24h.checked = !!cfg.time24h;

      if (el.quakeOn) el.quakeOn.checked = !!cfg.quakeOn;
      if (el.quakeMinScale) el.quakeMinScale.value = String(cfg.quakeMinScale);
      if (el.quakePageSec) el.quakePageSec.value = String(cfg.quakePageSec);
      if (el.quakePerPage) el.quakePerPage.value = String(cfg.quakePerPage);
      if (el.quakePollSec) el.quakePollSec.value = String(cfg.quakePollSec);

      if (el.sound1Min) el.sound1Min.value = String(cfg.sound1Min);
      if (el.sound1Repeat) el.sound1Repeat.value = String(cfg.sound1Repeat);
      if (el.sound2Min) el.sound2Min.value = String(cfg.sound2Min);
      if (el.sound2Repeat) el.sound2Repeat.value = String(cfg.sound2Repeat);

      if (el.newsOn) el.newsOn.checked = !!cfg.newsOn;
      if (el.newsRss) el.newsRss.value = cfg.newsRss;
      if (el.newsAge) el.newsAge.value = String(cfg.newsAgeHours);
      if (el.newsSpeed) el.newsSpeed.value = String(cfg.newsSpeed);
      if (el.newsExclude) el.newsExclude.value = String(cfg.newsExclude ?? '');

      if (el.newsProxy) el.newsProxy.value = cfg.newsProxy;
      if (el.quakeProxy) el.quakeProxy.value = cfg.quakeProxy;

      renderPrefs(cfg.quakePrefs);
      applyVisibility();
      updateSoundWarn();
      updateOutUrl();
    };

    const applyVisibility = () => {
      if (el.timeBody) el.timeBody.style.display = el.timeOn?.checked ? '' : 'none';
      if (el.quakeBody) el.quakeBody.style.display = el.quakeOn?.checked ? '' : 'none';
      if (el.newsBody) el.newsBody.style.display = el.newsOn?.checked ? '' : 'none';

      // 一部環境で<select>の配色が反映されにくい対策
      document.querySelectorAll('select.input').forEach((s) => {
        s.style.color = '#fff';
        s.style.backgroundColor = 'rgba(255,255,255,.06)';
        s.style.borderColor = 'rgba(255,255,255,.18)';
      });
    };

    const updateOutUrl = () => {
      const cfg = readUi();
      const url = buildOverlayUrl(cfg);
      if (el.outUrl) el.outUrl.value = url;
    };

    const updateSoundWarn = () => {
      if (!el.soundWarn) return;
      const cfg = readUi();
      const bad = cfg.sound1Min > 0 && cfg.sound2Min > 0 && cfg.sound2Min <= cfg.sound1Min;
      if (bad) {
        el.soundWarn.style.display = '';
        el.soundWarn.textContent = '⚠ 音レベル2の閾値はレベル1より「大きい震度」を推奨します（同じ・小さいと区別がつきません）';
      } else {
        el.soundWarn.style.display = 'none';
        el.soundWarn.textContent = '';
      }
    };

    // settingsページでは「入力中は保存しない」：更新すると初期値に戻る
    const onAnyChange = () => {
      applyVisibility();
      updatePrefCount();
      updateSoundWarn();
      updateOutUrl();
    };

    // ---- 初期表示（更新で戻したいので saved は使わない）
    const cfg0 = mergeDefaults({ ...DEFAULTS, ...SETTINGS_INITIAL });
    writeUi(cfg0);

    const bindChange = (node) => {
      if (!node) return;
      node.addEventListener('change', onAnyChange);
      node.addEventListener('input', onAnyChange);
    };

    [
      el.timeOn, el.timeDate, el.timeDow, el.timeSec, el.time24h,
      el.quakeOn, el.quakeMinScale, el.quakePageSec, el.quakePerPage, el.quakePollSec,
      el.sound1Min, el.sound1Repeat, el.sound2Min, el.sound2Repeat,
      el.newsOn, el.newsRss, el.newsAge, el.newsSpeed, el.newsExclude,
      el.newsProxy, el.quakeProxy
    ].forEach(bindChange);

    if (el.btnPrefAll) el.btnPrefAll.addEventListener('click', () => setAllPrefs(true));
    if (el.btnPrefNone) el.btnPrefNone.addEventListener('click', () => setAllPrefs(false));

    if (el.btnPreview1) {
      el.btnPreview1.addEventListener('click', async () => {
        const cfg = readUi();
        await playMp3Alert(1, Math.max(1, cfg.sound1Repeat || 1));
      });
    }

    if (el.btnPreview2) {
      el.btnPreview2.addEventListener('click', async () => {
        const cfg = readUi();
        await playMp3Alert(2, Math.max(1, cfg.sound2Repeat || 1));
      });
    }

    if (el.btnToggleDetails && el.detailsArea) {
      el.btnToggleDetails.addEventListener('click', () => {
        const shown = el.detailsArea.style.display !== 'none';
        el.detailsArea.style.display = shown ? 'none' : '';
        el.btnToggleDetails.textContent = shown ? '詳細設定を開く' : '詳細設定を閉じる';
      });
    }

    // URLコピー：押した時点で「ここまでの入力内容」を保存 → その後コピー
    if (el.btnBuild) {
      el.btnBuild.addEventListener('click', async () => {
        const cfg = readUi();
        saveConfig(cfg);

        const url = buildOverlayUrl(cfg);
        const ok = await copyToClipboard(url);
        showToast(ok ? 'URLをコピーしました' : 'コピーに失敗しました');
        updateOutUrl();
      });
    }

    if (el.btnQuakeDevTest) {
      el.btnQuakeDevTest.addEventListener('click', async () => {
        const cfg = readUi();
        saveConfig(cfg);

        const url = buildOverlayUrl(cfg, { sandbox: true, test: true });
        const ok = await copyToClipboard(url);
        showToast(ok ? 'テスト用URL（サンドボックス）をコピーしました' : 'コピーに失敗しました');
        if (el.outUrl) el.outUrl.value = url;
      });
    }
  };

  // =========================================================
  // Overlay page
  // =========================================================
  const parseConfigFromUrl = () => {
    const sp = new URLSearchParams(location.search);
    if ([...sp.keys()].length === 0) {
      const saved = loadSavedConfig();
      return mergeDefaults(saved || DEFAULTS);
    }

    const cfg = {
      timeOn: toBoolLoose(sp.get('time_on'), DEFAULTS.timeOn),
      timeDate: toBoolLoose(sp.get('time_date'), DEFAULTS.timeDate),
      timeDow: toBoolLoose(sp.get('time_dow'), DEFAULTS.timeDow),
      timeSec: toBoolLoose(sp.get('time_sec'), DEFAULTS.timeSec),
      time24h: toBoolLoose(sp.get('time_24h'), DEFAULTS.time24h),

      quakeOn: toBoolLoose(sp.get('quake_on'), DEFAULTS.quakeOn),
      quakeMinScale: toInt(sp.get('quake_min'), DEFAULTS.quakeMinScale),
      quakePageSec: toInt(sp.get('quake_page'), DEFAULTS.quakePageSec),
      quakePerPage: toInt(sp.get('quake_per'), DEFAULTS.quakePerPage),
      quakePollSec: toInt(sp.get('quake_poll'), DEFAULTS.quakePollSec),
      quakePrefs: csvToArr(sp.get('quake_prefs')),
      quakeProxy: toStr(sp.get('quake_proxy')),
      quakeSandbox: toBoolLoose(sp.get('quake_sandbox'), false),

      sound1Min: toInt(sp.get('sound1_min'), DEFAULTS.sound1Min),
      sound1Repeat: toInt(sp.get('sound1_rep'), DEFAULTS.sound1Repeat),
      sound2Min: toInt(sp.get('sound2_min'), DEFAULTS.sound2Min),
      sound2Repeat: toInt(sp.get('sound2_rep'), DEFAULTS.sound2Repeat),

      newsOn: toBoolLoose(sp.get('news_on'), DEFAULTS.newsOn),
      newsRss: toStr(sp.get('news_rss')),
      newsAgeHours: toInt(sp.get('news_age'), DEFAULTS.newsAgeHours),
      newsSpeed: toInt(sp.get('news_speed'), DEFAULTS.newsSpeed),
      newsExclude: String(sp.get('news_ex') ?? ''),
      newsProxy: toStr(sp.get('news_proxy')),

      showStatus: toBoolLoose(sp.get('debug'), false),

      testMode: toBoolLoose(sp.get('test'), false)
    };

    return mergeDefaults(cfg);
  };

  const initOverlay = () => {
    const cfg = parseConfigFromUrl();

    const clockEl = $('clock');
    const clockTimeEl = $('clockTime');
    const clockDateEl = $('clockDate');

    const tickerEl = $('ticker');
    const tickerTrackEl = $('tickerTrack');
    const tickerContentEl = $('tickerContent');
    const tickerContent2El = $('tickerContent2');

    const quakeEl = $('quake');
    const quakeHeadlineEl = $('quakeHeadline');
    const quakeDetailEl = $('quakeDetail');

    const statusEl = $('status');
    const testModeEl = $('testMode');

    const setStatus = (msg) => {
      if (!statusEl) return;
      if (!cfg.showStatus) {
        statusEl.style.display = 'none';
        return;
      }
      statusEl.style.display = 'block';
      statusEl.textContent = String(msg);
    };

    // ---- Clock
    const pad2 = (n) => String(n).padStart(2, '0');
    const dowJa = ['日', '月', '火', '水', '木', '金', '土'];

    const updateClock = () => {
      if (!clockEl) return;
      if (!cfg.timeOn) {
        clockEl.style.display = 'none';
        return;
      }
      clockEl.style.display = '';

      const d = new Date();
      let hh = d.getHours();
      const mm = d.getMinutes();
      const ss = d.getSeconds();

      if (!cfg.time24h) {
        hh %= 12;
        if (hh === 0) hh = 12;
      }

      const t = cfg.timeSec
        ? `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`
        : `${pad2(hh)}:${pad2(mm)}`;

      if (clockTimeEl) clockTimeEl.textContent = t;

      const parts = [];
      if (cfg.timeDate) parts.push(`${d.getMonth() + 1}月${d.getDate()}日`);
      if (cfg.timeDow) parts.push(`(${dowJa[d.getDay()]})`);
      if (clockDateEl) clockDateEl.textContent = parts.join(' ');
    };

    updateClock();
    setInterval(updateClock, cfg.timeSec ? 250 : 1000);

    // ---- TEST MODE badge
    if (testModeEl) testModeEl.style.display = cfg.testMode ? 'block' : 'none';

    // ---- News ticker
    const hideTicker = () => { if (tickerEl) tickerEl.style.display = 'none'; };
    const showTicker = () => { if (tickerEl) tickerEl.style.display = ''; };

    const ensureTickerLoop = () => {
      if (!tickerTrackEl) return;

      // 2つのコンテンツを完全一致させる
      if (tickerContentEl && tickerContent2El) {
        tickerContent2El.textContent = tickerContentEl.textContent;
      }

      // spacerを2個にして「全体 = 2 * (片道)」を保証する（-50%移動がズレない）
      const spacers = Array.from(tickerTrackEl.querySelectorAll('.ticker__spacer'));
      if (spacers.length === 1) {
        const tail = spacers[0].cloneNode(true);
        tail.dataset.spacer = 'tail';
        tickerTrackEl.appendChild(tail);
      }
    };

    const startTickerAnimation = () => {
      if (!tickerTrackEl) return;

      ensureTickerLoop();

      const full = tickerTrackEl.scrollWidth;
      if (!Number.isFinite(full) || full <= 0) return;

      const distance = full / 2; // px
      const speed = clamp(toInt(cfg.newsSpeed, DEFAULTS.newsSpeed), 40, 900); // px/sec
      let durationSec = distance / speed;

      durationSec = clamp(durationSec, 18, 240);
      tickerTrackEl.style.animationDuration = `${durationSec}s`;
      tickerTrackEl.style.animationPlayState = 'running';
    };

    const initTicker = async () => {
      if (!tickerEl || !tickerTrackEl || !tickerContentEl || !tickerContent2El) return;

      if (!cfg.newsOn || !cfg.newsRss) {
        hideTicker();
        return;
      }

      const rssUrl = cfg.newsRss;
      const fetchUrl = applyProxy(rssUrl, cfg.newsProxy);

      const ageMs = clamp(toInt(cfg.newsAgeHours, DEFAULTS.newsAgeHours), 1, 365) * 60 * 60 * 1000;
      const now = Date.now();

      const excludeWords = String(cfg.newsExclude || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const text = await (async () => {
        try {
          const res = await fetch(fetchUrl, { cache: 'no-store' });
          if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
          const xmlText = await res.text();

          const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
          const items = Array.from(doc.querySelectorAll('item'));

          const titles = items
            .map((it) => {
              const title = (it.querySelector('title')?.textContent || '').trim();
              const pubDateStr = (it.querySelector('pubDate')?.textContent || '').trim();
              const pubMs = pubDateStr ? Date.parse(pubDateStr) : NaN;
              return { title, pubMs };
            })
            .filter((x) => x.title)
            .filter((x) => (!Number.isFinite(x.pubMs) ? true : (now - x.pubMs <= ageMs)))
            .filter((x) => (excludeWords.length === 0 ? true : !excludeWords.some((w) => x.title.includes(w))))
            .slice(0, 50)
            .map((x) => x.title);

          if (titles.length === 0) return '（新しいニュースがありません）';
          return titles.join('　◆　');
        } catch (err) {
          console.warn(err);
          return null;
        }
      })();

      if (!text) {
        hideTicker();
        setStatus('NEWS: RSS取得失敗（CORS/Proxy設定を確認）');
        return;
      }

      tickerContentEl.textContent = text;
      tickerContent2El.textContent = text;
      showTicker();

      // フォントやレイアウト確定後に速度計算（OBS/CEFは遅れることがある）
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));
      if (document.fonts && document.fonts.ready) {
        try {
          await Promise.race([document.fonts.ready, sleep(1200)]);
        } catch {
          // ignore
        }
      }

      startTickerAnimation();
      setTimeout(startTickerAnimation, 1500);
      setTimeout(startTickerAnimation, 3500);

      window.addEventListener('resize', () => {
        if (tickerEl.style.display !== 'none') startTickerAnimation();
      });
    };

    initTicker();

    // ---- Quake
    const hideQuake = () => { if (quakeEl) quakeEl.classList.remove('is-show'); };
    const showQuake = () => { if (quakeEl) quakeEl.classList.add('is-show'); };

    let lastEventSig = null;
    let showToken = 0;

    const makeEventSig = (ev) => {
      const e = ev || {};
      const eq = e.earthquake || {};
      const hypo = (eq.hypocenter || {});
      return [
        e.time, e.code, e.id,
        e.issue?.time, e.issue?.source,
        eq.time, eq.maxScale,
        hypo.name, hypo.depth, hypo.magnitude
      ].map((x) => String(x ?? '')).join('|');
    };

    const buildPagesFromEvent = (ev) => {
      const eq = ev.earthquake || {};
      const maxScale = toInt(eq.maxScale, 0);

      if (maxScale < cfg.quakeMinScale) return { pages: [], maxScale };

      const selected = new Set(cfg.quakePrefs || []);
      const points = Array.isArray(ev.points) ? ev.points : [];
      const filtered = points
        .filter((p) => p && typeof p === 'object')
        .filter((p) => selected.size === 0 || selected.has(p.pref))
        .filter((p) => toInt(p.scale, 0) >= cfg.quakeMinScale);

      if (filtered.length === 0) return { pages: [], maxScale };

      const byScale = new Map();
      for (const p of filtered) {
        const sc = toInt(p.scale, 0);
        if (!byScale.has(sc)) byScale.set(sc, []);
        byScale.get(sc).push(p);
      }

      const scales = Array.from(byScale.keys()).sort((a, b) => b - a);
      const pages = [];

      for (const sc of scales) {
        const list = byScale.get(sc);

        list.sort((a, b) => {
          const ap = String(a.pref ?? '');
          const bp = String(b.pref ?? '');
          if (ap !== bp) return ap.localeCompare(bp, 'ja');
          return String(a.addr ?? '').localeCompare(String(b.addr ?? ''), 'ja');
        });

        for (let i = 0; i < list.length; i += cfg.quakePerPage) {
          const chunk = list.slice(i, i + cfg.quakePerPage);
          const lines = chunk.map((p) => {
            const pref = String(p.pref ?? '');
            const addr = String(p.addr ?? '');
            return addr ? `${pref} ${addr}` : pref;
          });

          pages.push({
            headline: `震度 ${scaleLabel(sc)}`,
            detail: lines.join('\n')
          });
        }
      }

      return { pages, maxScale };
    };

    const playSoundForScale = async (maxScale) => {
      const s2 = cfg.sound2Min;
      const s1 = cfg.sound1Min;

      if (s2 > 0 && maxScale >= s2) {
        await playMp3Alert(2, cfg.sound2Repeat);
        return;
      }
      if (s1 > 0 && maxScale >= s1) {
        await playMp3Alert(1, cfg.sound1Repeat);
      }
    };

    const showPages = async (pages, maxScale) => {
      showToken += 1;
      const token = showToken;

      if (!quakeHeadlineEl || !quakeDetailEl) return;

      showQuake();
      await playSoundForScale(maxScale);

      const sec = clamp(cfg.quakePageSec, 1, 60);
      let idx = 0;

      const step = () => {
        if (token !== showToken) return;

        const p = pages[idx];
        if (!p) {
          hideQuake();
          return;
        }

        quakeHeadlineEl.textContent = p.headline;
        quakeDetailEl.textContent = p.detail;

        idx += 1;
        setTimeout(step, sec * 1000);
      };

      step();
    };

    const fetchLatestQuake = async () => {
      const base = cfg.quakeSandbox ? SANDBOX_QUAKE_API : PROD_QUAKE_API;
      const url = `${base}/history?codes=551&limit=1`;
      const finalUrl = applyProxy(url, cfg.quakeProxy);

      const res = await fetch(finalUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`quake HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return null;

      return data[0];
    };

    const pollQuake = async () => {
      if (!cfg.quakeOn) {
        hideQuake();
        setStatus('quake: off');
        return;
      }

      try {
        const ev = await fetchLatestQuake();
        if (!ev) {
          setStatus('quake: empty');
          return;
        }

        const sig = makeEventSig(ev);
        if (sig === lastEventSig) {
          setStatus('quake: no change');
          return;
        }
        lastEventSig = sig;

        const { pages, maxScale } = buildPagesFromEvent(ev);
        if (pages.length === 0) {
          hideQuake();
          setStatus(`quake: ignored (maxScale=${maxScale})`);
          return;
        }

        setStatus(`quake: show pages=${pages.length} maxScale=${maxScale}`);
        showToken += 1; // cancel current
        await showPages(pages, maxScale);
      } catch (e) {
        hideQuake();
        setStatus(`quake: error ${String(e)}`);
      }
    };

    hideQuake();
    pollQuake();
    setInterval(pollQuake, clamp(cfg.quakePollSec, 10, 120) * 1000);
  };

  // =========================================================
  // Boot
  // =========================================================
  const page = document.body?.dataset?.page;
  if (page === 'settings') initSettings();
  if (page === 'overlay') initOverlay();
})();
