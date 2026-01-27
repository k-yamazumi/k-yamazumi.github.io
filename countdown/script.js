(function () {
  var body = document.body;

  // 追加: クエリパラメータ取得 =====
  var params = new URLSearchParams(window.location.search); // [web:33][web:38]
  var dateParam = params.get('date'); // 例: 2026-02-10
  var colorParam = params.get('color'); // 例: red

  // 背景色決定ロジック
  // 1. URLの color パラメータ
  // 2. data-bg-color
  // 3. デフォルト white
  var bgColor =
    (colorParam && colorParam.trim()) ||
    body.getAttribute('data-bg-color') ||
    'white';

  // 期限決定ロジック
  var deadlineStrFromAttr = body.getAttribute('data-deadline');
  var deadline;

  if (dateParam && dateParam.trim()) {
    // date=YYYY-MM-DD を想定（余計な空白は削る）
    var d = dateParam.trim();

    // 「YYYY-MM-DD」形式だけを許容する簡易バリデーション
    var m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      // 日本時間0時を締切とする
      deadline = new Date(d + 'T00:00:00+09:00').getTime();
    } else {
      console.error('date パラメータの形式が不正です (YYYY-MM-DD 想定):', d);
    }
  }

  if (!deadline && deadlineStrFromAttr) {
    var tmp = new Date(deadlineStrFromAttr).getTime();
    if (!isNaN(tmp)) {
      deadline = tmp;
    } else {
      console.error('data-deadline の形式が不正です');
    }
  }

  if (!deadline) {
    console.error('締切時刻が決定できませんでした (date パラメータ or data-deadline が必要)');
    return;
  }

  //  タイトル自動設定（date 指定時のみ）
  if (dateParam) {
    var titleEl = document.querySelector('.title');
    if (titleEl) {
      var dForTitle = new Date(deadline);
      var y = dForTitle.getFullYear();
      var M = dForTitle.getMonth() + 1;
      var day = dForTitle.getDate();
      titleEl.textContent = y + '年' + M + '月' + day + '日まで';
    }
    var descEl = document.querySelector('.description');
    if (descEl) descEl.style.display = 'none';
  }

  // 背景テーマを適用
  setTheme(bgColor);

  var countdownEl = document.getElementById('countdown');
  var finishedEl = document.getElementById('finished-message');

  var daysEl = document.getElementById('days');
  var hoursEl = document.getElementById('hours');
  var minutesEl = document.getElementById('minutes');
  var secondsEl = document.getElementById('seconds');

  // 超過時間表示用要素を生成
  var overtimeEl = document.createElement('div');
  overtimeEl.className = 'overtime';
  overtimeEl.style.display = 'none';
  countdownEl.insertAdjacentElement('afterend', overtimeEl);

  var timerId = null;
  var overtimeTimerId = null;

  function update() {
    var now = Date.now();
    var diff = deadline - now;

    if (diff <= 0) {
      // 期限を過ぎたらカウントダウンを0固定で表示
      daysEl.textContent = 0;
      hoursEl.textContent = '00';
      minutesEl.textContent = '00';
      secondsEl.textContent = '00';

      clearInterval(timerId);
      startOvertime(now);
      return;
    }

    var totalSeconds = Math.floor(diff / 1000);
    var d = Math.floor(totalSeconds / (60 * 60 * 24));
    var h = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
    var m = Math.floor((totalSeconds % (60 * 60)) / 60);
    var s = totalSeconds % 60;

    daysEl.textContent = d;
    hoursEl.textContent = ('0' + h).slice(-2);
    minutesEl.textContent = ('0' + m).slice(-2);
    secondsEl.textContent = ('0' + s).slice(-2);
  }

  // 初期表示
  update();
  // 1秒ごとに更新
  timerId = setInterval(update, 1000);

  function setTheme(bg) {
    var allowed = ['red', 'green', 'blue', 'yellow', 'white', 'black'];
    if (allowed.indexOf(bg) === -1) bg = 'white';
    document.documentElement.setAttribute('data-theme-bg', bg);
  }

  // 超過時間カウントアップ
  function startOvertime(nowAtExpire) {
    // 期限を過ぎた時点の now を使う（少しのズレは気にしない）
    var base = nowAtExpire || Date.now();
    overtimeEl.style.display = 'block';

    function renderOvertime() {
      var now = Date.now();
      var diffMs = now - deadline;
      if (diffMs < 0) diffMs = 0;

      var totalSeconds = Math.floor(diffMs / 1000);

      var years = Math.floor(totalSeconds / (60 * 60 * 24 * 365));
      totalSeconds %= 60 * 60 * 24 * 365;

      var months = Math.floor(totalSeconds / (60 * 60 * 24 * 30));
      totalSeconds %= 60 * 60 * 24 * 30;

      var days = Math.floor(totalSeconds / (60 * 60 * 24));
      totalSeconds %= 60 * 60 * 24;

      var hours = Math.floor(totalSeconds / (60 * 60));
      totalSeconds %= 60 * 60;

      var minutes = Math.floor(totalSeconds / 60);
      var seconds = totalSeconds % 60;

      var parts = [];

      if (years > 0) parts.push(years + '年');
      if (months > 0 || years > 0) parts.push(months + 'か月');
      if (days > 0 || months > 0 || years > 0) parts.push(days + '日');
      if (hours > 0 || days > 0 || months > 0 || years > 0) parts.push(hours + '時間');
      if (minutes > 0 || hours > 0 || days > 0 || months > 0 || years > 0) {
        parts.push(('0' + minutes).slice(-2) + '分');
      } else {
        parts.push(minutes + '分');
      }
      parts.push(('0' + seconds).slice(-2) + '秒');

      overtimeEl.textContent = '超過時間：' + parts.join('');
    }

    renderOvertime();
    overtimeTimerId = setInterval(renderOvertime, 1000);
  }
})();
