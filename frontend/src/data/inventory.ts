import { loadData } from "./storage";

export type InventoryItem = {
  sku: string;
  name: string;
  category: string;
  stock: number;
  forecast30: number;
  reorderPoint: number;
  leadTime: number;
  unitCost: number;
  supplier: string;
};

/*
 * Seed inventory.
 *
 * Used the first time a user opens ChainSight, before anything
 * has been saved to localStorage. Kept in sync with the seed
 * used on the Inventory page.
 */
export const seedInventory: InventoryItem[] = [
  {
    sku: "GPU-2048",
    name: "AI GPU Accelerator",
    category: "AI Infrastructure",
    stock: 18,
    forecast30: 42,
    reorderPoint: 30,
    supplier: "NVIDIA Supply",
    leadTime: 14,
    unitCost: 4200,
  },
  {
    sku: "CPU-X900",
    name: "Server CPU",
    category: "Server Components",
    stock: 32,
    forecast30: 51,
    reorderPoint: 40,
    supplier: "Advanced Components",
    leadTime: 10,
    unitCost: 1800,
  },
  {
    sku: "MEM-DDR5-64",
    name: "64GB DDR5 Memory",
    category: "Memory",
    stock: 74,
    forecast30: 88,
    reorderPoint: 55,
    supplier: "Memory Systems",
    leadTime: 7,
    unitCost: 320,
  },
  {
    sku: "NIC-CX7",
    name: "ConnectX-7 Network Adapter",
    category: "Networking",
    stock: 124,
    forecast30: 119,
    reorderPoint: 80,
    supplier: "Network Hardware",
    leadTime: 12,
    unitCost: 850,
  },
  {
    sku: "SSD-3.84T",
    name: "3.84TB Enterprise SSD",
    category: "Storage",
    stock: 46,
    forecast30: 62,
    reorderPoint: 50,
    supplier: "Enterprise Storage",
    leadTime: 9,
    unitCost: 650,
  },
  {
    sku: "RETIMER-G5",
    name: "PCIe Gen5 Retimer",
    category: "PCIe Components",
    stock: 21,
    forecast30: 35,
    reorderPoint: 28,
    supplier: "Signal Technologies",
    leadTime: 18,
    unitCost: 275,
  },
];

/*
 * Load the inventory a manager is actually looking at:
 * whatever is saved in localStorage, falling back to the seed.
 */
export function loadInventory(): InventoryItem[] {
  const saved = loadData<InventoryItem[]>("inventory", seedInventory);

  if (!Array.isArray(saved) || saved.length === 0) {
    return seedInventory;
  }

  return saved;
}
