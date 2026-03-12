
export interface PendingRequest {
  requestId: string;
  type: string;
  status: string;
}

export interface ProductRequest {
  requestId: string;
  productId: string;
  productName: string;
  qtyRequested: number;
  qtyFulfilled: number;
}

export interface ProductCost {
  productId: string;
  averageCost: number;
}

export interface GenesisItem {
  requestId: string;
  productId: string;
  productName: string;
  qtyRequested: number;
  qtyFulfilled: number;
  averageCost: number;
  totalCost: number;
}

// Helper to remove accents for better matching
const normalizeText = (text: string): string => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

// Helper to detect delimiter more accurately
export const detectDelimiter = (line: string): string => {
  let inQuote = false;
  let commaCount = 0;
  let semicolonCount = 0;
  
  for (let char of line) {
    if (char === '"') inQuote = !inQuote;
    if (!inQuote) {
      if (char === ',') commaCount++;
      if (char === ';') semicolonCount++;
    }
  }
  return semicolonCount > commaCount ? ';' : ',';
};

// Helper to split CSV line correctly handling quotes and delimiters
export const splitCsvLine = (line: string, delimiter: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuote = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuote && line[i+1] === '"') {
        // Handle escaped quotes ""
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (char === delimiter && !inQuote) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};

// Helper to normalize IDs (remove leading zeros and invisible chars)
export const normalizeId = (id: string): string => {
  if (!id) return '';
  // Remove all whitespace and invisible characters, then remove leading zeros
  const cleanId = id.replace(/[\s\uFEFF\xA0]+/g, '').replace(/^0+/, '');
  return cleanId || '0';
};

