export type UnitType = string;

export type AlertStatus = 
  | 'OK'
  | 'VERIFICAR INVENTÁRIO'
  | 'REMANEJAR (VALIDADE)'
  | 'URGENTE!'
  | 'PEDIR AO RECEBIMENTO';

export type ProductCategory = 'Medicamento' | 'Material' | 'Portaria 344';

export interface Product {
  id: string;
  name: string;
  unit: UnitType;
  physicalStock: number;
  systemStock: number;
  totalExits30Days: number;
  expiryDate: string; // ISO format YYYY-MM-DD
  batch?: string;
}

export interface ProcessedProduct extends Product {
  dailyConsumption: number;
  coverageDays: number;
  daysToExpiry: number;
  status: AlertStatus;
  category: ProductCategory;
  supplyStock: number;
}

export interface StandardizedProduct {
  id: string;
  name: string;
  abc: string;
}

export interface FollowUpItem {
  id: string;
  hospital: string;
  supplier: string;
  ocNumber: string;
  itemCode: string;
  itemName: string;
  creationDate: string;
  deliveryDate: string;
  pendingQty: number;
  totalQty: number;
  coverage: number;
  status: 'No Prazo' | 'Atrasado' | 'Entregue';
  delayDays: number;
  ltRespected: boolean;
  observations: string;
}
