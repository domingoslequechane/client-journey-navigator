const XLSX = require('xlsx');
const fs = require('fs');

try {
  const workbook = XLSX.readFile('financeiro.xlsx');
  const sheetsInfo = {};

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    // Get the first 5 rows to understand the structure
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0 });
    const sampleData = data.slice(0, 10).filter(row => row.length > 0);
    sheetsInfo[sheetName] = sampleData;
  });

  fs.writeFileSync('financeiro_analysis.json', JSON.stringify(sheetsInfo, null, 2));
  console.log("Analysis complete.");
} catch (e) {
  console.error("Error analyzing spreadsheet:", e);
}