// Helper to parse float from string like "1.234,56" or "1,234.56" or "1,0000"
export const parsePtBrFloat = (str: string): number => {
  if (!str) return 0;
  // Remove quotes and whitespace
  let cleanStr = str.replace(/["\s\uFEFF\xA0]/g, '');
  
  if (!cleanStr) return 0;

  // Check format. If it has comma as decimal separator
  if (cleanStr.includes(',') && !cleanStr.includes('.')) {
     cleanStr = cleanStr.replace(',', '.');
  } else if (cleanStr.includes(',') && cleanStr.includes('.')) {
     const lastComma = cleanStr.lastIndexOf(',');
     const lastDot = cleanStr.lastIndexOf('.');
     if (lastComma > lastDot) {
       // 1.234,56
       cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
     } else {
       // 1,234.56
       cleanStr = cleanStr.replace(/,/g, '');
     }
  } else if (cleanStr.includes(',')) {
    cleanStr = cleanStr.replace(',', '.');
  }
  
  const val = parseFloat(cleanStr);
  return isNaN(val) ? 0 : val;
};

export const parsePendingRequests = (content: string): Set<string> => {
  const lines = content.split(/\r?\n/);
  const requestIds = new Set<string>();
  
  let headerIndex = -1;
  let colIndices: {[key: string]: number} = {};
  let delimiter = ';';

  // Check if user uploaded the wrong file (Product file instead of Pending file)
  const firstFewLines = lines.slice(0, 10).join(' ').toLowerCase();
  if (firstFewLines.includes('qt. solicitada') || firstFewLines.includes('qt. atendida')) {
    console.warn("WARNING: It looks like you uploaded the 'Produtos Solicitados' file into the 'Solicitações Pendentes' input.");
    // We will still try to parse it, but it might fail or yield 0 results.
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normalizedLine = normalizeText(line);
    
    // Check for header row - being extremely flexible
    // Look for any combination of words that might indicate the header row
    const hasSolicitacao = normalizedLine.includes('solicita') || normalizedLine.includes('nro.') || normalizedLine.includes('numero');
    const hasTipo = normalizedLine.includes('tp') || normalizedLine.includes('tipo') || normalizedLine.includes('data'); // Added data as fallback
    const hasSituacao = normalizedLine.includes('situa') || normalizedLine.includes('status') || normalizedLine.includes('estado') || normalizedLine.includes('pend');

    if (hasSolicitacao && (hasTipo || hasSituacao)) {
      headerIndex = i;
      delimiter = detectDelimiter(line);
      const cols = splitCsvLine(line, delimiter);
      cols.forEach((col, idx) => {
        const c = normalizeText(col);
        // Match "Solicitação", "Nro. Solicitação", "Solicitacao", "Nro."
        if ((c.includes('solicita') || c.includes('nro')) && !c.includes('tp') && !c.includes('dt') && !c.includes('tipo')) colIndices['id'] = idx;
        // Match "Tp Solicitação", "Tipo", "Tp"
        if (c.includes('tp') || c.includes('tipo')) colIndices['type'] = idx;
        // Match "Situação", "Status"
        if (c.includes('situa') || c.includes('status')) colIndices['status'] = idx;
      });
      
      // If we found at least the ID column, we consider it a success
      if (colIndices['id'] !== undefined) {
        console.log('Pending Requests Header Found at line', i, 'Delimiter:', delimiter, 'Columns:', colIndices);
        break;
      } else {
        // Reset if we didn't find the ID column, maybe it wasn't the header
        headerIndex = -1;
        colIndices = {};
      }
    }
  }

  if (headerIndex === -1) {
    console.error('Pending Requests Header NOT found. First 5 lines:', lines.slice(0, 5));
    // Fallback: assume first row is header if we couldn't find it, and try to guess columns
    if (lines.length > 0) {
      console.log('Attempting fallback header detection on first row');
      headerIndex = 0;
      delimiter = detectDelimiter(lines[0]);
      const cols = splitCsvLine(lines[0], delimiter);
      cols.forEach((col, idx) => {
        const c = normalizeText(col);
        if (c.includes('solicita') || c.includes('nro')) colIndices['id'] = idx;
        if (c.includes('tp') || c.includes('tipo')) colIndices['type'] = idx;
        if (c.includes('situa') || c.includes('status')) colIndices['status'] = idx;
      });
      
      // If still no ID column, just guess based on common positions (0: ID, 1: Type, 2: Status)
      if (colIndices['id'] === undefined) {
         console.log('Fallback failed, guessing column indices');
         // In the user's error, the "Pending" file had "Solicitação" at index 3 (if split by comma)
         // Let's try to find the word "Solicita" in the first 5 lines and use its index
         let foundIdIdx = -1;
         for(let j=0; j<Math.min(5, lines.length); j++) {
            const tempCols = splitCsvLine(lines[j], detectDelimiter(lines[j]));
            const idx = tempCols.findIndex(c => normalizeText(c).includes('solicita'));
            if(idx !== -1) {
                foundIdIdx = idx;
                headerIndex = j;
                delimiter = detectDelimiter(lines[j]);
                break;
            }
         }
         
         colIndices = { id: foundIdIdx !== -1 ? foundIdIdx : 0, type: 1, status: 2 };
      }
      console.log('Fallback Columns:', colIndices);
    } else {
      return requestIds;
    }
  }

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = splitCsvLine(line, delimiter);
    
    const idRaw = cols[colIndices['id']]?.trim();
    const type = normalizeText(cols[colIndices['type']] || '');
    const status = normalizeText(cols[colIndices['status']] || '');

    // Filter: "Devolução de Paciente" and "Pend"
    // Make it even more flexible
    const isDevolucao = type.includes('devolu') || type.includes('paciente');
    const isPendente = status.includes('pend') || status === ''; // Sometimes status might be empty but implied pending

    // If we don't have a type column, we just take all rows that have an ID and are pending
    const typeValid = colIndices['type'] !== undefined ? isDevolucao : true;
    const statusValid = colIndices['status'] !== undefined ? isPendente : true;

    if (typeValid && statusValid) {
      const id = normalizeId(idRaw);
      if (id) requestIds.add(id);
    }
  }

  console.log('Total valid pending requests found:', requestIds.size);
  return requestIds;
};

export const parseProductRequests = (content: string, validRequestIds: Set<string>): ProductRequest[] => {
  const lines = content.split(/\r?\n/);
  const products: ProductRequest[] = [];
  
  let headerIndex = -1;
  let colIndices: {[key: string]: number} = {};
  let delimiter = ',';

  // Check if user uploaded the wrong file (Pending file instead of Product file)
  const firstFewLines = lines.slice(0, 10).join(' ').toLowerCase();
  if (firstFewLines.includes('tp solicita') && !firstFewLines.includes('qt. solicitada')) {
    console.warn("WARNING: It looks like you uploaded the 'Solicitações Pendentes' file into the 'Produtos Solicitados' input.");
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normalizedLine = normalizeText(line);
    
    const hasSolicitacao = normalizedLine.includes('solicita') || normalizedLine.includes('nro.') || normalizedLine.includes('numero');
    const hasProduto = normalizedLine.includes('produto') || normalizedLine.includes('item') || normalizedLine.includes('descri');

    if (hasSolicitacao && hasProduto) {
      headerIndex = i;
      delimiter = detectDelimiter(line);
      const cols = splitCsvLine(line, delimiter);
      cols.forEach((col, idx) => {
        const c = normalizeText(col);
        if ((c.includes('solicita') || c.includes('nro')) && !c.includes('dt') && !c.includes('tp') && !c.includes('tipo')) colIndices['requestId'] = idx;
        if (c.includes('produto') || c.includes('item') || c.includes('descri')) colIndices['product'] = idx;
        if (c.includes('qt. solicitada') || c.includes('qtd solicitada') || c.includes('solicitado')) colIndices['qtyReq'] = idx;
        if (c.includes('qt. atendida') || c.includes('qtd atendida') || c.includes('atendido')) colIndices['qtyFul'] = idx;
      });
      
      if (colIndices['requestId'] !== undefined && colIndices['product'] !== undefined) {
        console.log('Product Requests Header Found at line', i, 'Delimiter:', delimiter, 'Columns:', colIndices);
        break;
      } else {
        headerIndex = -1;
        colIndices = {};
      }
    }
  }

  if (headerIndex === -1) {
    console.error('Product Requests Header NOT found. First 5 lines:', lines.slice(0, 5));
    if (lines.length > 0) {
      console.log('Attempting fallback header detection on first row');
      headerIndex = 0;
      delimiter = detectDelimiter(lines[0]);
      // ... fallback logic ...
    } else {
      return products;
    }
  }

  let matchedCount = 0;

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = splitCsvLine(line, delimiter);

    // The CSV columns are often misaligned with the header.
    // We will try to dynamically find the data in the row.
    // Allow date with time, e.g., "01/03/26" or "01/03/2026 10:00"
    const dateIdx = cols.findIndex(c => /^\d{2}\/\d{2}\/\d{2,4}/.test(c.trim()));
    
    // Also try to find the product column directly if date fails
    const productIdx = cols.findIndex(c => /^\d+\s*-/.test(c.trim()));

    let requestIdRaw = '';
    let productRaw = '';
    let qtyReqRaw = '';
    let qtyFulRaw = '';

    if (dateIdx !== -1) {
      // Request ID is usually the non-empty column right before the date
      for (let j = dateIdx - 1; j >= 0; j--) {
        if (cols[j].trim()) {
          requestIdRaw = cols[j].trim();
          break;
        }
      }

      // Product is usually the first non-empty column after the date that contains a hyphen (e.g., "123 - NAME")
      for (let j = dateIdx + 1; j < cols.length; j++) {
        const cell = cols[j].trim();
        if (cell && /^\d+\s*-/.test(cell)) {
          productRaw = cell;
          
          // Now find the quantities. They are usually the next numbers after the product.
          const numbers = [];
          for (let k = j + 1; k < cols.length; k++) {
            const val = cols[k].trim();
            // Match numbers like "1,0000" or 1.000,00
            if (val && /^"?\s*[\d.,]+\s*"?$/.test(val)) {
              numbers.push(val);
            }
          }
          
          if (numbers.length >= 2) {
            qtyReqRaw = numbers[0];
            qtyFulRaw = numbers[1];
          } else if (numbers.length === 1) {
            qtyReqRaw = numbers[0];
            qtyFulRaw = "0";
          }
          break;
        }
      }
    } else if (productIdx !== -1) {
      // If we found the product but not the date, try to find the ID before it
      productRaw = cols[productIdx].trim();
      for (let j = productIdx - 1; j >= 0; j--) {
        const cell = cols[j].trim();
        // Look for a numeric ID
        if (cell && /^\d+$/.test(cell)) {
          requestIdRaw = cell;
          break;
        }
      }
      
      const numbers = [];
      for (let k = productIdx + 1; k < cols.length; k++) {
        const val = cols[k].trim();
        if (val && /^"?\s*[\d.,]+\s*"?$/.test(val)) {
          numbers.push(val);
        }
      }
      if (numbers.length >= 2) {
        qtyReqRaw = numbers[0];
        qtyFulRaw = numbers[1];
      } else if (numbers.length === 1) {
        qtyReqRaw = numbers[0];
        qtyFulRaw = "0";
      }
    } else {
      // Fallback to header indices if neither date nor product pattern found
      requestIdRaw = cols[colIndices['requestId']]?.trim();
      productRaw = cols[colIndices['product']]?.trim();
      qtyReqRaw = cols[colIndices['qtyReq']]?.trim();
      qtyFulRaw = cols[colIndices['qtyFul']]?.trim();
    }

    const requestId = normalizeId(requestIdRaw);
    
    // If we don't have validRequestIds, we might want to process all of them for debugging
    // but the requirement says to only process matching ones.
    if (requestId && validRequestIds.has(requestId)) {
      // Extract Product ID (numeric part at start)
      const productIdMatch = productRaw?.match(/^(\d+)/);
      const productId = productIdMatch ? productIdMatch[1] : '';
      
      if (productId) {
        const product = {
          requestId: requestIdRaw, // Keep original for display
          productId: normalizeId(productId),
          productName: productRaw || '',
          qtyRequested: parsePtBrFloat(qtyReqRaw),
          qtyFulfilled: parsePtBrFloat(qtyFulRaw)
        };
        products.push(product);
        
        if (matchedCount < 5) {
          console.log(`Matched Product Request [${matchedCount + 1}]:`, product);
          matchedCount++;
        }
      }
    }
  }

  console.log('Total product lines matching pending requests:', products.length);
  return products;
};

