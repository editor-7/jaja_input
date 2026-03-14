/**
 * 엑셀 파일의 비고1 열을 카탈로그(지하관PLP, 지하관PEM, 노출관, 공통)로 채움
 * 사용: node scripts/fixExcel비고1.js "경로\파일.xlsx"
 * 같은 파일을 수정하여 저장합니다.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const MAIN_CATEGORIES = ['지하관PLP', '지하관PEM', '노출관', '공통'];

function inferMainCategoryFromText(품목 = '', 규격 = '', 비고2 = '') {
  const raw = `${품목} ${규격} ${비고2}`.trim();
  if (!raw) return '공통';
  const combined = raw.replace(/\s+/g, ' ').toLowerCase();
  const combinedNoSpace = combined.replace(/\s/g, '');
  // 노출관 먼저 (한글)
  if (/노출관|노출|외노출|노출배관/.test(raw)) return '노출관';
  if (combined.includes('exposed')) return '노출관';
  if (combined.includes('plp') || combinedNoSpace.includes('plp')) return '지하관PLP';
  if (combined.includes('pem') || combinedNoSpace.includes('pem')) return '지하관PEM';
  if (/노출관|노출/.test(combined)) return '노출관';
  return '공통';
}

function findColumnIndex(headerRow, names) {
  if (!Array.isArray(headerRow)) return -1;
  for (const name of names) {
    const n = String(name).trim().replace(/\s/g, '');
    const idx = headerRow.findIndex((c) => String(c || '').trim().replace(/\s/g, '') === n);
    if (idx >= 0) return idx;
  }
  return -1;
}

function run() {
  const filePath = process.argv[2];
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('사용법: node scripts/fixExcel비고1.js "경로\\\\전체물량_2026-03-14_02.xlsx"');
    console.error('지정한 파일이 없습니다:', filePath);
    process.exit(1);
  }

  const wb = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (rows.length < 2) {
    console.error('데이터 행이 없습니다.');
    process.exit(1);
  }

  // 헤더는 0행 또는 1행에서 찾기 (전체물량 엑셀 형식에 맞춤)
  const headerRow = rows[0] || [];
  const headerRow1 = rows[1] || [];
  const col품목 = findColumnIndex(headerRow, ['품목', '품명']) >= 0
    ? findColumnIndex(headerRow, ['품목', '품명'])
    : findColumnIndex(headerRow1, ['품목', '품명']);
  const col규격 = findColumnIndex(headerRow, ['규격']) >= 0
    ? findColumnIndex(headerRow, ['규격'])
    : findColumnIndex(headerRow1, ['규격']);
  let col비고1 = findColumnIndex(headerRow, ['비고1']);
  if (col비고1 < 0) col비고1 = findColumnIndex(headerRow1, ['비고1']);
  const col비고2 = findColumnIndex(headerRow, ['비고2']) >= 0
    ? findColumnIndex(headerRow, ['비고2'])
    : findColumnIndex(headerRow1, ['비고2']);

  const col품목Final = col품목 >= 0 ? col품목 : 0;
  const col규격Final = col규격 >= 0 ? col규격 : 1;
  const col비고2Final = col비고2 >= 0 ? col비고2 : -1;

  // 비고1 열이 없으면 헤더 행 마지막 다음에 추가
  const numCols = Math.max(...rows.slice(0, 2).map((r) => r.length), 0);
  if (col비고1 < 0) {
    col비고1 = numCols;
    if (headerRow.length <= col비고1) {
      while (headerRow.length <= col비고1) headerRow.push('');
      headerRow[col비고1] = '비고1';
    } else {
      headerRow[col비고1] = '비고1';
    }
  }

  let dataStart = 1;
  if (col품목 < 0 && headerRow[0] && String(headerRow[0]).trim() === '') dataStart = 2;
  let updated = 0;
  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const 품목 = String(row[col품목Final] ?? '').trim();
    if (!품목) continue;
    const 규격 = String(row[col규격Final] ?? '').trim();
    const 비고2 = col비고2Final >= 0 ? String(row[col비고2Final] ?? '').trim() : '';
    const catalog = inferMainCategoryFromText(품목, 규격, 비고2);
    while (row.length <= col비고1) row.push('');
    const prev = row[col비고1];
    row[col비고1] = catalog;
    if (prev !== catalog) updated++;
  }

  const newWs = XLSX.utils.aoa_to_sheet(rows);
  wb.Sheets[sheetName] = newWs;
  XLSX.writeFile(wb, filePath, { bookType: 'xlsx', type: 'binary' });
  console.log('저장 완료:', filePath);
  console.log('비고1(카탈로그) 반영 행 수:', updated);
}

run();
