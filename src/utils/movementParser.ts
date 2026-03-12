import { normalizeId, parsePtBrFloat, detectDelimiter, splitCsvLine } from './genesisParser';

export interface MovementItem {
  id: string;
  name: string;
  consumption: number;
  currentStock: number;
}

export const parseMovementCsv = (content: string): MovementItem[] => {
  const lines = content.split(/\r?\n/);
  const items: MovementItem[] = [];
  
  let headerIndex = -1;
  let delimiter = ',';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('produto') && line.includes('qtd') && line.includes('vl unit')) {
      headerIndex = i;
      delimiter = detectDelimiter(lines[i]);
      break;
    }
  }

  if (headerIndex === -1) {
    console.error('Movement CSV Header NOT found.');
    return items;
  }

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.toLowerCase().includes('total do estoque') || line.toLowerCase().includes('total geral')) continue;

    const cols = splitCsvLine(line, delimiter);
    const nonEmpties = cols.filter(c => c.trim() !== '');
    
    if (nonEmpties.length >= 7) {
      const idRaw = nonEmpties[0];
      const nameRaw = nonEmpties[1];
      
      const id = normalizeId(idRaw);
      const name = nameRaw.trim();
      
      const qtyRaw = nonEmpties[3];
      const qtyAtualRaw = nonEmpties[nonEmpties.length - 1]; // Last one is Qtd Atual
      
      const consumption = parsePtBrFloat(qtyRaw);
      const currentStock = parsePtBrFloat(qtyAtualRaw);
      
      if (id) {
        items.push({
          id,
          name,
          consumption: isNaN(consumption) ? 0 : consumption,
          currentStock: isNaN(currentStock) ? 0 : currentStock
        });
      }
    }
  }

  return items;
};
