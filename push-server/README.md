# Chiang Mai 2026 Push Server

這個資料夾不是 GitHub Pages 前端的一部分；它是 Web Push 後端。

## 功能
- 儲存 Richard / Angel / 管理者的 Web Push 訂閱
- 依泰國時間對 3 堂空大課程送出 30 / 15 / 5 分鐘前提醒
- 管理者訂閱會收到兩人的課程提醒
- 支援 `/api/tick`，可被外部 cron 每分鐘呼叫

## 本機啟動
1. `npm install`
2. `npm run generate-vapid`
3. 把產生的 public/private key 放進環境變數
4. 設定 `FRONTEND_ORIGIN` 為 GitHub Pages 網址
5. `npm start`

## 部署
可放在能長期執行 Node.js 的服務（例如 Render / Railway / VPS 等）。
若平台會休眠，請用外部排程每分鐘呼叫 `POST /api/tick`。

> GitHub Pages 本身不能負責背景排程與送 Push，因此前端與 Push Server 必須分開。
