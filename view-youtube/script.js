// 設定
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTL5oJh2n0ZbBBpuWqQWV6VvO8BfBEh7yKtLYpaf8Z-Ed_mhwoqBZJRG-jqusp1Y-o6zjIM9-4IJWY8/pub?gid=0&single=true&output=csv';

let player;

// 1. YouTube Iframe APIの読み込み
console.log("[System] Loading YouTube Iframe API...");
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 2. APIの準備ができたら呼ばれる
function onYouTubeIframeAPIReady() {
    console.log("[System] YouTube API Ready.");
    player = new YT.Player('player', {
        height: '1080',
        width: '1920',
        playerVars: {
            'autoplay': 1,
            'controls': 0,        // 操作バー非表示
            'disablekb': 1,       // キーボード無効
            'fs': 0,              // 全画面ボタン非表示
            'iv_load_policy': 3,  // アノテーション非表示
            'modestbranding': 1,  // ロゴ非表示
            'rel': 0,             // 関連動画非表示
            'mute': 1,            // 自動再生のため必須
            'origin': location.origin
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': (e) => console.error("[Error] Player Error:", e.data)
        }
    });
}

// 3. プレイヤーの準備ができたら実行
function onPlayerReady(event) {
    console.log("[System] Player Ready. Fetching CSV...");
    updateVideoFromSheet();
}

// 4. ループ処理
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        console.log("[System] Video ended. Replaying...");
        player.playVideo();
    }
}

// 5. スプレッドシートからURL取得・動画反映
async function updateVideoFromSheet() {
    try {
        console.log("[Fetch] Fetching CSV from Google Sheets...");
        
        // キャッシュ回避用のタイムスタンプ
        const separator = SHEET_CSV_URL.includes('?') ? '&' : '?';
        const fetchUrl = `${SHEET_CSV_URL}${separator}t=${new Date().getTime()}`;
        
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const csvData = await response.text();
        console.log("[Fetch] Successfully received CSV data.");

        // CSVの1行目・1列目からURLを抽出
        const videoUrl = csvData.split('\n')[0].split(',')[0].replace(/"/g, '').trim();
        console.log("[Fetch] Extracted URL:", videoUrl);

        const videoId = extractVideoId(videoUrl);
        if (videoId) {
            console.log("[System] Video ID found:", videoId, ". Starting playback.");
            player.loadVideoById({
                videoId: videoId,
                startSeconds: 0
            });
        } else {
            throw new Error(`Failed to extract Video ID from URL: ${videoUrl}`);
        }
    } catch (error) {
        console.error("[Error] Update failed:", error);
    }
}

// URLからIDを抜くユーティリティ
function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
