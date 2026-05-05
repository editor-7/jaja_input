/**
 * 엑셀(품명/규격/단가) 기준으로 카테고리 등재
 *
 * 기본 동작:
 * 1) 품명+규격 매칭으로 기존 상품 category 업데이트
 * 2) 매칭 실패 항목은 신규 상품 생성
 *
 * 옵션:
 * - --target-category="카테고리명": 대상 category 지정 (기본: 참조단가)
 * - --insert-unique-only: 대상 category에는 품명/규격/자재-인건 키 기준 1건만 추가(중복 방지)
 *   * 이 모드에서는 기존 상품 category를 업데이트하지 않음(신규 추가만 수행)
 * - --allow-update-existing: 기존 자재/인건 상품의 category를 대상값으로 이동 허용 (기본 비활성)
 * - --reset-target: 대상 category 기존 데이터를 먼저 비우고 적재(교체 적재)
 *
 * 지원 형식(추가):
 * - 1행 헤더가 「호표」「합계금액」(또는 2열에 '합계' 포함)인 통합갑지·합계만 시트:
 *   각 행의 호표 문구를 품명으로 하고 합계금액을 (자재) 단가 1건으로만 등록(인건 행 없음).
 *
 * 사용 예:
 *   node scripts/importEstimateCategoryFromExcel.js "e:/computer_home/001.xlsx" --dry-run
 *   node scripts/importEstimateCategoryFromExcel.js "e:/computer_home/001.xlsx"
 *   node scripts/importEstimateCategoryFromExcel.js "e:/computer_home/001.xlsx" --target-category="신규단가입력" --insert-unique-only
 *   node scripts/importEstimateCategoryFromExcel.js "e:/computer_home/001.xlsx" --target-category="참조단가" --reset-target
 */

const fs = require('fs');
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const config = require('../config/env');
const Product = require('../models/Product');

const DEFAULT_TARGET_CATEGORY = '참조단가';

function normalizeName(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function normalizeSpec(s) {
  return String(s || '').replace(/\s+/g, '').trim();
}

function toPrice(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/,/g, '').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function stripSuffix(name) {
  return String(name || '').replace(/\s*\((자재|인건)\)\s*$/, '').trim();
}

function stripSpecSuffix(nameBase, spec) {
  const n = normalizeName(nameBase);
  const rawSpec = String(spec || '').trim();
  if (!rawSpec) return n;
  const escaped = rawSpec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const removed = n.replace(new RegExp(`\\s*${escaped}\\s*$`, 'i'), '').trim();
  if (removed && removed !== n) return removed;
  // 규격 문자열 공백 차이(예: "D 90" vs "D90")를 허용한 보조 제거
  const compactSpec = normalizeSpec(rawSpec);
  if (!compactSpec) return n;
  const compactName = normalizeSpec(n);
  if (compactName.endsWith(compactSpec)) {
    const cutLen = compactName.length - compactSpec.length;
    if (cutLen > 0) {
      return n.slice(0, Math.max(0, n.length - rawSpec.length)).trim() || n;
    }
  }
  return n;
}

function pickHeaderIndex(headerRow, keyRegex, fallback) {
  const idx = headerRow.findIndex((c) => keyRegex.test(String(c || '').replace(/\s/g, '')));
  return idx >= 0 ? idx : fallback;
}

function normCell(c) {
  return String(c || '').trim().replace(/\s/g, '');
}

/** excelToProductList.js 와 동일: 정확 헤더 문자열 매칭 */
function findCol(headerRow, names) {
  if (!Array.isArray(headerRow)) return -1;
  for (const n of names) {
    const key = String(n).trim().replace(/\s/g, '');
    const idx = headerRow.findIndex((c) => normCell(c) === key);
    if (idx >= 0) return idx;
  }
  return -1;
}

function findColByRegex(headerRow, re) {
  if (!Array.isArray(headerRow)) return -1;
  return headerRow.findIndex((c) => re.test(normCell(c)));
}

/** 헤더가 0행(앱 다운로드)인지 1행(구형 참조단가)인지 등 자동 선택 */
function resolveHeaderAndColumns(rows) {
  let bestIdx = -1;
  let bestScore = -1;
  const maxScan = Math.min(5, rows.length);
  for (let h = 0; h < maxScan; h++) {
    const row = rows[h] || [];
    let s = 0;
    if (findCol(row, ['품명', '품목']) >= 0) s += 2
    if (findCol(row, ['규격']) >= 0) s += 1
    if (findCol(row, ['단위']) >= 0) s += 1
    if (findCol(row, ['자재비단가', '재료비단가']) >= 0 || findColByRegex(row, /자재비|재료비/) >= 0) s += 2
    if (findCol(row, ['인건비단가', '노무비단가']) >= 0 || findColByRegex(row, /인건비|노무비/) >= 0) s += 2
    if (s > bestScore) {
      bestScore = s
      bestIdx = h
    }
  }
  if (bestIdx < 0 || bestScore < 3) {
    const header = rows[1] || []
    return {
      header,
      dataStart: 3,
      iName: pickHeaderIndex(header, /품명|품목/, 0),
      iSpec: pickHeaderIndex(header, /규격/, 1),
      iUnit: pickHeaderIndex(header, /^단위$/, 2),
      iMat: 4,
      iLabor: 6,
    }
  }
  const header = rows[bestIdx] || []
  const iName = findCol(header, ['품명', '품목'])
  const iSpec = findCol(header, ['규격'])
  const iUnit = findCol(header, ['단위'])
  let iMat =
    findCol(header, ['자재비단가', '재료비단가', '재료비', '자재비']) >= 0
      ? findCol(header, ['자재비단가', '재료비단가', '재료비', '자재비'])
      : findColByRegex(header, /자재비단가|재료비단가|재료비|자재비/)
  let iLabor =
    findCol(header, ['인건비단가', '노무비단가', '인건비', '노무비']) >= 0
      ? findCol(header, ['인건비단가', '노무비단가', '인건비', '노무비'])
      : findColByRegex(header, /인건비단가|노무비단가|인건비|노무비/)
  if (iMat < 0) iMat = 4
  if (iLabor < 0) iLabor = 6
  const dataStart = bestIdx === 1 ? bestIdx + 2 : bestIdx + 1
  return {
    header,
    dataStart,
    iName: iName >= 0 ? iName : 0,
    iSpec: iSpec >= 0 ? iSpec : 1,
    iUnit: iUnit >= 0 ? iUnit : 2,
    iMat,
    iLabor,
  }
}

/** 통합갑지 등: 호표 + 합계금액만 있는 시트 → (자재) 단가만 생성 */
function parseGabjiTotalsOnlySheet(rows) {
  const r0 = rows[0] || [];
  if (normCell(r0[0]) !== '호표') return null;
  const totalHeader = String(r0[1] == null ? '' : r0[1]).trim();
  if (!totalHeader || !String(totalHeader).replace(/\s/g, '').includes('합계')) return null;

  const items = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const displayName = normalizeName(row[0]);
    if (!displayName) continue;
    const total = toPrice(row[1]);
    if (total == null) continue;
    const unit = /\bm\s*$/i.test(displayName) ? 'M' : 'EA';
    const spec = '';
    items.push({
      kind: '자재',
      name: `${displayName} (자재)`,
      displayName,
      spec,
      price: total,
      unit,
    });
  }
  return items.length ? items : null;
}

