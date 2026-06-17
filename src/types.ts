export interface InventoryItem {
  id: string;
  name: string;
  location: string;
  quantity: number;
  units: string;
  supplier: string;
  price: string;
  invoiceNo: string;
  itemCode: string;
  remark: string;
  minThreshold?: number;
  hazards?: string[];
}
