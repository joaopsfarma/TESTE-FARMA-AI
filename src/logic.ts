import { Product, ProcessedProduct, AlertStatus, ProductCategory, UnitType } from './types';

const PORTARIA_344_KEYWORDS = [
  'MORFINA', 'DIMORF',
  'FENTANILA', 'FENTANEST', 'DUROGESIC',
  'TRAMADOL', 'TRAMAL', 'TRAMADON', 'SYLADOR',
  'DIAZEPAM', 'COMPAZ', 'VALIUM', 'UNI-DIAZEPAX',
  'MIDAZOLAM', 'DORMIRE',
  'CLONAZEPAM', 'RIVOTRIL', 'CLOPAM',
  'ALPRAZOLAM', 'FRONTAL',
  'BROMAZEPAM', 'LEXOTAN',
  'CODEINA', 'CODEIN', 'TYLEX',
  'METADONA', 'MYTEDOM', 'MYTEDON',
  'PETIDINA', 'DOLANTINA',
  'REMIFENTANILA', 'RELYON',
  'SUFENTANILA', 'FASTFEN',
  'KETAMIN', 'ESCETAMINA',
  'FENOBARBITAL', 'GARDENAL',
  'ZOLPIDEM', 'STILNOX', 'PATZ',
  'METILFENIDATO', 'RITALINA', 'CONCERTA',
  'LISDEXANFETAMINA', 'VENVANSE',
  'CLOZAPINA', 'LEPONEX',
  'BUPRENORFINA', 'RESTIVA',
  'OXYCONTIN', 'OXICODONA',
  'SEVOFLURANO'
];

const MATERIAL_KEYWORDS = [
  'FIO ', 'AGULHA', 'SERINGA', 'CATETER', 'SONDA', 'LUVA', 
  'CURATIVO', 'COMPRESSA', 'ATADURA', 'ESPARADRAPO', 'FITA ', 
  'MASCARA', 'AVENTAL', 'TOUCA', 'PROPE ', 'CAMPO ', 'ELETRODO', 
  'EXTENSAO', 'EQUIPO', 'COLETOR',  
  'LAMINA ', 'BISTURI', 'CANULA', 'DRENO', 'PAPEL', 'LENCOL', 
  'FRALDA', 'CONECTOR', 'TORNEIRA', 'ESPECULO', 'ABAIXADOR', 
  'ALGODAO', 'GAZE', 'MICROPORE', 'TRANSPORE', 'CADARCO', 'PULSEIRA', 
  'ETIQUETA', 'ENVELOPE', 'SACO', 'LIXEIRA', 'SABAO', 'DETERGENTE', 
  'ESCOVA', 'ESPONJA', 'CLIP', 'GRAMPEADOR', 'TROCAR', 'PINCA', 
  'TESOURA', 'CABO', 'SENSOR', 'CIRCUITO', 'UMIDIFICADOR', 
  'NEBULIZADOR', 'ESPACADOR', 'RESUSCITADOR', 
  'LARINGOSCOPIO', 'GUIA', 'INTRODUTOR', 'STENT', 
  'MARCAPASSO', 'PROTESE', 'ORTESE', 'PARAFUSO', 
  'PLACA', 'HASTE', 'CIMENTO', 'BROCA', 'SERRA ', 'LANCETA',
  'FILTRO', 'ABSORVENTE',
  'HEMOSTATICO', 'MALHA', 'PERNEIRA', 'COBERTURA', 'FIXADOR',
  'ASPIRADOR'
];

const classifyProduct = (name: string): ProductCategory => {
  const upperName = name.toUpperCase();

  // Check for Portaria 344 first (priority)
  if (PORTARIA_344_KEYWORDS.some(keyword => upperName.includes(keyword))) {
    return 'Portaria 344';
  }

  // Check for Materials
  if (MATERIAL_KEYWORDS.some(keyword => upperName.includes(keyword))) {
    return 'Material';
  }

  // Default to Medicamento
  return 'Medicamento';
};

export const processInventory = (products: Product[]): ProcessedProduct[] => {
  const today = new Date();

  // Helper to find supply stock
  const findSupplyStock = (productId: string, targetSupplyUnit: UnitType): number => {
    const supplyItem = products.find(p => p.id === productId && p.unit === targetSupplyUnit);
    return supplyItem ? supplyItem.physicalStock : 0;
  };

  return products.map(product => {
    const dailyConsumption = product.totalExits30Days / 30;
    
    // Avoid division by zero
    const coverageDays = dailyConsumption > 0 
      ? product.physicalStock / dailyConsumption 
      : 999; // Infinite coverage if no consumption

    const expiryDate = new Date(product.expiryDate);
    const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let status: AlertStatus = 'OK';

    // Determine supply unit based on product unit
    // 337 (Psico) -> 561 (Supply Psico)
    // Others -> 501 (Supply General)
    const supplyUnit = product.unit === '337' ? '561' : '501';
    const supplyStock = findSupplyStock(product.id, supplyUnit);

    // Priority 1: Physical != System Stock (Divergence > 30)
    if (Math.abs(product.physicalStock - product.systemStock) > 30) {
      status = 'VERIFICAR INVENTÁRIO';
    }
    // Priority 2: Expiry Risk (expires in < 90 days AND we have more stock than we can use)
    else if (daysToExpiry < 90 && coverageDays > daysToExpiry) {
      status = 'REMANEJAR (VALIDADE)';
    }
    // Priority 3: Critical Stock (Ruptura) - Coverage <= 3 days AND Supply has NO stock
    else if (coverageDays <= 3 && supplyStock === 0) {
      status = 'URGENTE!';
    }
    // Priority 4: Reorder Point - Coverage <= 7 days AND Supply HAS stock
    else if (coverageDays <= 7 && supplyStock > 0) {
      status = 'PEDIR AO RECEBIMENTO';
    }

    return {
      ...product,
      dailyConsumption,
      coverageDays,
      daysToExpiry,
      status,
      category: classifyProduct(product.name),
      supplyStock
    };
  });
};

export const getSupplyUnitForSatellite = (unit: UnitType): UnitType => {
  return unit === '337' ? '561' : '501';
};
