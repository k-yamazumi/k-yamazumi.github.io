const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTL5oJh2n0ZbBBpuWqQWV6VvO8BfBEh7yKtLYpaf8Z-Ed_mhwoqBZJRG-jqusp1Y-o6zjIM9-4IJWY8/pub?gid=0&single=true&output=csv';

let player;
let isYoutubeApiReady = false;

// 1. YouTube Iframe APIの読み込み
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function onYouTubeIframeAPIReady() {
    console.log("[System] YouTube API Ready.");
    isYoutubeApiReady = true;

    // 最初に無音でプレイヤーを作成しておく
    player = new YT.Player('player', {
        height: '1080',
        width: '1920',
        playerVars: {
            'autoplay': 1,
            'controls': 1,        // 広告スキップ等の操作のために一旦1にする（後でOBSで隠す）
            'disablekb': 1,
            'fs': 0,
            'iv_load_policy': 3,
            'modestbranding': 1,
            'rel': 0,
            'mute': 1,            // 読み込み時はミュート（ブラウザ制限回避のため）
            'origin': location.origin
        },
        events: {
            'onReady': () => console.log("[System] Player Initialized."),
            'onStateChange': onPlayerStateChange,
            'onError': (e) => console.error("[Error] Player Error Code:", e.data)
        }
    });
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        console.log("[System] Loop Replay.");
        player.playVideo();
    }
}

// 画面クリック時の処理
document.getElementById('overlay').addEventListener('click', async function() {
    console.log("[Action] Screen Clicked.");
    this.style.display = 'none'; // オーバーレイを隠す

    if (!isYoutubeApiReady || !player) {
        console.error("[Error] Player not ready.");
        return;
    }

    // 音声を出すための儀式
    player.unMute();
    player.setVolume(100);
    
    // スプレッドシートから最新の動画を読み込む
    await updateVideoFromSheet();
});

async function updateVideoFromSheet() {
    try {
        console.log("[Fetch] Getting URL from Sheet...");
        const separator = SHEET_CSV_URL.includes('?') ? '&' : '?';
        const fetchUrl = `${SHEET_CSV_URL}${separator}t=${new Date().getTime()}`;
        
        const response = await fetch(fetchUrl);
        const csvData = await response.text();
        const videoUrl = csvData.split('\n')[0].split(',')[0].replace(/"/g, '').trim();
        const videoId = extractVideoId(videoUrl);

        if (videoId) {
            console.log("[System] Playing Video ID:", videoId);
            // 動画を読み込み、再生を開始
            player.loadVideoById({
                videoId: videoId,
                startSeconds: 0
            });
            
            // 読み込み後に再度ミュート解除を念押し
            setTimeout(() => {
                player.unMute();
                player.setVolume(100);
                player.playVideo();
                console.log("[System] Audio should be active now.");
            }, 1000);

        } else {
            console.error("[Error] No valid URL found in A1 cell.");
        }
    } catch (error) {
        console.error("[Error] Fetch failed:", error);
    }
}

function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
