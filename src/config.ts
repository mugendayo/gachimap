// スプレッドシート書き戻し用の Google Apps Script Web App URL。
// セットアップ後に発行される .../exec の URL をここに入れる。
// 空のままだと「移動」はこの端末内だけの仮反映になり、
// スプレッドシートへの書き戻し・他端末との同期は行わない。
export const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxIU6LhlMacpXQ2A9PhA-CgJvgSv2qBLZmeGH9yzm7Vh5T7HhAq4AdVPXK9KdYVmT9UOg/exec'

/** 書き戻し連携が有効か */
export const isLinked = (): boolean => APPS_SCRIPT_URL.trim().length > 0

/** 移動情報の自動同期間隔（ミリ秒） */
export const OVERRIDES_POLL_MS = 60 * 1000
