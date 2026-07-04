import * as XLSX from 'xlsx';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExcelExportOptions {
  fileName: string;
  columns: ExcelColumn[];
  data: Record<string, any>[];
  sheetName?: string;
  title?: string;
}

/**
 * Export data to Excel with professional styling
 */
export function exportToExcel(options: ExcelExportOptions): void {
  const { fileName, columns, data, sheetName = 'Report', title } = options;

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Prepare data array with title row if provided
  const wsData: any[][] = [];

  // Add title row
  if (title) {
    wsData.push([title]);
  }

  // Add header row
  const headers = columns.map(col => col.header);
  wsData.push(headers);

  // Add data rows
  data.forEach(row => {
    const rowData = columns.map(col => {
      const value = row[col.key];
      // Handle null/undefined
      if (value === null || value === undefined) return '';
      // Handle dates
      if (value instanceof Date) return value.toLocaleDateString();
      // Handle numbers
      if (typeof value === 'number') return value;
      // Return as string
      return String(value);
    });
    wsData.push(rowData);
  });

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  const colWidths = columns.map(col => ({
    wch: col.width || 15
  }));
  ws['!cols'] = colWidths;

  // Set title row merge if title exists
  if (title) {
    ws['!merges'] = [
      {
        s: { r: 0, c: 0 },
        e: { r: 0, c: columns.length - 1 }
      }
    ];
  }

  // Apply styles (Note: XLSX styling requires pro version, using basic formatting)
  // The headers will be bold by default in Excel

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate file and download
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/**
 * Export table DOM element to Excel
 */
export function exportTableToExcel(tableElement: HTMLTableElement, fileName: string, title?: string): void {
  const columns: ExcelColumn[] = [];
  const data: Record<string, any>[] = [];

  // Extract headers
  const headerRow = tableElement.querySelector('thead tr');
  if (headerRow) {
    const ths = headerRow.querySelectorAll('th, td');
    ths.forEach((th, index) => {
      columns.push({
        header: th.textContent?.trim() || `Column ${index + 1}`,
        key: `col_${index}`,
        width: 15
      });
    });
  }

  // Extract data rows (including from TableBody)
  const rows = tableElement.querySelectorAll('tbody tr');
  rows.forEach(row => {
    const rowData: Record<string, any> = {};
    const tds = row.querySelectorAll('td, th');
    tds.forEach((td, index) => {
      if (columns[index]) {
        rowData[columns[index].key] = td.textContent?.trim() || '';
      }
    });
    // Only add rows that have actual data (not empty or summary rows with colspan)
    if (Object.values(rowData).some(val => val !== '')) {
      data.push(rowData);
    }
  });

  exportToExcel({
    fileName,
    columns,
    data,
    title
  });
}
