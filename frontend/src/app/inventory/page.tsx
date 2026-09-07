"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { loadData, saveData } from "../../data/storage";
import { StockVsForecastChart } from "../_components/charts";
import {
  createPurchaseOrder as createPurchaseOrderRecord,
} from "../../data/purchaseOrders";

type InventoryItem = {
  sku: string;
  name: string;
  category: string;
  stock: number;
  forecast30: number;
  reorderPoint: number;
  supplier: string;
  leadTime: number;
  unitCost: number;
};

type SupplierOption = {
  name: string;
  score: number;
  onTimeDelivery: number;
  qualityScore: number;
  defectRate: number;
  leadTime: number;
  unitCost: number;
  risk: "Low" | "Medium" | "High";
};

const supplierOptions: Record<string, SupplierOption[]> = {
  "GPU-2048": [
    {
      name: "NVIDIA Supply",
      score: 93.5,
      onTimeDelivery: 96.4,
      qualityScore: 98.2,
      defectRate: 1.8,
      leadTime: 14,
      unitCost: 4200,
      risk: "Low",
    },
    {
      name: "AI Hardware Partners",
      score: 89.7,
      onTimeDelivery: 92.8,
      qualityScore: 95.4,
      defectRate: 3.2,
      leadTime: 11,
      unitCost: 4350,
      risk: "Medium",
    },
  ],

  "CPU-X900": [
    {
      name: "Advanced Components",
      score: 91.1,
      onTimeDelivery: 93.1,
      qualityScore: 96.7,
      defectRate: 3.3,
      leadTime: 10,
      unitCost: 1800,
      risk: "Medium",
    },
    {
      name: "Processor Systems",
      score: 94.2,
      onTimeDelivery: 96.8,
      qualityScore: 97.8,
      defectRate: 2.2,
      leadTime: 12,
      unitCost: 1850,
      risk: "Low",
    },
  ],

  "MEM-DDR5-64": [
    {
      name: "Memory Systems",
      score: 96.6,
      onTimeDelivery: 97.8,
      qualityScore: 99.1,
      defectRate: 0.9,
      leadTime: 7,
      unitCost: 320,
      risk: "Low",
    },
  ],

  "NIC-CX7": [
    {
      name: "Network Hardware",
      score: 87.6,
      onTimeDelivery: 91.6,
      qualityScore: 94.8,
      defectRate: 5.2,
      leadTime: 12,
      unitCost: 850,
      risk: "Medium",
    },
  ],

  "SSD-3.84T": [
    {
      name: "Enterprise Storage",
      score: 93.0,
      onTimeDelivery: 95.2,
      qualityScore: 97.4,
      defectRate: 2.6,
      leadTime: 9,
      unitCost: 650,
      risk: "Low",
    },
  ],

  "RETIMER-G5": [
    {
      name: "Signal Technologies",
      score: 81.7,
      onTimeDelivery: 88.4,
      qualityScore: 92.1,
      defectRate: 7.9,
      leadTime: 18,
      unitCost: 275,
      risk: "High",
    },
    {
      name: "PCIe Components Group",
      score: 90.8,
      onTimeDelivery: 94.5,
      qualityScore: 96.2,
      defectRate: 2.8,
      leadTime: 13,
      unitCost: 290,
      risk: "Medium",
    },
  ],
};

type PurchaseOrderStatus =
  | "Draft"
  | "Approved"
  | "Ordered"
  | "Received";

type PurchaseOrder = {
  id: string;
  sku: string;
  product: string;
  supplier: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  leadTime: number;
  expectedDelivery: string;
  status: PurchaseOrderStatus;
  createdAt: string;
};

