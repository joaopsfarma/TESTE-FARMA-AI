
export interface ParsedData {
  items: any[];
  summary?: any;
}

export const parseHtmlReport = (htmlContent: string): ParsedData => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const table = doc.querySelector('table.oatgrid');

  if (!table) {
    console.warn('Table with class .oatgrid not found');
    return { items: [] };
  }

  const rows = Array.from(table.querySelectorAll('tbody tr'));
  const items = rows.map(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length < 4) return null;

    // Extract text from the span with id "span_txt_pivot" if it exists, otherwise innerText
    const getText = (cell: Element) => {
      const span = cell.querySelector('span#span_txt_pivot');
      return span ? span.textContent?.trim() : cell.textContent?.trim();
    };

    const code = getText(cells[0]);
    const name = getText(cells[1]);
    const occurrencesStr = getText(cells[2])?.replace(/\./g, '').replace(',', '.') || '0';
    const percentageStr = getText(cells[3])?.replace('%', '').replace(',', '.') || '0';

    return {
      id: code,
      name: name,
      value: parseInt(occurrencesStr, 10),
      percentage: parseFloat(percentageStr)
    };
  }).filter(item => item !== null);

  return { items };
};

export const processFiles = async (files: File[]): Promise<ParsedData | null> => {
  for (const file of files) {
    if (file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')) {
      const text = await file.text();
      return parseHtmlReport(text);
    }
  }
  return null;
};
