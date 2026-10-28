const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('xlsx');
const directory = path.resolve(__dirname, '../examples');
fs.mkdirSync(directory, { recursive: true });
const workbook = XLSX.utils.book_new();
const sheet = XLSX.utils.aoa_to_sheet([
  ['Date', 'Machine', 'Série', 'Poids', 'Rep'],
  ['20/10/2026', 'Lat pulldown', 1, 40, 10],
  ['20/10/2026', 'Lat pulldown', 2, 40, 10],
  ['20/10/2026', 'Seated row', 1, 35, 12],
  ['22/10/2026', 'Leg press', 1, 80, 10],
  ['22/10/2026', 'Leg press', 2, 80, 8],
]);
sheet['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
XLSX.utils.book_append_sheet(workbook, sheet, 'Historique');
XLSX.writeFile(workbook, path.join(directory, 'historique-exemple.xlsx'));
console.log('examples/historique-exemple.xlsx created');
