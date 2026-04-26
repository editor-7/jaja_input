/**
 * 참조단가NNN 등 배치 카테고리에서 동일 품목(이름·규격·자재/인건) 중복 제거 — 가장 먼저 생성된 1건만 유지
 *
 * 사용 (server 폴더):
 *   node scripts/dedupeReferenceCategoryDuplicates.js --dry-run
 *   node scripts/dedupeReferenceCategoryDuplicates.js
 *   node scripts/dedupeReferenceCategoryDuplicates.js --category=참조단가002 --dry-run
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const config = require('../config/env');
const Product = require('../models/Product');

function parseArgValue(flag, def) {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (!hit) return def;
  return String(hit.slice(flag.length + 1)).trim() || def;
}

/** 자재/인건 구분 — SKU 우선, 없으면 품명 접미 */
function laborOrMaterial(p) {
  const sku = String(p.sku || '').trim().toUpperCase();
  if (/^GAS-J-/.test(sku)) return 'J';
  if (/^GAS-(IN|I)-/.test(sku)) return 'IN';
  const n = String(p.name || '');
  if (/\(인건\)\s*$/i.test(n)) return 'IN';
  if (/\(자재\)\s*$/i.test(n)) return 'J';
  return 'U';
}

function baseName(p) {
  return String(p.name || '')
    .replace(/\s*\(자재\)\s*$/i, '')
    .replace(/\s*\(인건\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeKey(p) {
  const spec = String(p.spec || '').replace(/\s+/g, '').trim();
  return `${laborOrMaterial(p)}\t${baseName(p)}\t${spec}`;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const category = parseArgValue('--category', '참조단가001');
  if (!category) {
    console.error('사용법: node scripts/dedupeReferenceCategoryDuplicates.js [--category=참조단가001] [--dry-run]');
    process.exit(1);
  }

  await mongoose.connect(config.MONGODB_URI);
  try {
    const list = await Product.find({ category }).lean();
    const groups = new Map();
    for (const p of list) {
      const k = dedupeKey(p);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(p);
    }

    let deleteCount = 0;
    const samples = [];

    for (const [, arr] of groups) {
      if (arr.length < 2) continue;
      arr.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (ta !== tb) return ta - tb;
        return String(a._id).localeCompare(String(b._id));
      });
      const keep = arr[0];
      const remove = arr.slice(1);
      for (const d of remove) {
        samples.push({ _id: d._id, sku: d.sku, name: d.name, keepId: keep._id });
        if (!dryRun) await Product.deleteOne({ _id: d._id });
        deleteCount += 1;
      }
    }

    console.log('category:', category);
    console.log('대상 건수:', list.length);
    console.log(dryRun ? '[DRY-RUN]' : '[APPLIED]', '삭제(중복) 건수:', deleteCount);
    if (samples.length > 0) {
      console.log('예시(최대 15건):');
      samples.slice(0, 15).forEach((s) => {
        console.log('- remove', String(s._id), s.sku, '|', s.name, '| 유지:', String(s.keepId));
      });
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((e) => {
  console.error('오류:', e.message);
  process.exit(1);
});