export const parseCosts = (content: string): Map<string, number> => {
  const lines = content.split(/\r?\n/);
  const costMap = new Map<string, number>();
  
  let currentProductId: string | null = null;
  let delimiter = ',';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (i === 0 || line.includes('Produto:')) {
      delimiter = detectDelimiter(line);
    }

    const cols = splitCsvLine(line, delimiter);

    // Check for Product line
    const productLabelIdx = cols.findIndex(c => c.trim().includes('Produto:'));
    if (productLabelIdx !== -1) {
      const cellContent = cols[productLabelIdx].trim();
      if (cellContent === 'Produto:') {
        currentProductId = normalizeId(cols[productLabelIdx + 1]);
      } else {
        const idMatch = cellContent.match(/Produto:\s*(\d+)/);
        if (idMatch) {
          currentProductId = normalizeId(idMatch[1]);
        }
      }
      continue;
    }

    // Check for Cost line
    const dateIndex = cols.findIndex(c => /\d{2}\/\d{4}/.test(c));
    
    if (currentProductId && dateIndex !== -1) {
      // Look for the cost in columns after the date
      // The first number is usually "Qt. Est.Antes", the last number is "Vl Custo Médio"
      let lastCost = 0;
      for (let j = dateIndex + 1; j < cols.length; j++) {
        const val = cols[j].trim();
        if (val && /^"?\s*[\d.,]+\s*"?$/.test(val)) {
          const cost = parsePtBrFloat(val);
          if (cost > 0) {
            lastCost = cost;
          }
        }
      }
      
      if (lastCost > 0) {
        costMap.set(currentProductId, lastCost);
        currentProductId = null; // Reset
      }
    }
  }

  console.log('Total product costs mapped:', costMap.size);
  return costMap;
};
