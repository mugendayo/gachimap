/**
 * gachimap 備品「移動」書き戻し用 Google Apps Script
 *
 * 役割:
 *  - doPost: キオスク画面から送られた移動情報をシート「移動記録」に保存（id単位で上書き）
 *  - doGet : 現在の移動状況を {id: 現在の部屋ID} のJSONで返す（サイトが約1分ごとに取得）
 *
 * 元の部屋別タブは一切変更しない（原本保全）。移動は「移動記録」タブだけに溜まる。
 *
 * セットアップは docs/appsscript/SETUP.md を参照。
 */

// 対象スプレッドシートのID（URLの /d/ と /edit の間）。
// これで開くので、オーナーでなく「編集者」権限でも、
// またコンテナ非依存の独立スクリプトでも動く。
var SPREADSHEET_ID = '1-Vbh4A2LPBDxn2m8xrQTrSEJzKqv36sDZ4_-pjtJ0mw'
var SHEET_NAME = '移動記録'
var HEADERS = ['id', 'name', 'from', 'fromLabel', 'to', 'toLabel', 'updatedAt']

function ss_() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID)
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet()
  }
}

function getSheet_() {
  var ss = ss_()
  var sh = ss.getSheetByName(SHEET_NAME)
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME)
    sh.appendRow(HEADERS)
  }
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS)
  return sh
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  )
}

/** 移動記録を {id: to} のマップにして返す */
function readOverrides_() {
  var sh = getSheet_()
  var last = sh.getLastRow()
  var map = {}
  if (last < 2) return map
  var rows = sh.getRange(2, 1, last - 1, HEADERS.length).getValues()
  for (var i = 0; i < rows.length; i++) {
    var id = String(rows[i][0] || '').trim()
    var to = String(rows[i][4] || '').trim()
    if (id && to) map[id] = to // 同じidが複数あっても後勝ち（upsertしているので基本1行）
  }
  return map
}

function doGet(e) {
  // action 問わず現在の移動状況を返す
  return jsonOut_({ ok: true, overrides: readOverrides_() })
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}')
    var id = String(body.id || '').trim()
    var to = String(body.to || '').trim()
    if (!id || !to) return jsonOut_({ ok: false, error: 'id/to required' })

    var sh = getSheet_()
    var last = sh.getLastRow()
    var rowIndex = -1
    if (last >= 2) {
      var ids = sh.getRange(2, 1, last - 1, 1).getValues()
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]).trim() === id) {
          rowIndex = i + 2
          break
        }
      }
    }
    var record = [
      id,
      String(body.name || ''),
      String(body.from || ''),
      String(body.fromLabel || ''),
      to,
      String(body.toLabel || ''),
      new Date(),
    ]
    if (rowIndex === -1) {
      sh.appendRow(record)
    } else {
      sh.getRange(rowIndex, 1, 1, HEADERS.length).setValues([record])
    }
    return jsonOut_({ ok: true })
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) })
  }
}