function parseExcel(filePath) {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const gabji = parseGabjiTotalsOnlySheet(rows);
  if (gabji) return gabji;

  const { dataStart, iName, iSpec, iUnit, iMat, iLabor } = resolveHeaderAndColumns(rows)

  const items = [];
  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i] || [];
    const name = normalizeName(row[iName]);
    if (!name) continue;
    const spec = normalizeSpec(row[iSpec]);
    const unitRaw = String(row[iUnit] || '').trim();
    const unit = unitRaw === 'Ｍ' ? 'M' : unitRaw || 'EA';
    const matPrice = toPrice(row[iMat]);
    const laborPrice = toPrice(row[iLabor]);
    if (matPrice == null && laborPrice == null) continue;

    const baseName = spec ? `${name} ${spec}` : name;
    if (matPrice != null) {
      items.push({
        kind: '자재',
        name: `${baseName} (자재)`,
        displayName: name,
        spec,
        price: matPrice,
        unit,
      });
    }
    if (laborPrice != null) {
      items.push({
        kind: '인건',
        name: `${baseName} (인건)`,
        displayName: name,
        spec,
        price: laborPrice,
        unit,
      });
    }
  }
  return items;
}

function getNextSku(prefix, maxNum) {
  return `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
}

function parseArgValue(flagName, defaultValue = '') {
  const hit = process.argv.find((a) => a.startsWith(`${flagName}=`));
  if (!hit) return defaultValue;
  return String(hit.slice(flagName.length + 1)).trim();
}

function makeItemKey(kind, displayName, spec) {
  return `${kind}|${normalizeName(displayName)}|${normalizeSpec(spec)}`;
}

async function main() {
  const filePath = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');
  const allowUpdateExisting = process.argv.includes('--allow-update-existing');
  const uniqueOnly = process.argv.includes('--insert-unique-only') || !allowUpdateExisting;
  const resetTarget = process.argv.includes('--reset-target');
  const targetCategory = parseArgValue('--target-category', DEFAULT_TARGET_CATEGORY) || DEFAULT_TARGET_CATEGORY;
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('사용법: node scripts/importEstimateCategoryFromExcel.js "e:/computer_home/001.xlsx" [--dry-run] [--target-category=...] [--insert-unique-only] [--allow-update-existing] [--reset-target]');
    process.exit(1);
  }

  const excelItemsRaw = parseExcel(filePath);
  const seenExcelKeys = new Set();
  const excelItems = [];
  for (const item of excelItemsRaw) {
    const k = makeItemKey(item.kind, item.displayName, item.spec);
    if (seenExcelKeys.has(k)) continue;
    seenExcelKeys.add(k);
    excelItems.push(item);
  }
  if (excelItems.length === 0) {
    console.error('엑셀에서 등재 가능한 항목(자재/인건 단가 포함)을 찾지 못했습니다.');
    process.exit(1);
  }

  await mongoose.connect(config.MONGODB_URI);
  try {
    const existingTargetCount = await Product.countDocuments({ category: targetCategory });
    if (resetTarget) {
      if (dryRun) {
        console.log('[DRY-RUN] reset-target 예정 삭제 건수:', existingTargetCount);
      } else {
        const deleted = await Product.deleteMany({ category: targetCategory });
        console.log('reset-target 삭제 완료:', deleted.deletedCount);
      }
    }

    const products = await Product.find().lean();
    const byKey = new Map();
    const targetCategoryKeys = new Set();
    let maxJ = 0;
    let maxIN = 0;

    for (const p of products) {
      const nameBase = normalizeName(stripSuffix(p.name));
      const spec = normalizeSpec(p.spec);
      const key = `${nameBase}|${spec}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(p);
      if (!resetTarget && (p.category || '').trim() === targetCategory) {
        const kind = /\(인건\)\s*$/.test(p.name || '') ? '인건' : '자재';
        const displayName = stripSpecSuffix(nameBase, spec);
        targetCategoryKeys.add(makeItemKey(kind, displayName, spec));
      }

      const sku = String(p.sku || '').trim().toUpperCase();
      const mJ = sku.match(/^GAS-J-(\d{4})$/);
      if (mJ) maxJ = Math.max(maxJ, Number(mJ[1]));
      const mIN = sku.match(/^GAS-IN-(\d{4})$/);
      if (mIN) maxIN = Math.max(maxIN, Number(mIN[1]));
    }

    let updated = 0;
    let inserted = 0;
    let skipped = 0;
    const insertDocs = [];

    for (const item of excelItems) {
      const itemKey = makeItemKey(item.kind, item.displayName, item.spec);
      if (targetCategoryKeys.has(itemKey)) {
        skipped++;
        continue;
      }
      const key = `${normalizeName(item.displayName)}|${normalizeSpec(item.spec)}`;
      const candidates = byKey.get(key) || [];
      const wantedCategory = item.kind === '자재' ? '도시가스-자재' : '도시가스-인건';
      const hit =
        candidates.find((p) => (p.category || '').trim() === wantedCategory) ||
        candidates.find((p) => (item.kind === '자재' ? /\(자재\)\s*$/.test(p.name || '') : /\(인건\)\s*$/.test(p.name || ''))) ||
        null;

      if (!uniqueOnly && hit) {
        if ((hit.category || '').trim() === targetCategory) {
          skipped++;
          continue;
        }
        if (!dryRun) {
          await Product.updateOne(
            { _id: hit._id },
            { $set: { category: targetCategory } }
          );
        }
        updated++;
        targetCategoryKeys.add(itemKey);
        continue;
      }

      const sku = item.kind === '자재'
        ? getNextSku('GAS-J-', maxJ++)
        : getNextSku('GAS-IN-', maxIN++);
      const doc = {
        sku,
        name: item.name,
        desc: `${targetCategory} - ${item.displayName} ${item.spec}`.trim(),
        spec: item.spec,
        category: targetCategory,
        price: item.price,
        img: '',
        size: item.unit,
        unit: item.unit,
      };
      insertDocs.push(doc);
      if (!dryRun) {
        await Product.create(doc);
      }
      inserted++;
      targetCategoryKeys.add(itemKey);
    }

    console.log('대상 category:', targetCategory, uniqueOnly ? '(insert-unique-only)' : '(allow-update-existing)');
    console.log('엑셀 항목 수(중복 제거 후):', excelItems.length);
    console.log(dryRun ? '[DRY-RUN]' : '[APPLIED]', '업데이트:', updated, '신규등록:', inserted, '스킵:', skipped);
    if (dryRun && insertDocs.length > 0) {
      console.log('신규등록 예정 예시(최대 10건):');
      insertDocs.slice(0, 10).forEach((d) => {
        console.log('-', d.sku, '|', d.name, '|', d.price);
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

