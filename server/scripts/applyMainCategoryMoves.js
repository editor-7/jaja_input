/**
 * mainCategory 일괄 변경 (노출관 → 공통 등)
 *
 * 사용:
 *   node scripts/applyMainCategoryMoves.js moves.json
 *   node scripts/applyMainCategoryMoves.js moves.json --dry-run
 *   node scripts/applyMainCategoryMoves.js moves.json --also-local-json
 *   type moves.json | node scripts/applyMainCategoryMoves.js -
 *
 * moves.json 예시:
 * [
 *   { "sku": "GAS-J-0266", "mainCategory": "지하관PEM", "fromMainCategory": "노출관" },
 *   { "sku": "GAS-J-0275", "mainCategory": "지하관PEM", "fromMainCategory": "노출관" }
 * ]
 *
 * - fromMainCategory: 있으면 DB/JSON에 그 값일 때만 변경 (안전)
 * - --dry-run: Mongo·JSON 쓰기 없이 예정 건만 출력
 * - --also-local-json: server/data/상품등록리스트.json 의 동일 sku 도 mainCategory 갱신
 *
 * MongoDB: server/.env 의 MONGODB_URI 필요
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config/env');
const Product = require('../models/Product');

const MAIN_CATEGORIES = ['지하관PLP', '지하관PEM', '노출관', '공통'];

function normalizeMainCategory(v) {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  if (MAIN_CATEGORIES.includes(s)) return s;
  if (/^plp$/i.test(s.replace(/\s/g, ''))) return '지하관PLP';
  if (/^pe$/i.test(s.replace(/\s/g, ''))) return '지하관PEM';
  if (/^pem$/i.test(s.replace(/\s/g, ''))) return '지하관PEM';
  if (/노출관|노출/.test(s)) return '노출관';
  if (/공통/.test(s)) return '공통';
  return '';
}

function loadMoves(filePath) {
  const raw =
    filePath === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('JSON은 배열이어야 합니다. 예: [{ "sku": "...", "mainCategory": "공통" }]');
  return data;
}

async function applyMongo(moves, dryRun) {
  let matched = 0;
  let skipped = 0;
  let updated = 0;
  for (const row of moves) {
    const sku = String(row.sku || '').trim();
    const toCat = normalizeMainCategory(row.mainCategory);
    const fromCat = normalizeMainCategory(row.fromMainCategory || '');
    if (!sku || !toCat) {
      console.warn('  스킵(필수 누락):', JSON.stringify(row));
      skipped++;
      continue;
    }
    const p = await Product.findOne({ sku }).lean();
    if (!p) {
      console.warn('  SKU 없음:', sku);
      skipped++;
      continue;
    }
    const cur = (p.mainCategory || '').trim();
    if (fromCat && cur !== fromCat) {
      console.warn('  from 불일치 스킵:', sku, '현재=', cur || '(비움)', '기대=', fromCat);
      skipped++;
      continue;
    }
    if (cur === toCat) {
      skipped++;
      continue;
    }
    matched++;
    console.log(' ', dryRun ? '[DRY]' : '', sku, '|', p.name?.slice(0, 40), '→', toCat, '(이전:', cur || '-', ')');
    if (!dryRun) {
      await Product.updateOne({ _id: p._id }, { $set: { mainCategory: toCat } });
      updated++;
    }
  }
  return { matched, skipped, updated: dryRun ? 0 : updated };
}

function applyLocalJson(moves, dryRun) {
  const jsonPath = path.join(__dirname, '../data/상품등록리스트.json');
  if (!fs.existsSync(jsonPath)) {
    console.warn('상품등록리스트.json 없음:', jsonPath);
    return { jsonUpdated: 0 };
  }
  const list = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (!Array.isArray(list)) throw new Error('상품등록리스트.json 형식 오류');
  const bySku = new Map(moves.map((r) => [String(r.sku || '').trim(), r]).filter(([k]) => k));
  let jsonUpdated = 0;
  for (const p of list) {
    const sku = String(p.sku || '').trim();
    const row = bySku.get(sku);
    if (!row) continue;
    const toCat = normalizeMainCategory(row.mainCategory);
    const fromCat = normalizeMainCategory(row.fromMainCategory || '');
    if (!toCat) continue;
    const cur = (p.mainCategory || '').trim();
    if (fromCat && cur !== fromCat) continue;
    if (cur === toCat) continue;
    if (dryRun) {
      console.log(' [DRY][JSON]', sku, '→', toCat);
    } else {
      p.mainCategory = toCat;
      jsonUpdated++;
    }
  }
  if (!dryRun && jsonUpdated > 0) {
    fs.writeFileSync(jsonPath, JSON.stringify(list, null, 2) + '\n', 'utf8');
    console.log('상품등록리스트.json 반영:', jsonUpdated, '건');
  }
  return { jsonUpdated };
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--dry-run' && a !== '--also-local-json');
  const dryRun = process.argv.includes('--dry-run');
  const alsoJson = process.argv.includes('--also-local-json');
  const filePath = args[0];

  if (!filePath || (filePath !== '-' && !fs.existsSync(filePath))) {
    console.error(
      '사용법: node scripts/applyMainCategoryMoves.js moves.json [--dry-run] [--also-local-json]'
    );
    console.error('       type moves.json | node scripts/applyMainCategoryMoves.js - [--dry-run] ...');
    console.error('');
    console.error('moves.json 예:');
    console.error(
      JSON.stringify(
        [
          { sku: 'GAS-J-0266', mainCategory: '지하관PEM', fromMainCategory: '노출관' },
          { sku: 'GAS-J-0275', mainCategory: '지하관PEM', fromMainCategory: '노출관' },
        ],
        null,
        2
      )
    );
    process.exit(1);
  }

  let moves;
  try {
    moves = loadMoves(filePath);
  } catch (e) {
    console.error('JSON 읽기 실패:', e.message);
    process.exit(1);
  }

  console.log('이동 규칙', moves.length, '건', dryRun ? '(DRY-RUN)' : '');

  try {
    await mongoose.connect(config.MONGODB_URI);
    const r = await applyMongo(moves, dryRun);
    console.log('Mongo: 매칭', r.matched, '스킵', r.skipped, dryRun ? '(쓰기 안 함)' : '업데이트 ' + r.updated);
  } catch (e) {
    console.error('Mongo 오류:', e.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }

  if (alsoJson) {
    try {
      applyLocalJson(moves, dryRun);
    } catch (e) {
      console.error('JSON 오류:', e.message);
      process.exit(1);
    }
  }
}

main();
