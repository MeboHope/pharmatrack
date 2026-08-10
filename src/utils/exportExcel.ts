import * as XLSX from 'xlsx';

export const exportToExcel = (
  data: Record<string, any>[],
  filename: string,
  sheetName: string = 'Sheet1'
) => {
  if (!data || data.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-fit column widths dynamically based on max content length
  const colWidths = Object.keys(data[0]).map((key) => {
    let maxLen = key.toString().length;
    data.forEach((row) => {
      const val = row[key];
      if (val !== null && val !== undefined) {
        const len = String(val).length;
        if (len > maxLen) maxLen = len;
      }
    });
    return { wch: Math.max(maxLen + 4, 12) };
  });

  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};
