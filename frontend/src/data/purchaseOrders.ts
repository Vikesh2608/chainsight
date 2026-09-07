export type POStatus =
  | "Draft"
  | "Pending Approval"
  | "Approved"
  | "Ordered"
  | "In Transit"
  | "Received";

export type PurchaseOrder = {
  poNumber: string;
  sku: string;
  product: string;
  supplier: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  leadTime: number;
  expectedDelivery: string;
  status: POStatus;
  createdDate: string;
};

/*
 * Must match the key the Purchase Orders page reads through
 * `loadData("purchaseOrders", ...)` in data/storage.ts, i.e.
 * the "chainsight_" prefix + "purchaseOrders". Previously this
 * was "chainsight_purchase_orders", so POs created from the
 * dashboard / demand forecast never showed on that page.
 */
const STORAGE_KEY = "chainsight_purchaseOrders";

const initialPurchaseOrders: PurchaseOrder[] = [
  {
    poNumber: "PO-2026-001",
    sku: "GPU-2048",
    product: "AI GPU Accelerator",
    supplier: "NVIDIA Supply",
    quantity: 24,
    unitCost: 4200,
    totalCost: 100800,
    leadTime: 14,
    expectedDelivery: "Aug 27, 2026",
    status: "Pending Approval",
    createdDate: "Aug 13, 2026",
  },

  {
    poNumber: "PO-2026-002",
    sku: "CPU-X900",
    product: "Server CPU",
    supplier: "Advanced Components",
    quantity: 20,
    unitCost: 1800,
    totalCost: 36000,
    leadTime: 10,
    expectedDelivery: "Aug 23, 2026",
    status: "Approved",
    createdDate: "Aug 10, 2026",
  },

  {
    poNumber: "PO-2026-003",
    sku: "RETIMER-G5",
    product: "PCIe Gen5 Retimer",
    supplier: "Signal Technologies",
    quantity: 28,
    unitCost: 275,
    totalCost: 7700,
    leadTime: 18,
    expectedDelivery: "Aug 31, 2026",
    status: "In Transit",
    createdDate: "Aug 5, 2026",
  },
];

/**
 * Get all purchase orders.
 *
 * Uses browser localStorage so the application
 * can share purchase orders between pages.
 */
export function getPurchaseOrders(): PurchaseOrder[] {
  if (typeof window === "undefined") {
    return initialPurchaseOrders;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(initialPurchaseOrders)
      );

      return initialPurchaseOrders;
    }

    return JSON.parse(stored) as PurchaseOrder[];
  } catch (error) {
    console.error("Unable to load purchase orders:", error);

    return initialPurchaseOrders;
  }
}

/**
 * Save purchase orders.
 */
export function savePurchaseOrders(
  orders: PurchaseOrder[]
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(orders)
    );
  } catch (error) {
    console.error("Unable to save purchase orders:", error);
  }
}

/**
 * Generate the next PO number.
 */
export function generatePONumber(
  orders: PurchaseOrder[]
): string {
  const year = new Date().getFullYear();

  const numbers = orders
    .map((order) => {
      const match = order.poNumber.match(/PO-\d{4}-(\d+)/);

      return match ? Number(match[1]) : 0;
    })
    .filter((number) => !Number.isNaN(number));

  const nextNumber =
    numbers.length > 0
      ? Math.max(...numbers) + 1
      : 1;

  return `PO-${year}-${String(nextNumber).padStart(3, "0")}`;
}

/**
 * Create a new purchase order.
 */
export function createPurchaseOrder(
  input: Omit<
    PurchaseOrder,
    "poNumber" | "createdDate"
  >
): PurchaseOrder {
  const existingOrders = getPurchaseOrders();

  const newOrder: PurchaseOrder = {
    ...input,
    poNumber: generatePONumber(existingOrders),
    createdDate: new Date().toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    ),
  };

  const updatedOrders = [
    ...existingOrders,
    newOrder,
  ];

  savePurchaseOrders(updatedOrders);

  return newOrder;
}

/**
 * Update the status of a purchase order.
 */
export function updatePurchaseOrderStatus(
  poNumber: string,
  status: POStatus
): PurchaseOrder[] {
  const orders = getPurchaseOrders();

  const updatedOrders = orders.map((order) =>
    order.poNumber === poNumber
      ? {
          ...order,
          status,
        }
      : order
  );

  savePurchaseOrders(updatedOrders);

  return updatedOrders;
}

/**
 * Delete a purchase order.
 */
export function deletePurchaseOrder(
  poNumber: string
): PurchaseOrder[] {
  const orders = getPurchaseOrders();

  const updatedOrders = orders.filter(
    (order) => order.poNumber !== poNumber
  );

  savePurchaseOrders(updatedOrders);

  return updatedOrders;
}

/**
 * Clear all locally stored purchase orders.
 *
 * Useful during development/testing.
 */
export function resetPurchaseOrders(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}