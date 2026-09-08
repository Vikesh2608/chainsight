"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  loadData,
  saveData,
} from "@/data/storage";
import { exportWorkbook } from "@/lib/exportData";

import type {
  PurchaseOrder,
  POStatus,
} from "../../data/purchaseOrders";

type InventoryItem = {
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

const emptyPO: PurchaseOrder = {
  poNumber: "",
  sku: "",
  product: "",
  supplier: "",
  quantity: 0,
  unitCost: 0,
  totalCost: 0,
  leadTime: 0,
  expectedDelivery: "",
  status: "Draft",
  createdDate: "",
};

function statusClasses(status: POStatus) {
  switch (status) {
    case "Draft":
      return "bg-slate-800 text-slate-300";

    case "Pending Approval":
      return "bg-yellow-500/10 text-yellow-400";

    case "Approved":
      return "bg-blue-500/10 text-blue-400";

    case "Ordered":
      return "bg-purple-500/10 text-purple-400";

    case "In Transit":
      return "bg-cyan-500/10 text-cyan-400";

    case "Received":
      return "bg-emerald-500/10 text-emerald-400";

    default:
      return "bg-slate-800 text-slate-300";
  }
}

function generatePONumber(orders: PurchaseOrder[]) {
  const year = new Date().getFullYear();

  const numbers = orders
    .map((po) => {
      const match = po.poNumber.match(/PO-\d{4}-(\d+)/);
      return match ? Number(match[1]) : 0;
    })
    .filter((number) => !Number.isNaN(number));

  const nextNumber =
    numbers.length > 0
      ? Math.max(...numbers) + 1
      : 1;

  return `PO-${year}-${String(nextNumber).padStart(3, "0")}`;
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] =
    useState<PurchaseOrder[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedPO, setSelectedPO] =
    useState<PurchaseOrder | null>(null);

  const [showCreatePO, setShowCreatePO] =
    useState(false);

  const [editPO, setEditPO] =
    useState<PurchaseOrder | null>(null);

  /* LOAD PURCHASE ORDERS */

const [purchaseOrdersLoaded, setPurchaseOrdersLoaded] =
  useState(false);

useEffect(() => {
  const orders = loadData<PurchaseOrder[]>(
    "purchaseOrders",
    []
  );

  setPurchaseOrders(orders);
  setPurchaseOrdersLoaded(true);
}, []);

/* SAVE PURCHASE ORDERS */

useEffect(() => {
  if (!purchaseOrdersLoaded) {
    return;
  }

  saveData(
    "purchaseOrders",
    purchaseOrders
  );
}, [
  purchaseOrders,
  purchaseOrdersLoaded,
]);

  /* FILTER */

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        po.poNumber.toLowerCase().includes(searchValue) ||
        po.sku.toLowerCase().includes(searchValue) ||
        po.product.toLowerCase().includes(searchValue) ||
        po.supplier.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "All" ||
        po.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [
    purchaseOrders,
    search,
    statusFilter,
  ]);

  /* KPI */

  const totalPOValue = purchaseOrders.reduce(
    (sum, po) => sum + po.totalCost,
    0
  );

  const pendingApproval =
    purchaseOrders.filter(
      (po) => po.status === "Pending Approval"
    ).length;

  const inTransit =
    purchaseOrders.filter(
      (po) => po.status === "In Transit"
    ).length;

  const received =
    purchaseOrders.filter(
      (po) => po.status === "Received"
    ).length;

  /* UPDATE STATUS */

  function updateStatus(
    poNumber: string,
    newStatus: POStatus
  ) {
    setPurchaseOrders((currentOrders) =>
      currentOrders.map((po) =>
        po.poNumber === poNumber
          ? {
              ...po,
              status: newStatus,
            }
          : po
      )
    );

    setSelectedPO((currentPO) =>
      currentPO?.poNumber === poNumber
        ? {
            ...currentPO,
            status: newStatus,
          }
        : currentPO
    );
  }

  /* CREATE PO */

  function handleCreatePO() {
    if (
      !newPO.sku.trim() ||
      !newPO.product.trim() ||
      !newPO.supplier.trim()
    ) {
      toast.error("Enter SKU, product and supplier.");
      return;
    }

    if (newPO.quantity <= 0) {
      toast.error("Quantity must be greater than 0.");
      return;
    }

    if (newPO.unitCost < 0) {
      toast.error("Unit cost cannot be negative.");
      return;
    }

    const order: PurchaseOrder = {
      ...newPO,
      poNumber: generatePONumber(
        purchaseOrders
      ),
      totalCost:
        newPO.quantity * newPO.unitCost,
      status: "Draft",
      createdDate:
        new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
    };

    setPurchaseOrders((currentOrders) => [
      ...currentOrders,
      order,
    ]);

    setNewPO({
      ...emptyPO,
    });

    setShowCreatePO(false);

    toast.success(`${order.poNumber} created`);
  }

  /* EDIT PO */

  function handleEditPO(updatedPO: PurchaseOrder) {
    const updatedOrder = {
      ...updatedPO,
      totalCost:
        updatedPO.quantity *
        updatedPO.unitCost,
    };

    setPurchaseOrders((currentOrders) =>
      currentOrders.map((po) =>
        po.poNumber === updatedOrder.poNumber
          ? updatedOrder
          : po
      )
    );

    setSelectedPO(updatedOrder);
    setEditPO(null);
  }

  /* DELETE PO */

  function handleDeletePO(poNumber: string) {
    toast(`Delete ${poNumber}?`, {
      action: {
        label: "Delete",
        onClick: () => {
          setPurchaseOrders((currentOrders) =>
            currentOrders.filter((po) => po.poNumber !== poNumber)
          );

          setSelectedPO(null);
          setEditPO(null);
          toast.success(`${poNumber} deleted`);
        },
      },
    });
  }

  /* RECEIVE PO */

  /* RECEIVE PO */