const inventoryData: InventoryItem[] = [
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

function getRisk(item: InventoryItem): "High" | "Medium" | "Low" {
  if (item.stock < item.reorderPoint) {
    return "High";
  }

  if (item.stock < item.forecast30) {
    return "Medium";
  }

  return "Low";
}

function getRecommendedQuantity(item: InventoryItem) {
  return Math.max(
    item.forecast30 - item.stock,
    item.reorderPoint - item.stock
  );
}

export default function InventoryPage() {
  const [search, setSearch] = useState("");
const [riskFilter, setRiskFilter] = useState("All");

const [inventory, setInventory] =
  useState<InventoryItem[]>(inventoryData);

const [inventoryLoaded, setInventoryLoaded] =
  useState(false);

useEffect(() => {
  const loadInventory = () => {
    const savedInventory =
      loadData<InventoryItem[]>(
        "inventory",
        inventoryData
      );

      

    setInventory(savedInventory);
    setInventoryLoaded(true);
  };

  // Load inventory when page opens
  loadInventory();

  // Listen for inventory updates from Purchase Orders
  window.addEventListener(
    "inventory-updated",
    loadInventory
  );

  return () => {
    window.removeEventListener(
      "inventory-updated",
      loadInventory
    );
  };
}, []);

useEffect(() => {
  if (!inventoryLoaded) {
    return;
  }

  saveData("inventory", inventory);
}, [inventory, inventoryLoaded]);

  useEffect(() => {
    const handleInventoryUpdated = () => {
      const savedInventory =
        loadData<InventoryItem[]>(
          "inventory",
          inventoryData
        );

      setInventory(savedInventory);
    };

    window.addEventListener(
      "inventory-updated",
      handleInventoryUpdated
    );

    return () => {
      window.removeEventListener(
        "inventory-updated",
        handleInventoryUpdated
      );
    };
  }, []);

const [selectedItem, setSelectedItem] =
  useState<InventoryItem | null>(null);

  const [editItem, setEditItem] =
  useState<InventoryItem | null>(null);

const [showAddInventory, setShowAddInventory] =
  useState(false);

  const [newInventory, setNewInventory] =
  useState<InventoryItem>({
    sku: "",
    name: "",
    category: "",
    stock: 0,
    forecast30: 0,
    reorderPoint: 0,
    leadTime: 0,
    unitCost: 0,
    supplier: "",
  });

const [deleteItem, setDeleteItem] =
  useState<InventoryItem | null>(null);

    const [purchaseOrders, setPurchaseOrders] =
  useState<PurchaseOrder[]>([]);

const [showPurchaseOrders, setShowPurchaseOrders] =
  useState(false);


  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        item.sku.toLowerCase().includes(searchValue) ||
        item.name.toLowerCase().includes(searchValue) ||
        item.category.toLowerCase().includes(searchValue);

      const risk = getRisk(item);

      const matchesRisk =
        riskFilter === "All" || risk === riskFilter;

      return matchesSearch && matchesRisk;
    });
    }, [search, riskFilter, inventory]);

  const totalUnits = inventory.reduce(
    (sum, item) => sum + item.stock,
    0
  );

  const inventoryValue = inventory.reduce(
    (sum, item) => sum + item.stock * item.unitCost,
    0
  );

  const highRisk = inventory.filter(
    (item) => getRisk(item) === "High"
  ).length;

  const mediumRisk = inventory.filter(
    (item) => getRisk(item) === "Medium"
  ).length;

  const createPurchaseOrder = (
  item: InventoryItem,
  supplier?: SupplierOption
) => {
  const quantity = getRecommendedQuantity(item);

  if (quantity <= 0) {
    toast.message(`${item.sku} does not currently require a reorder.`);
    return;
  }

  const selectedSupplier =
    supplier ??
    supplierOptions[item.sku]?.[0] ?? {
      name: item.supplier,
      score: 0,
      onTimeDelivery: 0,
      qualityScore: 0,
      defectRate: 0,
      leadTime: item.leadTime,
      unitCost: item.unitCost,
      risk: "Medium",
    };

  const today = new Date();

  const expectedDelivery = new Date(today);

  expectedDelivery.setDate(
    expectedDelivery.getDate() +
      selectedSupplier.leadTime
  );

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const newPurchaseOrder =
    createPurchaseOrderRecord({
      sku: item.sku,
      product: item.name,
      supplier: selectedSupplier.name,
      quantity,
      unitCost: selectedSupplier.unitCost,
      totalCost:
        quantity * selectedSupplier.unitCost,
      leadTime: selectedSupplier.leadTime,
      expectedDelivery:
        formatDate(expectedDelivery),
      status: "Pending Approval",
    });

  toast.success(`Purchase Order ${newPurchaseOrder.poNumber} created`, {
    description:
      `${newPurchaseOrder.quantity} units of ${newPurchaseOrder.sku} · ` +
      `${newPurchaseOrder.supplier} · ` +
      `$${newPurchaseOrder.totalCost.toLocaleString()} · ` +
      `due ${newPurchaseOrder.expectedDelivery}`,
  });

  setSelectedItem(null);
};

const handleDeleteInventory = (sku: string) => {
  toast(`Delete ${sku} from inventory?`, {
    action: {
      label: "Delete",
      onClick: () => removeInventory(sku),
    },
  });
};

