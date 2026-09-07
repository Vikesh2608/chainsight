"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { loadData, saveData } from "@/data/storage";
import { YieldChart } from "../_components/charts";
import type { InventoryItem } from "@/data/inventory";
import {
  getProductionOrders,
  saveProductionOrders,
  generateMONumber,
  firstPassYield,
  defectRate,
  completion,
  type ProductionOrder,
  type ProductionStatus,
  type QualityDisposition,
} from "@/data/production";

const STATUSES: ProductionStatus[] = [
  "Planned",
  "In Progress",
  "Completed",
  "On Hold",
];

const DISPOSITIONS: QualityDisposition[] = [
  "Pending",
  "Accepted",
  "Rework",
  "Scrapped",
];

function statusClasses(status: ProductionStatus): string {
  switch (status) {
    case "Planned":
      return "bg-slate-800 text-slate-300";
    case "In Progress":
      return "bg-cyan-500/10 text-cyan-400";
    case "Completed":
      return "bg-emerald-500/10 text-emerald-400";
    case "On Hold":
      return "bg-red-500/10 text-red-400";
    default:
      return "bg-slate-800 text-slate-300";
  }
}

function dispositionClasses(d: QualityDisposition): string {
  switch (d) {
    case "Accepted":
      return "bg-emerald-500/10 text-emerald-400";
    case "Rework":
      return "bg-amber-500/10 text-amber-400";
    case "Scrapped":
      return "bg-red-500/10 text-red-400";
    default:
      return "bg-slate-800 text-slate-400";
  }
}

function yieldClass(value: number): string {
  if (value >= 97) return "text-emerald-400";
  if (value >= 90) return "text-amber-400";
  return "text-red-400";
}

const emptyOrder: ProductionOrder = {
  id: "",
  sku: "",
  product: "",
  quantityPlanned: 0,
  quantityProduced: 0,
  workCenter: "",
  startDate: "",
  dueDate: "",
  status: "Planned",
  inspectedQty: 0,
  passedQty: 0,
  failedQty: 0,
  disposition: "Pending",
  inspector: "",
  qualityHold: false,
  createdDate: "",
};

