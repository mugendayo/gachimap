/**
 * gachimap 備品カタログ＆「移動」用 Google Apps Script（物理移動方式）
 *
 *  - doGet : 部屋別タブを直接読み、現在の備品カタログ(JSON)を返す
 *            → スプレッドシートを手編集しても約1分でサイトに反映
 *  - doPost: 移動。元タブから該当行を削除し、移動先タブへ追記。
 *            移動先タブが無ければ自動作成。全移動を追記専用「移動ログ」に残す。
 *
 * 行にIDは無いので品名（必要なら数量も）で照合して移動する。
 * セットアップ/再デプロイは docs/appsscript/SETUP.md 参照。
 */

var SPREADSHEET_ID = '1-Vbh4A2LPBDxn2m8xrQTrSEJzKqv36sDZ4_-pjtJ0mw'
var LOG_SHEET = '移動ログ'
var REG_SHEET = '_移動先登録' // 自動作成したタブの登録（tab, roomId, floor）
var CACHE_KEY = 'catalog_v2'
var CACHE_SEC = 30

// 既知の部屋タブ → roomId（scripts/importItems.mjs と一致）
var ROOM_TABS = [
  ['1F_休憩室', 'r1-03'],
  ['1F_相談室1', 'r1-07'],
  ['1F_相談室2/倉庫', 'r1-08'],
  ['1F_保健室', 'r1-09'],
  ['1F_校長室', 'r1-16'],
  ['1F_会議室', 'r1-17'],
  ['2F_被服室', 'r2-03'],
  ['2F_教室6年', 'r2-07'],
  ['2F_男子更衣室', 'r2-10'],
  ['2F_調理室', 'r2-12'],
  ['2F_生徒会室', 'r2-14'],
  ['2F_図書室', 'r2-15'],
  ['2F_女子更衣室', 'r2-16'],
  ['3F_理科室', 'r3-04'],
  ['3F_理科室左1年A組', 'r3-08'],
  ['3F_階段横仲良し教室', 'r3-11'],
  ['3F_視聴覚室横仲良し教室', 'r3-12'],
  ['3F_視聴覚室', 'r3-13'],
  ['3F_コンピュータ室', 'r3-16'],
  ['3F_美術室', 'r3-17'],
  ['4F_音楽準備室1', 'r4-07'],
  ['4F_音楽準備室2', 'r4-07'],
  ['4F_音楽室1', 'r4-08'],
  ['4F_音楽室2', 'r4-09'],
  ['屋上', 'r5-01'],
]

function ss_() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID)
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet()
  }
}

// シート名の表記ゆれ（前後空白・全角半角）を吸収して照合する
function norm_(s) {
  s = String(s == null ? '' : s)
  try {
    s = s.normalize('NFKC')
  } catch (e) {}
  return s.replace(/\s+/g, '').trim()
}

var _sheetIdx = null
function findSheet_(name) {
  var ss = ss_()
  var s = ss.getSheetByName(name)
  if (s) return s
  if (!_sheetIdx) {
    _sheetIdx = {}
    ss.getSheets().forEach(function (sh) {
      _sheetIdx[norm_(sh.getName())] = sh
    })
  }
  return _sheetIdx[norm_(name)] || null
}

function floorOf_(roomId) {
  var n = Number(String(roomId).charAt(1))
  return n >= 1 && n <= 9 ? n : 1
}

function roomNameOf_(tab) {
  return String(tab).replace(/^[1-4]F_/, '')
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  )
}

/** roomId → 既定タブ名（最初に一致したもの） */
function canonicalTab_(roomId) {
  for (var i = 0; i < ROOM_TABS.length; i++) {
    if (ROOM_TABS[i][1] === roomId) return ROOM_TABS[i][0]
  }
  return null
}

/** 自動作成タブの登録シート */
function regSheet_() {
  var ss = ss_()
  var sh = ss.getSheetByName(REG_SHEET)
  if (!sh) {
    sh = ss.insertSheet(REG_SHEET)
    sh.appendRow(['tab', 'roomId', 'floor'])
  }
  return sh
}

/** 登録済み（自動作成）タブ一覧 [[tab,roomId,floor], ...] */
function registeredTabs_() {
  var sh = regSheet_()
  var last = sh.getLastRow()
  if (last < 2) return []
  return sh.getRange(2, 1, last - 1, 3).getValues().map(function (r) {
    return [String(r[0]), String(r[1]), Number(r[2]) || floorOf_(r[1])]
  })
}

/** roomId+label+floor から移動先タブを決め、無ければ作成して登録 */
function resolveDestTab_(roomId, label, floor) {
  var c = canonicalTab_(roomId)
  if (c) return c
  var reg = registeredTabs_()
  for (var i = 0; i < reg.length; i++) {
    if (reg[i][1] === roomId) return reg[i][0]
  }
  // 自動作成：人が読めるタブ名。label衝突時は roomId を付す
  var base = (floor >= 1 && floor <= 4 ? floor + 'F_' : '') + (label || roomId)
  var ss = ss_()
  var name = base
  if (findSheet_(base)) name = base + '(' + roomId + ')'
  if (!findSheet_(name)) {
    ss.insertSheet(name)
    _sheetIdx = null // 索引を作り直させる
  }
  regSheet_().appendRow([name, roomId, floor])
  return name
}