const removeInventory = (sku: string) => {
  setInventory((currentInventory) =>
    currentInventory.filter((item) => item.sku !== sku)
  );

  setDeleteItem(null);
  toast.success(`${sku} removed from inventory`);
};

const handleEditInventory = (updatedItem: InventoryItem) => {
  setInventory((currentInventory) =>
    currentInventory.map((item) =>
      item.sku === updatedItem.sku
        ? updatedItem
        : item
    )
  );

  setEditItem(null);
};



return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* HEADER */}
        <div className="mb-8">
          <p className="text-sm text-cyan-400">
            ChainSight / Inventory
          </p>

          <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-bold">
                Inventory Management
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Monitor inventory levels, demand signals,
                reorder points, supplier lead times, and
                inventory risk.
              </p>
            </div>

            <button
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
              onClick={() => setShowAddInventory(true)}
            >
              + Add Inventory
            </button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid gap-4 md:grid-cols-4">

          {/* Inventory Value */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">
              Inventory Value
            </p>

            <p className="mt-2 text-2xl font-bold">
              ${(inventoryValue / 1000000).toFixed(2)}M
            </p>

            <p className="mt-1 text-xs text-emerald-400">
              +4.8% vs previous period
            </p>
          </div>

          {/* Total Units */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">
              Total Units
            </p>

            <p className="mt-2 text-2xl font-bold">
              {totalUnits.toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Across active SKUs
            </p>
          </div>

          {/* High Risk */}
          <div className="rounded-xl border border-red-900/40 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">
              High Risk SKUs
            </p>

            <p className="mt-2 text-2xl font-bold text-red-400">
              {highRisk}
            </p>

            <p className="mt-1 text-xs text-red-400">
              Immediate attention
            </p>
          </div>

          {/* Medium Risk */}
          <div className="rounded-xl border border-yellow-900/40 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">
              Medium Risk
            </p>

            <p className="mt-2 text-2xl font-bold text-yellow-400">
              {mediumRisk}
            </p>

            <p className="mt-1 text-xs text-yellow-400">
              Monitor closely
            </p>
          </div>
        </div>

        {/* STOCK VS DEMAND CHART */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-sm font-semibold">
            Stock on hand vs. 30-day demand
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Bars where demand towers over stock are the reorder candidates
          </p>
          <div className="mt-4">
            <StockVsForecastChart
              data={inventory.map((item) => ({
                sku: item.sku,
                stock: item.stock,
                forecast: item.forecast30,
              }))}
            />
          </div>
        </div>

        {/* FILTERS */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/70 p-4">

          <div className="flex flex-col gap-4 md:flex-row">

            <input
              type="text"
              placeholder="Search SKU, product, or category..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
            />

            <select
              value={riskFilter}
              onChange={(event) =>
                setRiskFilter(event.target.value)
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="All">All Risk Levels</option>
              <option value="High">High Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="Low">Low Risk</option>
            </select>
          </div>
        </div>

        {/* INVENTORY TABLE */}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">

          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="font-semibold">
              Inventory Overview
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Current inventory compared with projected
              30-day demand
            </p>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-slate-950 text-xs uppercase text-slate-500">

                <tr>
                  <th className="px-6 py-4">
                    SKU
                  </th>

                  <th className="px-6 py-4">
                    Category
                  </th>

                  <th className="px-6 py-4">
                    Stock
                  </th>

                  <th className="px-6 py-4">
                    30D Forecast
                  </th>

                  <th className="px-6 py-4">
                    Reorder Point
                  </th>

                  <th className="px-6 py-4">
                    Lead Time
                  </th>

                  <th className="px-6 py-4">
                    Risk
                  </th>

                  <th className="px-6 py-4">
                    Action
                  </th>
                </tr>

              </thead>

              <tbody>
  {filteredInventory.map((item) => {
    const risk = getRisk(item);

    return (
      <tr
        key={item.sku}
        className="border-t border-slate-800 hover:bg-slate-800/40"
      >
        {/* SKU */}
        <td className="px-6 py-5">
          <div className="font-semibold text-white">
            {item.sku}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            {item.name}
          </div>
        </td>

        {/* CATEGORY */}
        <td className="px-6 py-5 text-slate-400">
          {item.category}
        </td>

        {/* STOCK */}
        <td className="px-6 py-5 font-semibold">
          {item.stock}
        </td>

        {/* FORECAST */}
        <td className="px-6 py-5 text-slate-300">
          {item.forecast30}
        </td>

        {/* REORDER POINT */}
        <td className="px-6 py-5 text-slate-300">
          {item.reorderPoint}
        </td>

        {/* LEAD TIME */}
        <td className="px-6 py-5">
          {item.leadTime} days
        </td>

        {/* RISK */}
        <td className="px-6 py-5">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              risk === "High"
                ? "bg-red-500/10 text-red-400"
                : risk === "Medium"
                ? "bg-yellow-500/10 text-yellow-400"
                : "bg-emerald-500/10 text-emerald-400"
            }`}
          >
            {risk}
          </span>
        </td>

        {/* ACTION */}
        <td className="px-6 py-5">
          <div className="flex items-center gap-2">

            {/* REORDER / VIEW */}
            {risk === "High" ? (
              <button
                onClick={() => setSelectedItem(item)}
                className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                Reorder
              </button>
            ) : (
              <button
                onClick={() => setSelectedItem(item)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                View
              </button>
            )}

            {/* EDIT */}
            <button
              onClick={() => setEditItem(item)}
              className="rounded-md bg-yellow-600/10 px-3 py-2 text-xs font-semibold text-yellow-400 hover:bg-yellow-600 hover:text-white"
            >
              Edit
            </button>

            {/* DELETE */}
            <button
              onClick={() => handleDeleteInventory(item.sku)}
              className="rounded-md bg-red-600/10 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-600 hover:text-white"
            >
              Delete
            </button>

          </div>
        </td>
      </tr>
    );
  })}
</tbody>
            </table>

          </div>

          {/* NO RESULTS */}
          {filteredInventory.length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              No inventory items match your search.
            </div>
          )}

        </div>

      </div>

      {/* ===================================================== */}
      {/* REORDER RECOMMENDATION MODAL                         */}
      {/* ===================================================== */}

      {selectedItem && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">

          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">

            {/* MODAL HEADER */}
            <div className="flex items-start justify-between">

              <div>

                <p className="text-sm font-medium text-cyan-400">
                  ChainSight AI
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  Reorder Recommendation
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  {selectedItem.sku} — {selectedItem.name}
                </p>

              </div>

              <button
                onClick={() =>
                  setSelectedItem(null)
                }
                className="rounded-lg px-3 py-1 text-2xl text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close"
              >
                ×
              </button>

            </div>

            {/* METRICS */}
            <div className="mt-6 grid grid-cols-2 gap-3">

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">

                <p className="text-xs text-slate-500">
                  Current Stock
                </p>

                <p className="mt-1 text-xl font-bold">
                  {selectedItem.stock} units
                </p>

              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">

                <p className="text-xs text-slate-500">
                  30-Day Forecast
                </p>

                <p className="mt-1 text-xl font-bold">
                  {selectedItem.forecast30} units
                </p>

              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">

                <p className="text-xs text-slate-500">
                  Reorder Point
                </p>

                <p className="mt-1 text-xl font-bold">
                  {selectedItem.reorderPoint} units
                </p>

              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">

                <p className="text-xs text-slate-500">
                  Supplier Lead Time
                </p>

                <p className="mt-1 text-xl font-bold">
                  {selectedItem.leadTime} days
                </p>

              </div>

            </div>

            {/* RISK */}
            <div className="mt-5 rounded-lg border border-red-900/50 bg-red-500/5 p-4">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-xs text-slate-500">
                    Inventory Risk
                  </p>

                  <p className="mt-1 font-semibold text-red-400">
                    High Risk
                  </p>
                </div>

                <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
                  STOCKOUT RISK
                </span>

              </div>

            </div>

            {/* RECOMMENDATION */}
            <div className="mt-5 rounded-lg border border-blue-900/50 bg-blue-500/5 p-5">

              <p className="text-xs uppercase tracking-wide text-blue-400">
                Recommended Order Quantity
              </p>

              <p className="mt-2 text-4xl font-bold text-white">
                {getRecommendedQuantity(selectedItem)}
                <span className="ml-2 text-lg font-medium text-slate-400">
                  units
                </span>
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Projected 30-day demand is{" "}
                <strong className="text-slate-300">
                  {selectedItem.forecast30} units
                </strong>
                , while current inventory is only{" "}
                <strong className="text-slate-300">
                  {selectedItem.stock} units
                </strong>
                . The supplier lead time is{" "}
                <strong className="text-slate-300">
                  {selectedItem.leadTime} days
                </strong>
                , creating a potential stockout risk.
              </p>

            </div>

            {/* SUPPLIER */}
            <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950 p-4">

              <p className="text-xs text-slate-500">
                Preferred Supplier
              </p>

              <p className="mt-1 text-sm font-semibold">
                {selectedItem.supplier}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Unit Cost: $
                {selectedItem.unitCost.toLocaleString()}
              </p>

            </div>

            {/* ACTION BUTTONS */}
            <div className="mt-6 flex gap-3">

              <button
                onClick={() =>
                  setSelectedItem(null)
                }
                className="flex-1 rounded-lg border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={() => {
  if (selectedItem) {
    createPurchaseOrder(selectedItem);
  }
}}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Create Purchase Order
              </button>

            </div>

          </div>

        </div>

            )}

      {/* DELETE INVENTORY MODAL */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">

          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">

            <p className="text-sm font-medium text-red-400">
              Delete Inventory
            </p>

            <h2 className="mt-2 text-xl font-bold text-white">
              Delete {deleteItem.sku}?
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              This will remove{" "}
              <span className="font-semibold text-white">
                {deleteItem.name}
              </span>{" "}
              from the current inventory view.
            </p>

            <div className="mt-6 flex gap-3">

              <button
                onClick={() => setDeleteItem(null)}
                className="flex-1 rounded-lg border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={() =>
                  handleDeleteInventory(deleteItem.sku)
                }
                className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500"
              >
                Delete
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ADD INVENTORY MODAL */}
{showAddInventory && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">

    <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">

      {/* MODAL HEADER */}
      <div className="mb-6 flex items-center justify-between">

        <div>
          <p className="text-sm text-cyan-400">
            ChainSight Inventory
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            Add Inventory
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Add a new inventory item to your supply chain.
          </p>
        </div>

        <button
          onClick={() => setShowAddInventory(false)}
          className="text-2xl text-slate-400 hover:text-white"
        >
          ×
        </button>

      </div>

      {/* FORM */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* SKU */}
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            SKU
          </label>

          <input
            value={newInventory.sku}
            onChange={(e) =>
              setNewInventory({
                ...newInventory,
                sku: e.target.value,
              })
            }
            placeholder="GPU-2048"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* PRODUCT NAME */}
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            Product Name
          </label>

          <input
            value={newInventory.name}
            onChange={(e) =>
              setNewInventory({
                ...newInventory,
                name: e.target.value,
              })
            }
            placeholder="AI GPU Accelerator"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* CATEGORY */}
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            Category
          </label>

          <input
            value={newInventory.category}
            onChange={(e) =>
              setNewInventory({
                ...newInventory,
                category: e.target.value,
              })
            }
            placeholder="AI Infrastructure"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* SUPPLIER */}
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            Supplier
          </label>

          <input
            value={newInventory.supplier}
            onChange={(e) =>
              setNewInventory({
                ...newInventory,
                supplier: e.target.value,
              })
            }
            placeholder="NVIDIA Supply"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* STOCK */}
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            Current Stock
          </label>

          <input
            type="number"
            value={newInventory.stock}
            onChange={(e) =>
              setNewInventory({
                ...newInventory,
                stock: Number(e.target.value),
              })
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* FORECAST */}
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            30-Day Forecast
          </label>

          <input
            type="number"
            value={newInventory.forecast30}
            onChange={(e) =>
              setNewInventory({
                ...newInventory,
                forecast30: Number(e.target.value),
              })
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* REORDER POINT */}
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            Reorder Point
          </label>

          <input
            type="number"
            value={newInventory.reorderPoint}
            onChange={(e) =>
              setNewInventory({
                ...newInventory,
                reorderPoint: Number(e.target.value),
              })
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* LEAD TIME */}
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            Lead Time (days)
          </label>

          <input
            type="number"
            value={newInventory.leadTime}
            onChange={(e) =>
              setNewInventory({
                ...newInventory,
                leadTime: Number(e.target.value),
              })
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* UNIT COST */}
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            Unit Cost ($)
          </label>

          <input
            type="number"
            value={newInventory.unitCost}
            onChange={(e) =>
              setNewInventory({
                ...newInventory,
                unitCost: Number(e.target.value),
              })
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

      </div>

      {/* ACTIONS */}
      <div className="mt-6 flex justify-end gap-3">

        <button
          onClick={() => setShowAddInventory(false)}
          className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800"
        >
          Cancel
        </button>

        <button
          onClick={() => {

            if (
              !newInventory.sku.trim() ||
              !newInventory.name.trim() ||
              !newInventory.category.trim()
            ) {
              toast.error("Enter SKU, product name and category.");
              return;
            }

            const duplicate = inventory.some(
              (item) =>
                item.sku.toLowerCase() ===
                newInventory.sku.trim().toLowerCase()
            );

            if (duplicate) {
              toast.error(`SKU ${newInventory.sku} already exists.`);
              return;
            }

            setInventory((currentInventory) => [
              ...currentInventory,
              {
                ...newInventory,
                sku: newInventory.sku.trim(),
                name: newInventory.name.trim(),
                category: newInventory.category.trim(),
                supplier: newInventory.supplier.trim(),
              },
            ]);

            setNewInventory({
              sku: "",
              name: "",
              category: "",
              stock: 0,
              forecast30: 0,
              reorderPoint: 0,
              leadTime: 0,
              unitCost: 0,
              supplier: "",
            });

            setShowAddInventory(false);

          }}
          className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
        >
          Add Inventory
        </button>

      </div>

    </div>

    </div>
)}

{/* EDIT INVENTORY MODAL */}
{editItem && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">

    <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">

      {/* HEADER */}
      <div className="mb-6 flex items-center justify-between">

        <div>
          <p className="text-sm text-cyan-400">
            ChainSight Inventory
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            Edit Inventory
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Update inventory, supplier, demand, pricing, and lead time.
          </p>
        </div>

        <button
          onClick={() => setEditItem(null)}
          className="text-2xl text-slate-400 hover:text-white"
        >
          ×
        </button>

      </div>

      {/* FORM */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* SKU */}
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            SKU
          </label>

          <input
            value={editItem.sku}
            onChange={(e) =>
              setEditItem({
                ...editItem,
                sku: e.target.value,
              })
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* PRODUCT NAME */}
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            Product Name
          </label>

          <input
            value={editItem.name}
            onChange={(e) =>
              setEditItem({
                ...editItem,
                name: e.target.value,
              })
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* CATEGORY */}
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            Category
          </label>

          <input
            value={editItem.category}
            onChange={(e) =>
              setEditItem({
                ...editItem,
                category: e.target.value,
              })
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* SUPPLIER */}
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            Supplier
          </label>

          <input
            value={editItem.supplier}
            onChange={(e) =>
              setEditItem({
                ...editItem,
                supplier: e.target.value,
              })
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* CURRENT STOCK */}
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            Current Stock
          </label>

          <input
            type="number"
            value={editItem.stock}
            onChange={(e) =>
              setEditItem({
                ...editItem,
                stock: Number(e.target.value),
              })
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* FORECAST */}
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            30-Day Forecast
          </label>

          <input
            type="number"
            value={editItem.forecast30}
            onChange={(e) =>
              setEditItem({
                ...editItem,
                forecast30: Number(e.target.value),
              })
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* REORDER POINT */}
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            Reorder Point
          </label>

          <input
            type="number"
            value={editItem.reorderPoint}
            onChange={(e) =>
              setEditItem({
                ...editItem,
                reorderPoint: Number(e.target.value),
              })
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* LEAD TIME */}
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            Lead Time (days)
          </label>

          <input
            type="number"
            value={editItem.leadTime}
            onChange={(e) =>
              setEditItem({
                ...editItem,
                leadTime: Number(e.target.value),
              })
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* UNIT COST */}
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            Unit Cost ($)
          </label>

          <input
            type="number"
            value={editItem.unitCost}
            onChange={(e) =>
              setEditItem({
                ...editItem,
                unitCost: Number(e.target.value),
              })
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />
        </div>

      </div>

      {/* ACTIONS */}
      <div className="mt-6 flex justify-end gap-3">

        <button
          onClick={() => setEditItem(null)}
          className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800"
        >
          Cancel
        </button>

        <button
          onClick={() => {
            if (
              !editItem.sku.trim() ||
              !editItem.name.trim() ||
              !editItem.category.trim()
            ) {
              toast.error("Enter SKU, product name and category.");
              return;
            }

            handleEditInventory({
              ...editItem,
              sku: editItem.sku.trim(),
              name: editItem.name.trim(),
              category: editItem.category.trim(),
              supplier: editItem.supplier.trim(),
            });
          }}
          className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
        >
          Save Changes
        </button>

      </div>

    </div>

              </div>
    
        )}
      </main>
    );
}