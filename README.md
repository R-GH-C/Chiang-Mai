# 清邁 2026｜GitHub Pages / PWA 發布包

## GitHub Pages 需要上傳
- `index.html`
- `manifest.webmanifest`
- `service-worker.js`
- `icons/`

使用者仍然只需要開 GitHub Pages 首頁網址，例如：
`https://YOUR_USERNAME.github.io/YOUR_REPO/`

## 本機開發
直接雙擊 `index.html` 可以測試：
- PIN / Richard / Angel / 管理者
- Angel 猴子主題
- 行程、天氣快取、匯率
- 課程卡、倒數、30/15/5 分鐘「頁面開著時」提醒
- `.ics` 加入手機行事曆

本機 `file://` 不會啟用：
- Service Worker
- PWA 安裝
- Web Push

這是瀏覽器安全限制，不是程式錯誤。

## Web Push
`push-server/` 是可獨立部署的 Node.js 範本。
部署後，用管理者登入網站，到：
「更多 → App 與背景提醒 → Push Server 設定」
填入 Push Server HTTPS 網址。

Richard / Angel 各自在自己的手機登入後，按「啟用背景課程提醒」即可。

## 課程時間（泰國時間）
- Richard 2026/09/23 18:00–20:00｜理財規劃與實務
- Richard 2026/09/24 18:00–20:00｜活用數據分析的應用實務
- Angel 2026/09/23 13:00–14:40｜投資理財的資訊工具與運用實務

每堂課：30 / 15 / 5 分鐘前提醒。

## 流量
Angel 猴子主題使用 Emoji + CSS，不下載外部圖檔。
PWA 安裝後，多數靜態內容由 Service Worker 快取。
Web Push 單則通知資料很小；主要流量仍會來自你手動更新的天氣 / 匯率 API。