function isSkippableName_(name) {
  if (!name) return true
  if (/^https?:\/\//i.test(name)) return true
  if (name.indexOf('drive.google.com') !== -1) return true
  return false
}

/** すべての対象タブ [[tab,roomId,floor], ...]（既知＋自動作成） */
function allRoomTabs_() {
  var out = []
  var seen = {}
  ROOM_TABS.forEach(function (t) {
    out.push([t[0], t[1], floorOf_(t[1])])
    seen[t[0]] = true
  })
  registeredTabs_().forEach(function (t) {
    if (!seen[t[0]]) {
      out.push([t[0], t[1], t[2]])
      seen[t[0]] = true
    }
  })
  return out
}

/** 部屋別タブを読み、備品カタログを作る */
function buildCatalog_() {
  var ss = ss_()
  var tabs = allRoomTabs_()
  var perRoom = {}
  var items = []
  for (var t = 0; t < tabs.length; t++) {
    var tab = tabs[t][0]
    var roomId = tabs[t][1]
    var floor = tabs[t][2]
    var sh = findSheet_(tab)
    if (!sh) continue
    var last = sh.getLastRow()
    if (last < 1) continue
    var rows = sh.getRange(1, 1, last, 2).getValues()
    for (var i = 0; i < rows.length; i++) {
      var name = String(rows[i][0] == null ? '' : rows[i][0]).trim()
      var qty = String(rows[i][1] == null ? '' : rows[i][1]).trim()
      if (!name || isSkippableName_(name)) continue
      var seq = (perRoom[roomId] = (perRoom[roomId] || 0) + 1)
      items.push({
        id: roomId + '-' + ('0' + seq).slice(-2),
        name: name,
        reading: name,
        roomId: roomId,
        floor: floor,
        category: roomNameOf_(tab),
        note: qty ? '数量 ' + qty : '',
        tab: tab,
      })
    }
  }
  return items
}

function doGet(e) {
  var cache = CacheService.getScriptCache()
  var hit = cache.get(CACHE_KEY)
  if (hit) {
    return ContentService.createTextOutput(hit).setMimeType(
      ContentService.MimeType.JSON
    )
  }
  var items = buildCatalog_()
  var body = JSON.stringify({ ok: true, items: items })
  cache.put(CACHE_KEY, body, CACHE_SEC)
  return ContentService.createTextOutput(body).setMimeType(
    ContentService.MimeType.JSON
  )
}

function logSheet_() {
  var ss = ss_()
  var sh = ss.getSheetByName(LOG_SHEET)
  if (!sh) {
    sh = ss.insertSheet(LOG_SHEET)
    sh.appendRow(['日時', '品名', '数量メモ', '元タブ', '移動先タブ', 'roomId'])
  }
  return sh
}

/** tabから name(+note一致を優先) の行を1件削除。戻り値: 見つかったか */
function deleteRowByName_(tab, name, note) {
  var sh = findSheet_(tab)
  if (!sh) return false
  var last = sh.getLastRow()
  if (last < 1) return false
  var rows = sh.getRange(1, 1, last, 2).getValues()
  var want = note ? String(note).replace(/^数量\s*/, '').trim() : ''
  var fallback = -1
  for (var i = 0; i < rows.length; i++) {
    var nm = String(rows[i][0] == null ? '' : rows[i][0]).trim()
    if (nm !== name) continue
    if (fallback === -1) fallback = i + 1
    var q = String(rows[i][1] == null ? '' : rows[i][1]).trim()
    if (want && q === want) {
      sh.deleteRow(i + 1)
      return true
    }
  }
  if (fallback !== -1) {
    sh.deleteRow(fallback)
    return true
  }
  return false
}

function doPost(e) {
  try {
    var b = JSON.parse((e && e.postData && e.postData.contents) || '{}')
    var name = String(b.name || '').trim()
    var toRoomId = String(b.toRoomId || '').trim()
    if (!name || !toRoomId) {
      return jsonOut_({ ok: false, error: 'name/toRoomId required' })
    }
    var note = String(b.note || '')
    var qtyOnly = note.replace(/^数量\s*/, '').trim()
    var fromTab = String(b.fromTab || '').trim()

    // 1) 元タブから削除（指定タブ→ダメなら全タブ走査）
    var removed = false
    if (fromTab) removed = deleteRowByName_(fromTab, name, note)
    if (!removed) {
      var tabs = allRoomTabs_()
      for (var i = 0; i < tabs.length && !removed; i++) {
        removed = deleteRowByName_(tabs[i][0], name, note)
        if (removed) fromTab = tabs[i][0]
      }
    }

    // 2) 移動先タブへ追記（無ければ自動作成）
    var destTab = resolveDestTab_(
      toRoomId,
      String(b.toRoomLabel || ''),
      Number(b.toFloor) || floorOf_(toRoomId)
    )
    var ds = findSheet_(destTab)
    if (!ds) ds = ss_().insertSheet(destTab)
    ds.appendRow([name, qtyOnly])

    // 3) 追記専用ログ
    logSheet_().appendRow([
      new Date(),
      name,
      qtyOnly,
      fromTab || '(不明)',
      destTab,
      toRoomId,
    ])

    CacheService.getScriptCache().remove(CACHE_KEY)
    return jsonOut_({ ok: true, fromTab: fromTab, toTab: destTab })
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) })
  }
}
