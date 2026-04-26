/**
 * 참조단가001 / 002 엑셀을 연속 import (운영과 동일 DB에 넣을 때 사용)
 *
 * 사용 (server 폴더):
 *   npm run import:reference --prefix server
 *
 * 경로 변경:
 *   set REF001_XLSX=e:/computer_home/001.xlsx
 *   set REF002_XLSX=e:/computer_home/002.xlsx
 *   npm run import:reference --prefix server
 *
 * 또는 인자:
 *   node scripts/importReferenceBatches.js "e:/a/001.xlsx" "e:/a/002.xlsx"
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_001 = process.env.REF001_XLSX || 'e:/computer_home/001.xlsx';
const DEFAULT_002 = process.env.REF002_XLSX || 'e:/computer_home/002.xlsx';

const batches = [
  { file: process.argv[2] || DEFAULT_001, category: '참조단가001' },
  { file: process.argv[3] || DEFAULT_002, category: '참조단가002' },
];

const importScript = path.join(__dirname, 'importEstimateCategoryFromExcel.js');
const serverRoot = path.join(__dirname, '..');

function runOne(xlsx, category) {
  if (!fs.existsSync(xlsx)) {
    console.error('파일 없음:', xlsx);
    process.exit(1);
  }
  console.log('\n=== import', category, xlsx, '===');
  const r = spawnSync(process.execPath, [importScript, xlsx, `--target-category=${category}`], {
    stdio: 'inherit',
    cwd: serverRoot,
    env: process.env,
  });
  if (r.status !== 0) {
    console.error('import 실패 exit', r.status);
    process.exit(r.status || 1);
  }
}

for (const b of batches) {
  runOne(path.normalize(b.file), b.category);
}

console.log('\n완료. 검증: npm run verify:reference --prefix server');