function today(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/*
 * Push good (passed) units from a completed production order into
 * inventory, the same way a received purchase order does. Keeps the
 * dashboard briefing in sync.
 */
function addGoodUnitsToInventory(order: ProductionOrder, goodUnits: number) {
  if (goodUnits <= 0) {
    return;
  }

  const inventory = loadData<InventoryItem[]>("inventory", []);
  const index = inventory.findIndex((item) => item.sku === order.sku);

  let updated: InventoryItem[];

  if (index >= 0) {
    updated = [...inventory];
    updated[index] = {
      ...updated[index],
      stock: updated[index].stock + goodUnits,
    };
  } else {
    updated = [
      ...inventory,
      {
        sku: order.sku,
        name: order.product,
        category: "Manufactured",
        stock: goodUnits,
        forecast30: 0,
        reorderPoint: 0,
        leadTime: 0,
        unitCost: 0,
        supplier: "In-house Production",
      },
    ];
  }

  saveData("inventory", updated);
  window.dispatchEvent(new Event("inventory-updated"));
}

export default function ProductionPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showCreate, setShowCreate] = useState(false);
  const [newOrder, setNewOrder] = useState<ProductionOrder>({ ...emptyOrder });

  const [editOrder, setEditOrder] = useState<ProductionOrder | null>(null);
  const [inspectOrder, setInspectOrder] = useState<ProductionOrder | null>(
    null
  );

  useEffect(() => {
    setOrders(getProductionOrders());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveProductionOrders(orders);
  }, [orders, loaded]);

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const q = search.toLowerCase();
      const matchesSearch =
        order.id.toLowerCase().includes(q) ||
        order.sku.toLowerCase().includes(q) ||
        order.product.toLowerCase().includes(q) ||
        order.workCenter.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  // KPIs
  const openOrders = orders.filter(
    (o) => o.status === "Planned" || o.status === "In Progress"
  ).length;

  const unitsProduced = orders.reduce((sum, o) => sum + o.quantityProduced, 0);

  const totalInspected = orders.reduce((sum, o) => sum + o.inspectedQty, 0);
  const totalPassed = orders.reduce((sum, o) => sum + o.passedQty, 0);
  const aggregateYield =
    totalInspected > 0 ? (totalPassed / totalInspected) * 100 : 0;
  const aggregateDefect =
    totalInspected > 0
      ? ((totalInspected - totalPassed) / totalInspected) * 100
      : 0;

  const qualityHolds = orders.filter(
    (o) => o.qualityHold || o.status === "On Hold"
  ).length;

  function updateOrder(id: string, patch: Partial<ProductionOrder>) {
    setOrders((current) =>
      current.map((o) => (o.id === id ? { ...o, ...patch } : o))
    );
  }

  function advanceStatus(order: ProductionOrder) {
    const flow: ProductionStatus[] = ["Planned", "In Progress", "Completed"];
    const i = flow.indexOf(order.status);
    const next = i >= 0 && i < flow.length - 1 ? flow[i + 1] : order.status;

    if (next === "Completed") {
      if (order.qualityHold) {
        toast.error(`${order.id} is on quality hold`, {
          description: "Release the hold before completing this order.",
        });
        return;
      }

      const produced =
        order.quantityProduced > 0
          ? order.quantityProduced
          : order.quantityPlanned;

      const good = Math.max(0, produced - order.failedQty);

      addGoodUnitsToInventory(order, good);

      updateOrder(order.id, {
        status: "Completed",
        quantityProduced: produced,
      });

      toast.success(`${order.id} completed`, {
        description: `${good} good units of ${order.sku} added to inventory.`,
      });
      return;
    }

    updateOrder(order.id, { status: next });
  }

  function handleCreate() {
    if (
      !newOrder.sku.trim() ||
      !newOrder.product.trim() ||
      newOrder.quantityPlanned <= 0
    ) {
      toast.error("Enter SKU, product and a planned quantity greater than 0.");
      return;
    }

    const order: ProductionOrder = {
      ...newOrder,
      sku: newOrder.sku.trim(),
      product: newOrder.product.trim(),
      workCenter: newOrder.workCenter.trim() || "Unassigned",
      startDate: newOrder.startDate || today(),
      dueDate: newOrder.dueDate || today(),
      id: generateMONumber(orders),
      status: "Planned",
      createdDate: today(),
    };

    setOrders((current) => [...current, order]);
    setNewOrder({ ...emptyOrder });
    setShowCreate(false);
    toast.success(`${order.id} created`);
  }

  function handleInspection(saved: ProductionOrder) {
    const inspected = Math.max(0, saved.inspectedQty);
    const passed = Math.min(Math.max(0, saved.passedQty), inspected);
    const failed = inspected - passed;

    updateOrder(saved.id, {
      inspectedQty: inspected,
      passedQty: passed,
      failedQty: failed,
      disposition: saved.disposition,
      inspector: saved.inspector.trim(),
      qualityHold: saved.disposition === "Rework" || saved.disposition === "Scrapped"
        ? true
        : saved.qualityHold,
      status:
        (saved.disposition === "Rework" ||
          saved.disposition === "Scrapped") &&
        saved.status !== "Completed"
          ? "On Hold"
          : saved.status,
    });

    setInspectOrder(null);
  }

  function toggleHold(order: ProductionOrder) {
    const hold = !order.qualityHold;
    updateOrder(order.id, {
      qualityHold: hold,
      status: hold
        ? "On Hold"
        : order.status === "On Hold"
          ? "In Progress"
          : order.status,
    });
  }

  function handleDelete(id: string) {
    toast(`Delete production order ${id}?`, {
      action: {
        label: "Delete",
        onClick: () => {
          setOrders((current) => current.filter((o) => o.id !== id));
          toast.success(`${id} deleted`);
        },
      },
    });
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* HEADER */}
        <div className="mb-8">
          <p className="text-sm text-cyan-400">ChainSight / Production &amp; Quality</p>

          <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-bold">Production &amp; Quality</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Track manufacturing orders, output against plan, first-pass
                yield, defect rates and quality holds. Completing an order with
                accepted quality flows good units into inventory.
              </p>
            </div>

            <button
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
            >
              + New Production Order
            </button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Kpi label="Open Orders" value={`${openOrders}`} hint="Planned + in progress" />
          <Kpi
            label="Units Produced"
            value={unitsProduced.toLocaleString()}
            hint="All orders"
          />
          <Kpi
            label="First-Pass Yield"
            value={`${aggregateYield.toFixed(1)}%`}
            hint="Passed / inspected"
            tone={yieldClass(aggregateYield)}
          />
          <Kpi
            label="Defect Rate"
            value={`${aggregateDefect.toFixed(1)}%`}
            hint="Failed / inspected"
            tone={aggregateDefect > 5 ? "text-red-400" : "text-emerald-400"}
          />
          <Kpi
            label="Quality Holds"
            value={`${qualityHolds}`}
            hint="Orders on hold"
            tone={qualityHolds > 0 ? "text-red-400" : "text-emerald-400"}
          />
        </div>

        {/* FILTERS */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <input
              type="text"
              placeholder="Search MO, SKU, product, or work center..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm text-white outline-none"
            >
              <option value="All">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="font-semibold">Production Orders</h2>
            <p className="mt-1 text-xs text-slate-500">
              Output against plan, with the latest quality result per order
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#020617] text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4">Order</th>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Progress</th>
                  <th className="px-6 py-4">Work Center</th>
                  <th className="px-6 py-4">Due</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Yield</th>
                  <th className="px-6 py-4">Quality</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((order) => {
                  const fpy = firstPassYield(order);
                  const pct = completion(order);

                  return (
                    <tr
                      key={order.id}
                      className="border-t border-slate-800 hover:bg-slate-800/40"
                    >
                      <td className="px-6 py-5">
                        <div className="font-semibold">{order.id}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {order.sku}
                        </div>
                      </td>

                      <td className="px-6 py-5 text-slate-300">
                        {order.product}
                      </td>

                      <td className="px-6 py-5">
                        <div className="text-xs text-slate-400">
                          {order.quantityProduced} / {order.quantityPlanned}
                        </div>
                        <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-cyan-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>

                      <td className="px-6 py-5 text-slate-400">
                        {order.workCenter}
                      </td>

                      <td className="px-6 py-5 text-slate-300">
                        {order.dueDate}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                        {order.qualityHold && order.status !== "On Hold" && (
                          <span className="ml-2 rounded-full bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-400">
                            HOLD
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        {order.inspectedQty > 0 ? (
                          <span className={`font-semibold ${yieldClass(fpy)}`}>
                            {fpy.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${dispositionClasses(
                            order.disposition
                          )}`}
                        >
                          {order.disposition}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          {order.status !== "Completed" && (
                            <button
                              onClick={() => advanceStatus(order)}
                              className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                            >
                              {order.status === "Planned"
                                ? "Start"
                                : order.status === "In Progress"
                                  ? "Complete"
                                  : "Advance"}
                            </button>
                          )}

                          <button
                            onClick={() => setInspectOrder({ ...order })}
                            className="rounded-md bg-emerald-600/10 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-600 hover:text-white"
                          >
                            Inspect
                          </button>

                          <button
                            onClick={() => toggleHold(order)}
                            className="rounded-md bg-amber-600/10 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-600 hover:text-white"
                          >
                            {order.qualityHold ? "Release" : "Hold"}
                          </button>

                          <button
                            onClick={() => setEditOrder({ ...order })}
                            className="rounded-md bg-slate-700/40 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDelete(order.id)}
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

          {filtered.length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              No production orders match your search.
            </div>
          )}
        </div>

        {/* YIELD CHART */}
        {orders.some((o) => o.inspectedQty > 0) && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-sm font-semibold">
              First-pass yield by order
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Orders below the 95% target line need process attention
            </p>
            <div className="mt-4">
              <YieldChart
                data={orders
                  .filter((o) => o.inspectedQty > 0)
                  .map((o) => ({ id: o.id, yield: firstPassYield(o) }))}
              />
            </div>
          </div>
        )}

        {/* QUALITY SUMMARY */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-sm text-cyan-400">Quality Overview</p>
            <h2 className="mt-2 text-xl font-semibold">Disposition breakdown</h2>

            <div className="mt-5 space-y-3">
              {DISPOSITIONS.map((d) => {
                const count = orders.filter((o) => o.disposition === d).length;
                const total = orders.length || 1;
                const pct = (count / total) * 100;

                return (
                  <div key={d}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-400">{d}</span>
                      <span className="font-semibold text-white">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-cyan-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
            <p className="text-sm text-red-400">Needs attention</p>
            <h2 className="mt-2 text-xl font-semibold">
              Orders below 95% first-pass yield
            </h2>

            <div className="mt-5 space-y-3">
              {orders
                .filter(
                  (o) => o.inspectedQty > 0 && firstPassYield(o) < 95
                )
                .sort((a, b) => firstPassYield(a) - firstPassYield(b))
                .map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">{o.id}</p>
                      <p className="text-xs text-slate-500">
                        {o.sku} · {defectRate(o).toFixed(1)}% defects ·{" "}
                        {o.disposition}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold ${yieldClass(
                        firstPassYield(o)
                      )}`}
                    >
                      {firstPassYield(o).toFixed(1)}%
                    </span>
                  </div>
                ))}

              {orders.filter(
                (o) => o.inspectedQty > 0 && firstPassYield(o) < 95
              ).length === 0 && (
                <p className="text-sm text-emerald-300">
                  Every inspected order is at or above 95% first-pass yield.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreate && (
        <Modal title="New Production Order" onClose={() => setShowCreate(false)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="SKU">
              <input
                value={newOrder.sku}
                onChange={(e) =>
                  setNewOrder({ ...newOrder, sku: e.target.value })
                }
                placeholder="GPU-2048"
                className={inputClass}
              />
            </Field>
            <Field label="Product">
              <input
                value={newOrder.product}
                onChange={(e) =>
                  setNewOrder({ ...newOrder, product: e.target.value })
                }
                placeholder="AI GPU Accelerator"
                className={inputClass}
              />
            </Field>
            <Field label="Planned Quantity">
              <input
                type="number"
                value={newOrder.quantityPlanned}
                onChange={(e) =>
                  setNewOrder({
                    ...newOrder,
                    quantityPlanned: Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Work Center">
              <input
                value={newOrder.workCenter}
                onChange={(e) =>
                  setNewOrder({ ...newOrder, workCenter: e.target.value })
                }
                placeholder="SMT Line 1"
                className={inputClass}
              />
            </Field>
            <Field label="Start Date">
              <input
                type="date"
                onChange={(e) =>
                  setNewOrder({
                    ...newOrder,
                    startDate: e.target.value
                      ? new Date(
                          `${e.target.value}T00:00:00`
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "",
                  })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Due Date">
              <input
                type="date"
                onChange={(e) =>
                  setNewOrder({
                    ...newOrder,
                    dueDate: e.target.value
                      ? new Date(
                          `${e.target.value}T00:00:00`
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "",
                  })
                }
                className={inputClass}
              />
            </Field>
          </div>

          <ModalActions
            onCancel={() => setShowCreate(false)}
            onConfirm={handleCreate}
            confirmLabel="Create Order"
          />
        </Modal>
      )}

      {/* EDIT MODAL */}
      {editOrder && (
        <Modal
          title={`Edit ${editOrder.id}`}
          onClose={() => setEditOrder(null)}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Product">
              <input
                value={editOrder.product}
                onChange={(e) =>
                  setEditOrder({ ...editOrder, product: e.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Work Center">
              <input
                value={editOrder.workCenter}
                onChange={(e) =>
                  setEditOrder({ ...editOrder, workCenter: e.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Planned Quantity">
              <input
                type="number"
                value={editOrder.quantityPlanned}
                onChange={(e) =>
                  setEditOrder({
                    ...editOrder,
                    quantityPlanned: Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Produced Quantity">
              <input
                type="number"
                value={editOrder.quantityProduced}
                onChange={(e) =>
                  setEditOrder({
                    ...editOrder,
                    quantityProduced: Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Due Date">
              <input
                value={editOrder.dueDate}
                onChange={(e) =>
                  setEditOrder({ ...editOrder, dueDate: e.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Status">
              <select
                value={editOrder.status}
                onChange={(e) =>
                  setEditOrder({
                    ...editOrder,
                    status: e.target.value as ProductionStatus,
                  })
                }
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <ModalActions
            onCancel={() => setEditOrder(null)}
            onConfirm={() => {
              updateOrder(editOrder.id, {
                product: editOrder.product.trim(),
                workCenter: editOrder.workCenter.trim(),
                quantityPlanned: editOrder.quantityPlanned,
                quantityProduced: editOrder.quantityProduced,
                dueDate: editOrder.dueDate,
                status: editOrder.status,
              });
              setEditOrder(null);
            }}
            confirmLabel="Save Changes"
          />
        </Modal>
      )}

      {/* INSPECTION MODAL */}
      {inspectOrder && (
        <Modal
          title={`Quality Inspection — ${inspectOrder.id}`}
          onClose={() => setInspectOrder(null)}
        >
          <p className="mb-4 text-sm text-slate-400">
            {inspectOrder.sku} · {inspectOrder.product}
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Inspected Quantity">
              <input
                type="number"
                value={inspectOrder.inspectedQty}
                onChange={(e) =>
                  setInspectOrder({
                    ...inspectOrder,
                    inspectedQty: Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Passed Quantity">
              <input
                type="number"
                value={inspectOrder.passedQty}
                onChange={(e) =>
                  setInspectOrder({
                    ...inspectOrder,
                    passedQty: Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Disposition">
              <select
                value={inspectOrder.disposition}
                onChange={(e) =>
                  setInspectOrder({
                    ...inspectOrder,
                    disposition: e.target.value as QualityDisposition,
                  })
                }
                className={inputClass}
              >
                {DISPOSITIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Inspector">
              <input
                value={inspectOrder.inspector}
                onChange={(e) =>
                  setInspectOrder({
                    ...inspectOrder,
                    inspector: e.target.value,
                  })
                }
                placeholder="Name"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm">
            <p className="text-slate-400">
              Failed:{" "}
              <span className="font-semibold text-white">
                {Math.max(
                  0,
                  inspectOrder.inspectedQty -
                    Math.min(
                      inspectOrder.passedQty,
                      inspectOrder.inspectedQty
                    )
                )}
              </span>{" "}
              · First-pass yield:{" "}
              <span className="font-semibold text-white">
                {inspectOrder.inspectedQty > 0
                  ? (
                      (Math.min(
                        inspectOrder.passedQty,
                        inspectOrder.inspectedQty
                      ) /
                        inspectOrder.inspectedQty) *
                      100
                    ).toFixed(1)
                  : "0.0"}
                %
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Choosing Rework or Scrapped puts the order on quality hold.
            </p>
          </div>

          <ModalActions
            onCancel={() => setInspectOrder(null)}
            onConfirm={() => handleInspection(inspectOrder)}
            confirmLabel="Record Inspection"
          />
        </Modal>
      )}
    </main>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-[#020617] px-4 py-3 text-sm text-white outline-none focus:border-blue-500";

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${tone ?? "text-white"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-sm text-cyan-400">ChainSight Production</p>
            <h2 className="mt-1 text-2xl font-bold">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  onConfirm,
  confirmLabel,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
}) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <button
        onClick={onCancel}
        className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
      >
        {confirmLabel}
      </button>
    </div>
  );
}
