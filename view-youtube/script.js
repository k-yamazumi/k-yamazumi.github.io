const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTL5oJh2n0ZbBBpuWqQWV6VvO8BfBEh7yKtLYpaf8Z-Ed_mhwoqBZJRG-jqusp1Y-o6zjIM9-4IJWY8/pub?gid=0&single=true&output=csv';

let player;
let isYoutubeApiReady = false;

console.log("[System] Loading YouTube API...");
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function onYouTubeIframeAPIReady() {
    console.log("[System] YouTube API Ready.");
    isYoutubeApiReady = true;
    
    player = new YT.Player('player', {
        height: '1080',
        width: '1920',
        playerVars: {
            'autoplay': 1,
            'controls': 0,
            'disablekb': 1,
            'fs': 0,
            'iv_load_policy': 3,
            'modestbranding': 1,
            'rel': 0,
            'mute': 0, // 音声を出す設定
            'origin': location.origin
        },
        events: {
            'onReady': () => console.log("[System] Player Initialized (Waiting for Click)"),
            'onStateChange': onPlayerStateChange,
            'onError': (e) => console.error("[Error] Player Error:", e.data)
        }
    });
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        console.log("[System] Loop: Replaying...");
        player.playVideo();
    }
}

// 画面クリックで開始する処理
document.getElementById('overlay').addEventListener('click', async function() {
    console.log("[Action] Screen Clicked. Starting...");
    this.style.display = 'none'; // オーバーレイを消す

    if (!isYoutubeApiReady) {
        console.error("[Error] YouTube API is not ready yet.");
        return;
    }

    await updateVideoFromSheet();
});

async function updateVideoFromSheet() {
    try {
        console.log("[Fetch] Fetching CSV...");
        const separator = SHEET_CSV_URL.includes('?') ? '&' : '?';
        const fetchUrl = `${SHEET_CSV_URL}${separator}t=${new Date().getTime()}`;
        
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const csvData = await response.text();
        const videoUrl = csvData.split('\n')[0].split(',')[0].replace(/"/g, '').trim();
        console.log("[Fetch] Target URL:", videoUrl);

        const videoId = extractVideoId(videoUrl);
        if (videoId && player) {
            console.log("[System] Loading Video ID:", videoId);
            player.loadVideoById({
                videoId: videoId,
                startSeconds: 0
            });
            player.unMute(); // 念のためミュート解除を明示
            player.setVolume(100); // 音量を最大に
        }
    } catch (error) {
        console.error("[Error] Update failed:", error);
    }
}

function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
