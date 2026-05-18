// スプレッドシートの各「部屋タブ」から備品を取り込み、public/items.json を生成する。
// マップ（floorData）に存在する部屋ぶんだけ取り込む方針。
// xlsx を丸ごと取得して解析するので、タブ名/gid の表記差に影響されない。
// 使い方: node scripts/importItems.mjs
// スプレッドシートに部屋/備品を足したら再実行すれば items.json が更新される。

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { unzipSync } from 'fflate'

const SPREADSHEET_ID = '1-Vbh4A2LPBDxn2m8xrQTrSEJzKqv36sDZ4_-pjtJ0mw'

// スプレッドシートのタブ名 → マップ上の roomId（floorData の rect id）。
// ここに無いタブ（多目的教室・2年A/B組 等）は「マップに無い」ので取り込まない。
const TAB_TO_ROOM = {
  // 1F
  '1F_休憩室': 'r1-03',
  '1F_相談室1': 'r1-07',
  '1F_相談室2倉庫': 'r1-08',
  '1F_保健室': 'r1-09',
  '1F_校長室': 'r1-16',
  '1F_会議室': 'r1-17',
  // 2F
  '2F_被服室': 'r2-03',
  '2F_教室6年': 'r2-07',
  '2F_男子更衣室': 'r2-10',
  '2F_調理室': 'r2-12',
  '2F_生徒会室': 'r2-14',
  '2F_図書室': 'r2-15',
  '2F_女子更衣室': 'r2-16',
  // 3F
  '3F_理科室': 'r3-04',
  '3F_理科室左1年A組': 'r3-08',
  '3F_階段横仲良し教室': 'r3-11',
  '3F_視聴覚室横仲良し教室': 'r3-12',
  '3F_視聴覚室': 'r3-13',
  '3F_コンピュータ室': 'r3-16',
  '3F_美術室': 'r3-17',
  // 4F
  '4F_音楽準備室1': 'r4-07',
  '4F_音楽準備室2': 'r4-07',
  '4F_音楽室1': 'r4-08',
  '4F_音楽室2': 'r4-09',
  // 屋外・他
  屋上: 'r5-01',
}

const roomNameOf = (tab) => tab.replace(/^[1-4]F_/, '')
const floorOf = (roomId) => Number(roomId[1])

function decodeXml(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&')
}

const td = new TextDecoder('utf-8')

function parseSharedStrings(xml) {
  if (!xml) return []
  const out = []
  const siRe = /<si>([\s\S]*?)<\/si>/g
  let m
  while ((m = siRe.exec(xml))) {
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g
    let t
    let buf = ''
    while ((t = tRe.exec(m[1]))) buf += decodeXml(t[1])
    out.push(buf)
  }
  return out
}

function colOf(ref) {
  const mm = ref.match(/^[A-Z]+/)
  return mm ? mm[0] : ''
}
function rowOf(ref) {
  const mm = ref.match(/\d+$/)
  return mm ? Number(mm[0]) : 0
}

// シートXML → { rowNum: {A: val, B: val} }
function parseSheet(xml, shared) {
  const rows = new Map()
  const cRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g
  let c
  while ((c = cRe.exec(xml))) {
    const attrs = c[1]
    const inner = c[2] ?? ''
    const refM = attrs.match(/r="([A-Z]+\d+)"/)
    if (!refM) continue
    const ref = refM[1]
    const col = colOf(ref)
    if (col !== 'A' && col !== 'B') continue
    const tM = attrs.match(/t="([^"]+)"/)
    const type = tM ? tM[1] : 'n'
    let val = ''
    if (type === 'inlineStr') {
      const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g
      let t
      while ((t = tRe.exec(inner))) val += decodeXml(t[1])
    } else {
      const vM = inner.match(/<v>([\s\S]*?)<\/v>/)
      const raw = vM ? vM[1] : ''
      if (type === 's') val = shared[Number(raw)] ?? ''
      else val = decodeXml(raw)
    }
    const rn = rowOf(ref)
    if (!rows.has(rn)) rows.set(rn, {})
    rows.get(rn)[col] = val
  }
  return rows
}

async function main() {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=xlsx`
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`xlsx download HTTP ${res.status}`)
  const buf = new Uint8Array(await res.arrayBuffer())
  const files = unzipSync(buf)

  const get = (p) => (files[p] ? td.decode(files[p]) : '')

  // rId → シートXMLパス
  const relsXml = get('xl/_rels/workbook.xml.rels')
  const relMap = {}
  for (const r of relsXml.matchAll(
    /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g
  )) {
    let target = r[2].replace(/^\/?xl\//, '').replace(/^\//, '')
    relMap[r[1]] = `xl/${target}`
  }

  // タブ名 → シートXMLパス
  const wbXml = get('xl/workbook.xml')
  const nameToPath = {}
  for (const s of wbXml.matchAll(/<sheet\b[^>]*\/?>/g)) {
    const tag = s[0]
    const nm = tag.match(/name="([^"]*)"/)
    const rid = tag.match(/r:id="([^"]*)"/)
    if (nm && rid && relMap[rid[1]]) {
      nameToPath[decodeXml(nm[1])] = relMap[rid[1]]
    }
  }

  const shared = parseSharedStrings(get('xl/sharedStrings.xml'))

  const items = []
  const summary = []
  const missing = []
  const perRoom = new Map() // roomId → 通し番号（複数タブが同一部屋に入る場合の一意ID用）
  for (const [tab, roomId] of Object.entries(TAB_TO_ROOM)) {
    const path = nameToPath[tab]
    if (!path) {
      missing.push(tab)
      summary.push(`${tab} -> (タブが見つからない)`)
      continue
    }
    const rowsMap = parseSheet(get(path), shared)
    const rowNums = [...rowsMap.keys()].sort((a, b) => a - b)
    let added = 0
    for (const rn of rowNums) {
      const cell = rowsMap.get(rn)
      const name = (cell.A ?? '').trim()
      const qty = (cell.B ?? '').trim()
      if (!name) continue
      if (/^https?:\/\//i.test(name) || name.includes('drive.google.com')) continue
      const seq = (perRoom.get(roomId) ?? 0) + 1
      perRoom.set(roomId, seq)
      added++
      items.push({
        id: `${roomId}-${String(seq).padStart(2, '0')}`,
        name,
        reading: name, // 読みはシートに無いため名称で代用（検索は正規化で吸収）
        roomId,
        floor: floorOf(roomId),
        category: roomNameOf(tab),
        note: qty ? `数量 ${qty}` : '',
      })
    }
    summary.push(`${tab} -> ${roomId} : ${added}件`)
  }

  const outPath = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'public',
    'items.json'
  )
  await writeFile(outPath, JSON.stringify(items, null, 2) + '\n', 'utf8')
  console.log(summary.join('\n'))
  if (missing.length) console.log('未検出タブ:', missing.join(', '))
  console.log(`---- 合計 ${items.length} 件を public/items.json に書き出し ----`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
