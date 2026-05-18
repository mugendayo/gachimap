// スプレッドシート連携用 Google Apps Script Web App URL（clasp でデプロイ済み）。
// doGet  : 部屋別タブを直接読んだ現在の備品カタログ(JSON)
// doPost : 移動（元タブから行削除→移動先タブへ追記、移動ログに記録）
export const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxIU6LhlMacpXQ2A9PhA-CgJvgSv2qBLZmeGH9yzm7Vh5T7HhAq4AdVPXK9KdYVmT9UOg/exec'

/** 連携が有効か */
export const isLinked = (): boolean => APPS_SCRIPT_URL.trim().length > 0

/** カタログ（スプレッドシート直読み）の再取得間隔（ミリ秒） */
export const CATALOG_POLL_MS = 45 * 1000
