import { loadData, saveData } from "./storage";

export type ProductionStatus =
  | "Planned"
  | "In Progress"
  | "Completed"
  | "On Hold";

export type QualityDisposition =
  | "Pending"
  | "Accepted"
  | "Rework"
  | "Scrapped";

export type ProductionOrder = {
  id: string;
  sku: string;
  product: string;
  quantityPlanned: number;
  quantityProduced: number;
  workCenter: string;
  startDate: string;
  dueDate: string;
  status: ProductionStatus;

  // Quality
  inspectedQty: number;
  passedQty: number;
  failedQty: number;
  disposition: QualityDisposition;
  inspector: string;
  qualityHold: boolean;

  createdDate: string;
};

const STORAGE_KEY = "productionOrders";

const seed: ProductionOrder[] = [
  {
    id: "MO-2026-001",
    sku: "GPU-2048",
    product: "AI GPU Accelerator",
    quantityPlanned: 40,
    quantityProduced: 40,
    workCenter: "SMT Line 1",
    startDate: "Aug 20, 2026",
    dueDate: "Sep 3, 2026",
    status: "Completed",
    inspectedQty: 40,
    passedQty: 38,
    failedQty: 2,
    disposition: "Accepted",
    inspector: "R. Okafor",
    qualityHold: false,
    createdDate: "Aug 18, 2026",
  },
  {
    id: "MO-2026-002",
    sku: "NIC-CX7",
    product: "ConnectX-7 Network Adapter",
    quantityPlanned: 120,
    quantityProduced: 76,
    workCenter: "SMT Line 2",
    startDate: "Sep 1, 2026",
    dueDate: "Sep 12, 2026",
    status: "In Progress",
    inspectedQty: 60,
    passedQty: 57,
    failedQty: 3,
    disposition: "Pending",
    inspector: "L. Marsh",
    qualityHold: false,
    createdDate: "Aug 29, 2026",
  },
  {
    id: "MO-2026-003",
    sku: "RETIMER-G5",
    product: "PCIe Gen5 Retimer",
    quantityPlanned: 50,
    quantityProduced: 50,
    workCenter: "Assembly Cell A",
    startDate: "Aug 25, 2026",
    dueDate: "Sep 5, 2026",
    status: "On Hold",
    inspectedQty: 50,
    passedQty: 41,
    failedQty: 9,
    disposition: "Rework",
    inspector: "R. Okafor",
    qualityHold: true,
    createdDate: "Aug 22, 2026",
  },
  {
    id: "MO-2026-004",
    sku: "SSD-3.84T",
    product: "3.84TB Enterprise SSD",
    quantityPlanned: 80,
    quantityProduced: 0,
    workCenter: "Assembly Cell B",
    startDate: "Sep 8, 2026",
    dueDate: "Sep 19, 2026",
    status: "Planned",
    inspectedQty: 0,
    passedQty: 0,
    failedQty: 0,
    disposition: "Pending",
    inspector: "",
    qualityHold: false,
    createdDate: "Sep 2, 2026",
  },
];

export function getProductionOrders(): ProductionOrder[] {
  const saved = loadData<ProductionOrder[]>(STORAGE_KEY, seed);

  if (!Array.isArray(saved) || saved.length === 0) {
    return seed;
  }

  return saved;
}

export function saveProductionOrders(orders: ProductionOrder[]): void {
  saveData(STORAGE_KEY, orders);
}

export function generateMONumber(orders: ProductionOrder[]): string {
  const year = new Date().getFullYear();

  const numbers = orders
    .map((order) => {
      const match = order.id.match(/MO-\d{4}-(\d+)/);
      return match ? Number(match[1]) : 0;
    })
    .filter((n) => !Number.isNaN(n));

  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

  return `MO-${year}-${String(next).padStart(3, "0")}`;
}

export function firstPassYield(order: ProductionOrder): number {
  if (order.inspectedQty <= 0) {
    return 0;
  }

  return (order.passedQty / order.inspectedQty) * 100;
}

export function defectRate(order: ProductionOrder): number {
  if (order.inspectedQty <= 0) {
    return 0;
  }

  return (order.failedQty / order.inspectedQty) * 100;
}

export function completion(order: ProductionOrder): number {
  if (order.quantityPlanned <= 0) {
    return 0;
  }

  return Math.min(
    100,
    (order.quantityProduced / order.quantityPlanned) * 100
  );
}