function receivePurchaseOrder(po: PurchaseOrder) {
  if (po.status === "Received") {
    toast.message(`${po.poNumber} has already been received.`);
    return;
  }

  toast(`Receive ${po.quantity} units of ${po.sku}?`, {
    action: {
      label: "Receive",
      onClick: () => doReceivePurchaseOrder(po),
    },
  });
}

function doReceivePurchaseOrder(po: PurchaseOrder) {
  try {
    // Load inventory using ChainSight storage
    const inventory = loadData<InventoryItem[]>(
      "inventory",
      []
    );

    const existingIndex = inventory.findIndex(
      (item) => item.sku === po.sku
    );

    let updatedInventory: InventoryItem[];

    if (existingIndex >= 0) {
      // Existing material → increase stock
      updatedInventory = [...inventory];

      updatedInventory[existingIndex] = {
        ...updatedInventory[existingIndex],

        stock:
          updatedInventory[existingIndex].stock +
          po.quantity,

        unitCost: po.unitCost,
        supplier: po.supplier,
        leadTime: po.leadTime,
      };
    } else {
      // New material → create inventory record
      const newInventoryItem: InventoryItem = {
        sku: po.sku,
        name: po.product,
        category: "Imported",

        stock: po.quantity,

        forecast30: 0,
        reorderPoint: 0,

        leadTime: po.leadTime,
        unitCost: po.unitCost,
        supplier: po.supplier,
      };

      updatedInventory = [
        ...inventory,
        newInventoryItem,
      ];
    }

    // IMPORTANT:
    // Save using ChainSight storage prefix:
    // chainsight_inventory
    saveData(
      "inventory",
      updatedInventory
    );

    // Update PO status
    updateStatus(
      po.poNumber,
      "Received"
    );

    // Save updated PO list
    saveData(
      "purchaseOrders",
      purchaseOrders.map((currentPO) =>
        currentPO.poNumber === po.poNumber
          ? {
              ...currentPO,
              status: "Received",
            }
          : currentPO
      )
    );

    window.dispatchEvent(new Event("inventory-updated"));

    toast.success(`${po.poNumber} received`, {
      description: `${po.quantity} units of ${po.sku} added to inventory.`,
    });

  } catch (error) {
    console.error("Inventory update failed:", error);

    toast.error("Could not receive the purchase order", {
      description: "Inventory could not be updated.",
    });
  }
}
  const [newPO, setNewPO] =
    useState<PurchaseOrder>({
      ...emptyPO,
    });

  return (
    <main className="min-h-screen bg-[#020617] text-white">

      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* HEADER */}

        <div className="mb-8">

          <div className="mb-2 text-sm text-cyan-400">
            ChainSight / Procurement
          </div>

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">

            <div>

              <h1 className="text-4xl font-bold">
                Purchase Orders
              </h1>

              <p className="mt-2 text-slate-400">
                Manage procurement activity,
                supplier orders, approvals and
                expected deliveries.
              </p>

            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  exportWorkbook("chainsight-purchase-orders", [
                    {
                      name: "Purchase Orders",
                      rows: purchaseOrders.map((po) => ({
                        "PO Number": po.poNumber,
                        SKU: po.sku,
                        Product: po.product,
                        Supplier: po.supplier,
                        Quantity: po.quantity,
                        "Unit cost": po.unitCost,
                        "Total cost": po.totalCost,
                        "Lead time (days)": po.leadTime,
                        "Expected delivery": po.expectedDelivery,
                        Status: po.status,
                        Created: po.createdDate,
                      })),
                    },
                  ]);
                  toast.success("Purchase orders exported to Excel");
                }}
                className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              >
                Export
              </button>

              <button
                onClick={() => {
                  setNewPO({
                    ...emptyPO,
                    poNumber: generatePONumber(purchaseOrders),
                  });

                  setShowCreatePO(true);
                }}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
              >
                + Create Purchase Order
              </button>
            </div>

          </div>

        </div>

        {/* KPI CARDS */}

        <div className="grid gap-4 md:grid-cols-4">

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">

            <p className="text-sm text-slate-400">
              Purchase Order Value
            </p>

            <p className="mt-3 text-3xl font-bold">
              $
              {(totalPOValue / 1000).toFixed(
                1
              )}
              K
            </p>

            <p className="mt-2 text-sm text-emerald-400">
              Active procurement
            </p>

          </div>

          <div className="rounded-xl border border-yellow-500/20 bg-slate-900/70 p-5">

            <p className="text-sm text-slate-400">
              Pending Approval
            </p>

            <p className="mt-3 text-3xl font-bold text-yellow-400">
              {pendingApproval}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Require action
            </p>

          </div>

          <div className="rounded-xl border border-cyan-500/20 bg-slate-900/70 p-5">

            <p className="text-sm text-slate-400">
              In Transit
            </p>

            <p className="mt-3 text-3xl font-bold text-cyan-400">
              {inTransit}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Supplier shipments
            </p>

          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-slate-900/70 p-5">

            <p className="text-sm text-slate-400">
              Received
            </p>

            <p className="mt-3 text-3xl font-bold text-emerald-400">
              {received}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Completed orders
            </p>

          </div>

        </div>

        {/* SEARCH */}

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/70 p-4">

          <div className="flex flex-col gap-4 md:flex-row">

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search PO, SKU, product, or supplier..."
              className="flex-1 rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm text-white outline-none"
            >

              <option value="All">
                All Statuses
              </option>

              <option value="Draft">
                Draft
              </option>

              <option value="Pending Approval">
                Pending Approval
              </option>

              <option value="Approved">
                Approved
              </option>

              <option value="Ordered">
                Ordered
              </option>

              <option value="In Transit">
                In Transit
              </option>

              <option value="Received">
                Received
              </option>

            </select>

          </div>

        </div>

        {/* TABLE */}

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">

          <div className="border-b border-slate-800 p-6">

            <h2 className="text-xl font-semibold">
              Purchase Order Register
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Track procurement lifecycle from
              approval through delivery.
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left">

              <thead className="border-b border-slate-800 bg-[#020617]">

                <tr>

                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">
                    PO
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">
                    Item
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">
                    Supplier
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">
                    Quantity
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">
                    Total
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">
                    Delivery
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredOrders.map((po) => (

                  <tr
                    key={po.poNumber}
                    className="border-b border-slate-800 transition hover:bg-slate-800/40"
                  >

                    <td className="px-6 py-5">

                      <p className="font-semibold text-white">
                        {po.poNumber}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {po.createdDate}
                      </p>

                    </td>

                    <td className="px-6 py-5">

                      <p className="font-semibold">
                        {po.sku}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {po.product}
                      </p>

                    </td>

                    <td className="px-6 py-5 text-sm text-slate-300">
                      {po.supplier}
                    </td>

                    <td className="px-6 py-5 text-sm font-semibold">
                      {po.quantity}
                    </td>

                    <td className="px-6 py-5 text-sm font-semibold">
                      $
                      {po.totalCost.toLocaleString()}
                    </td>

                    <td className="px-6 py-5 text-sm text-slate-300">
                      {po.expectedDelivery}
                    </td>

                    <td className="px-6 py-5">

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                          po.status
                        )}`}
                      >
                        {po.status}
                      </span>

                    </td>

                    <td className="px-6 py-5">

                      <div className="flex flex-wrap gap-2">

                        <button
                          onClick={() =>
                            setSelectedPO(po)
                          }
                          className="text-sm font-semibold text-blue-400 hover:text-blue-300"
                        >
                          View
                        </button>

                        <button
                          onClick={() =>
                            setEditPO(po)
                          }
                          className="rounded-md bg-yellow-500/10 px-3 py-2 text-xs font-semibold text-yellow-400 hover:bg-yellow-500 hover:text-black"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            handleDeletePO(
                              po.poNumber
                            )
                          }
                          className="rounded-md bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500 hover:text-white"
                        >
                          Delete
                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

          {filteredOrders.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              No purchase orders found.
            </div>
          )}

        </div>

      </div>

      {/* CREATE PO MODAL */}

      {showCreatePO && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">

          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-sm text-cyan-400">
                  ChainSight Procurement
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  Create Purchase Order
                </h2>

              </div>

              <button
                onClick={() =>
                  setShowCreatePO(false)
                }
                className="text-2xl text-slate-400 hover:text-white"
              >
                ×
              </button>

            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  SKU
                </label>

                <input
                  value={newPO.sku}
                  onChange={(e) =>
                    setNewPO({
                      ...newPO,
                      sku: e.target.value,
                    })
                  }
                  placeholder="GPU-2048"
                  className="w-full rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

              </div>

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  Product
                </label>

                <input
                  value={newPO.product}
                  onChange={(e) =>
                    setNewPO({
                      ...newPO,
                      product: e.target.value,
                    })
                  }
                  placeholder="AI GPU Accelerator"
                  className="w-full rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

              </div>

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  Supplier
                </label>

                <input
                  value={newPO.supplier}
                  onChange={(e) =>
                    setNewPO({
                      ...newPO,
                      supplier: e.target.value,
                    })
                  }
                  placeholder="NVIDIA Supply"
                  className="w-full rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

              </div>

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  Quantity
                </label>

                <input
                  type="number"
                  value={newPO.quantity}
                  onChange={(e) =>
                    setNewPO({
                      ...newPO,
                      quantity:
                        Number(
                          e.target.value
                        ),
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

              </div>

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  Unit Cost ($)
                </label>

                <input
                  type="number"
                  value={newPO.unitCost}
                  onChange={(e) =>
                    setNewPO({
                      ...newPO,
                      unitCost:
                        Number(
                          e.target.value
                        ),
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

              </div>

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  Lead Time (days)
                </label>

                <input
                  type="number"
                  value={newPO.leadTime}
                  onChange={(e) =>
                    setNewPO({
                      ...newPO,
                      leadTime:
                        Number(
                          e.target.value
                        ),
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

              </div>

              <div className="md:col-span-2">

                <label className="mb-1 block text-sm text-slate-400">
                  Expected Delivery
                </label>

                <input
                  type="date"
                  onChange={(e) => {

                    const date =
                      e.target.value
                        ? new Date(
                            `${e.target.value}T00:00:00`
                          ).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )
                        : "";

                    setNewPO({
                      ...newPO,
                      expectedDelivery:
                        date,
                    });

                  }}
                  className="w-full rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

              </div>

            </div>

            <div className="mt-6 flex justify-end gap-3">

              <button
                onClick={() =>
                  setShowCreatePO(false)
                }
                className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={handleCreatePO}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Create Purchase Order
              </button>

            </div>

          </div>

        </div>

      )}

      {/* EDIT PO MODAL */}

      {editPO && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">

          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-sm text-cyan-400">
                  ChainSight Procurement
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  Edit Purchase Order
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {editPO.poNumber}
                </p>

              </div>

              <button
                onClick={() =>
                  setEditPO(null)
                }
                className="text-2xl text-slate-400 hover:text-white"
              >
                ×
              </button>

            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  SKU
                </label>

                <input
                  value={editPO.sku}
                  onChange={(e) =>
                    setEditPO({
                      ...editPO,
                      sku: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

              </div>

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  Product
                </label>

                <input
                  value={editPO.product}
                  onChange={(e) =>
                    setEditPO({
                      ...editPO,
                      product: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

              </div>

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  Supplier
                </label>

                <input
                  value={editPO.supplier}
                  onChange={(e) =>
                    setEditPO({
                      ...editPO,
                      supplier: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

              </div>

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  Quantity
                </label>

                <input
                  type="number"
                  value={editPO.quantity}
                  onChange={(e) =>
                    setEditPO({
                      ...editPO,
                      quantity:
                        Number(
                          e.target.value
                        ),
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

              </div>

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  Unit Cost ($)
                </label>

                <input
                  type="number"
                  value={editPO.unitCost}
                  onChange={(e) =>
                    setEditPO({
                      ...editPO,
                      unitCost:
                        Number(
                          e.target.value
                        ),
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

              </div>

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  Lead Time (days)
                </label>

                <input
                  type="number"
                  value={editPO.leadTime}
                  onChange={(e) =>
                    setEditPO({
                      ...editPO,
                      leadTime:
                        Number(
                          e.target.value
                        ),
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

              </div>

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  Expected Delivery
                </label>

                <input
                  value={editPO.expectedDelivery}
                  onChange={(e) =>
                    setEditPO({
                      ...editPO,
                      expectedDelivery:
                        e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

              </div>

              <div>

                <label className="mb-1 block text-sm text-slate-400">
                  Status
                </label>

                <select
                  value={editPO.status}
                  onChange={(e) =>
                    setEditPO({
                      ...editPO,
                      status:
                        e.target
                          .value as POStatus,
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm outline-none"
                >

                  <option value="Draft">
                    Draft
                  </option>

                  <option value="Pending Approval">
                    Pending Approval
                  </option>

                  <option value="Approved">
                    Approved
                  </option>

                  <option value="Ordered">
                    Ordered
                  </option>

                  <option value="In Transit">
                    In Transit
                  </option>

                  <option value="Received">
                    Received
                  </option>

                </select>

              </div>

            </div>

            <div className="mt-6 flex justify-end gap-3">

              <button
                onClick={() =>
                  setEditPO(null)
                }
                className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={() =>
                  handleEditPO(editPO)
                }
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Save Changes
              </button>

            </div>

          </div>

        </div>

      )}

      {/* PO DETAILS MODAL */}

      {selectedPO && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">

          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-sm text-cyan-400">
                  ChainSight Procurement
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  {selectedPO.poNumber}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {selectedPO.sku} —{" "}
                  {selectedPO.product}
                </p>

              </div>

              <button
                onClick={() =>
                  setSelectedPO(null)
                }
                className="text-2xl text-slate-400 hover:text-white"
              >
                ×
              </button>

            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">

              <div className="rounded-lg border border-slate-800 bg-[#020617] p-4">

                <p className="text-xs text-slate-500">
                  Supplier
                </p>

                <p className="mt-2 font-semibold">
                  {selectedPO.supplier}
                </p>

              </div>

              <div className="rounded-lg border border-slate-800 bg-[#020617] p-4">

                <p className="text-xs text-slate-500">
                  Quantity
                </p>

                <p className="mt-2 font-semibold">
                  {selectedPO.quantity} units
                </p>

              </div>

              <div className="rounded-lg border border-slate-800 bg-[#020617] p-4">

                <p className="text-xs text-slate-500">
                  Unit Cost
                </p>

                <p className="mt-2 font-semibold">
                  $
                  {selectedPO.unitCost.toLocaleString()}
                </p>

              </div>

              <div className="rounded-lg border border-slate-800 bg-[#020617] p-4">

                <p className="text-xs text-slate-500">
                  Total Cost
                </p>

                <p className="mt-2 text-xl font-bold text-blue-400">
                  $
                  {selectedPO.totalCost.toLocaleString()}
                </p>

              </div>

              <div className="rounded-lg border border-slate-800 bg-[#020617] p-4">

                <p className="text-xs text-slate-500">
                  Supplier Lead Time
                </p>

                <p className="mt-2 font-semibold">
                  {selectedPO.leadTime} days
                </p>

              </div>

              <div className="rounded-lg border border-slate-800 bg-[#020617] p-4">

                <p className="text-xs text-slate-500">
                  Expected Delivery
                </p>

                <p className="mt-2 font-semibold">
                  {selectedPO.expectedDelivery}
                </p>

              </div>

            </div>

            <div className="mt-5 rounded-lg border border-slate-800 bg-[#020617] p-4">

              <p className="text-xs text-slate-500">
                Current Status
              </p>

              <span
                className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                  selectedPO.status
                )}`}
              >
                {selectedPO.status}
              </span>

            </div>

            {/* WORKFLOW */}

            <div className="mt-6">

              <p className="mb-3 text-sm font-semibold">
                Procurement Workflow
              </p>

              <div className="flex flex-wrap gap-2">

                {(
                  [
                    "Pending Approval",
                    "Approved",
                    "Ordered",
                    "In Transit",
                    "Received",
                  ] as POStatus[]
                ).map((status) => (

                  <button
                    key={status}
                    onClick={() => {

                      if (
                        status ===
                        "Received"
                      ) {
                        receivePurchaseOrder(
                          selectedPO
                        );

                        return;
                      }

                      updateStatus(
                        selectedPO.poNumber,
                        status
                      );

                    }}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      selectedPO.status ===
                      status
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    {status}
                  </button>

                ))}

              </div>

            </div>

            {/* ACTIONS */}

            <div className="mt-6 flex flex-wrap gap-3">

              <button
                onClick={() =>
                  setSelectedPO(null)
                }
                className="flex-1 rounded-lg border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>

              {selectedPO.status !== "Received" && (
  <button
    onClick={() => receivePurchaseOrder(selectedPO)}
    className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
  >
    Receive PO
  </button>
)}

              <button
                onClick={() => {
                  setEditPO(
                    selectedPO
                  );
                  setSelectedPO(null);
                }}
                className="flex-1 rounded-lg bg-yellow-600 px-4 py-3 text-sm font-semibold text-white hover:bg-yellow-500"
              >
                Edit PO
              </button>

              <button
                onClick={() =>
                  handleDeletePO(
                    selectedPO.poNumber
                  )
                }
                className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500"
              >
                Delete PO
              </button>

              {selectedPO.status ===
                "Pending Approval" && (

                <button
                  onClick={() =>
                    updateStatus(
                      selectedPO.poNumber,
                      "Approved"
                    )
                  }
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  Approve PO
                </button>

              )}

              {selectedPO.status ===
                "Approved" && (

                <button
                  onClick={() =>
                    updateStatus(
                      selectedPO.poNumber,
                      "Ordered"
                    )
                  }
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  Place Supplier Order
                </button>

              )}

              {selectedPO.status ===
                "Ordered" && (

                <button
                  onClick={() =>
                    updateStatus(
                      selectedPO.poNumber,
                      "In Transit"
                    )
                  }
                  className="flex-1 rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
                >
                  Mark In Transit
                </button>

              )}

              {selectedPO.status ===
                "In Transit" && (

                <button
                  onClick={() =>
                    receivePurchaseOrder(
                      selectedPO
                    )
                  }
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Receive Inventory
                </button>

              )}

            </div>

          </div>

        </div>

      )}

    </main>
  );
}