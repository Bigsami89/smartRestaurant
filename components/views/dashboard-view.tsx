"use client"

import { useState, useMemo, useTransition } from "react"
import { useStore, useRolePermissions } from "@/lib/spa-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Grid3X3, ShoppingBag, DollarSign, ChefHat, AlertTriangle, Plus, Pencil,
  CalendarDays, Banknote, Clock, TrendingUp, UtensilsCrossed,
  BarChart3, BookOpen, CookingPot, Store
} from "lucide-react"
import { updateTable, createTable } from "@/lib/actions"
import type { Table } from "@/lib/types"

// --- Date helpers ---
const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

function formatFullDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0")
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year = date.getFullYear()
  return `${dayNames[date.getDay()]} ${day}/${month}/${year}`
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Buenos días"
  if (h < 18) return "Buenas tardes"
  return "Buenas noches"
}

const statusColors: Record<string, string> = {
  available: "bg-success", occupied: "bg-orange-500", reserved: "bg-warning", billing: "bg-accent",
}

const statusLabel: Record<string, string> = {
  available: "Disponible", occupied: "Ocupada", reserved: "Reservada", billing: "Cobrando",
}

export function DashboardView() {
  const { state, setView, dispatch } = useStore()
  const allowedViews = useRolePermissions()
  const { tables, orders, products, supplies } = state
  const openOrders = orders.filter(o => o.status === "open")
  const todaySales = orders.filter(o => o.status === "closed").reduce((s, o) => s + o.total, 0)
  const kitchenPending = openOrders.flatMap(o => o.items).filter(i => i.status === "pending" || i.status === "preparing").length
  const lowStock = supplies.filter(s => s.stock <= s.minStock)
  const occupied = tables.filter(t => t.status === "occupied").length

  // --- Cash shift status ---
  const hasOpenShift = useMemo(() => {
    return state.cashShifts.some(s =>
      s.status === "open" && s.branchId === state.currentBranchId
    )
  }, [state.cashShifts, state.currentBranchId])

  // --- Today's reservations ---
  const todayReservations = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return (state.reservations || []).filter(r => {
      const d = new Date(r.date)
      return d >= today && d < tomorrow &&
        (r.status === "pending" || r.status === "confirmed") &&
        r.branchId === state.currentBranchId
    })
  }, [state.reservations, state.currentBranchId])

  // --- Top 5 products today ---
  const topProducts = useMemo(() => {
    const closedToday = orders.filter(o => o.status === "closed")
    const counts: Record<string, { name: string; qty: number; revenue: number }> = {}
    closedToday.forEach(o => {
      o.items.forEach(item => {
        const key = item.productName
        if (!counts[key]) counts[key] = { name: key, qty: 0, revenue: 0 }
        counts[key].qty += item.quantity
        counts[key].revenue += item.totalPrice
      })
    })
    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 5)
  }, [orders])

  // --- Edit table state ---
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [editNumber, setEditNumber] = useState("")
  const [editSeats, setEditSeats] = useState("")
  const [editZone, setEditZone] = useState("")

  // --- Add table state ---
  const [showAdd, setShowAdd] = useState(false)
  const [newNumber, setNewNumber] = useState("")
  const [newSeats, setNewSeats] = useState("4")
  const [newZone, setNewZone] = useState("Interior")

  const [isPending, startTransition] = useTransition()

  function openEdit(t: Table) {
    setEditingTable(t)
    setEditNumber(String(t.number))
    setEditSeats(String(t.seats))
    setEditZone(t.zone)
  }

  function handleEditSave() {
    if (!editingTable) return
    startTransition(async () => {
      const res = await updateTable(editingTable.id, {
        number: Number(editNumber),
        seats: Number(editSeats),
        zone: editZone,
      })
      if (res.success) {
        dispatch({
          type: "UPDATE_TABLE",
          payload: { ...editingTable, number: Number(editNumber), seats: Number(editSeats), zone: editZone }
        })
        setEditingTable(null)
      } else {
        alert(res.error || "Error al actualizar mesa")
      }
    })
  }

  function handleAddTable() {
    startTransition(async () => {
      const formData = new FormData()
      formData.append("number", newNumber)
      formData.append("seats", newSeats)
      formData.append("zone", newZone)
      formData.append("status", "available")
      if (state.currentBranchId) {
        formData.append("branchId", state.currentBranchId)
      }
      const res = await createTable(null, formData)
      if (res.success) {
        setShowAdd(false)
        setNewNumber("")
        setNewSeats("4")
        setNewZone("Interior")
      } else {
        alert(res.error || "Error al agregar mesa")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Welcome header with date */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{getGreeting()} 👋</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatFullDate(new Date())}
          </p>
        </div>
        <Badge variant="outline" className="text-xs font-medium gap-1.5 px-3 py-1.5">
          <Store className="h-3.5 w-3.5" />
          {state.branches.find(b => b.id === state.currentBranchId)?.name || "Sucursal"}
        </Badge>
      </div>

      {/* Cash register reminder banner */}
      {!hasOpenShift && (
        <Card className="border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15">
              <Banknote className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-800 dark:text-amber-300">No hay caja abierta</p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                Debes abrir un turno de caja antes de realizar ventas
              </p>
            </div>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 gap-1.5"
              onClick={() => setView("pos")}
            >
              <Banknote className="h-4 w-4" />
              Abrir Caja
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick access buttons */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Punto de Venta", icon: ShoppingBag, view: "pos" as const, color: "text-emerald-600", bg: "bg-emerald-500/10 hover:bg-emerald-500/20" },
          { label: "Catálogo", icon: BookOpen, view: "catalogo" as const, color: "text-blue-600", bg: "bg-blue-500/10 hover:bg-blue-500/20" },
          { label: "Cocina", icon: CookingPot, view: "cocina" as const, color: "text-orange-600", bg: "bg-orange-500/10 hover:bg-orange-500/20" },
          { label: "Reportes", icon: BarChart3, view: "reportes" as const, color: "text-purple-600", bg: "bg-purple-500/10 hover:bg-purple-500/20" },
        ].filter(item => allowedViews.includes(item.view)).map(item => (
          <button
            key={item.label}
            onClick={() => setView(item.view)}
            className={`flex items-center gap-3 rounded-xl border p-3.5 transition-all hover:shadow-md cursor-pointer ${item.bg}`}
          >
            <item.icon className={`h-5 w-5 ${item.color}`} />
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Mesas ocupadas", value: `${occupied}/${tables.length}`, icon: Grid3X3, color: "text-primary" },
          { label: "Ordenes abiertas", value: openOrders.length, icon: ShoppingBag, color: "text-accent" },
          { label: "Venta del día", value: `$${todaySales.toLocaleString()}`, icon: DollarSign, color: "text-success" },
          { label: "Items en cocina", value: kitchenPending, icon: ChefHat, color: "text-warning" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-bold">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tables quick view */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Mesas</CardTitle>
            <button onClick={() => setView("mesas")} className="text-xs text-primary hover:underline">Ver todas</button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {tables.map(t => (
                <button
                  key={t.id}
                  onClick={() => openEdit(t)}
                  className={`group relative flex h-12 items-center justify-center rounded-lg text-sm font-medium text-primary-foreground transition-all hover:scale-105 hover:ring-2 hover:ring-primary/50 hover:shadow-md cursor-pointer ${statusColors[t.status]}`}
                  title={`Mesa ${t.number} — ${statusLabel[t.status]} — ${t.seats} asientos — ${t.zone}`}
                >
                  {t.number}
                  <Pencil className="absolute top-1 right-1 h-3 w-3 opacity-0 group-hover:opacity-70 transition-opacity" />
                </button>
              ))}
              {/* Add table button */}
              <button
                onClick={() => setShowAdd(true)}
                className="flex h-12 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground transition-all hover:border-primary hover:text-primary hover:scale-105 hover:shadow-md cursor-pointer"
                title="Agregar mesa"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Today's reservations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Reservaciones Hoy
            </CardTitle>
            <button onClick={() => setView("reservas")} className="text-xs text-primary hover:underline">Ver todas</button>
          </CardHeader>
          <CardContent>
            {todayReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Sin reservaciones para hoy</p>
            ) : (
              <div className="flex flex-col gap-2">
                {todayReservations.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 text-xs font-bold">
                        {r.partySize}
                      </div>
                      <div>
                        <p className="font-medium leading-tight">{r.customerName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {r.notes ? ` · ${r.notes}` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge variant={r.status === "confirmed" ? "default" : "secondary"} className="text-[10px]">
                      {r.status === "confirmed" ? "Confirmada" : "Pendiente"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Productos Más Vendidos Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Sin ventas aún</p>
            ) : (
              <div className="flex flex-col gap-2">
                {topProducts.map((p, idx) => (
                  <div key={p.name} className="flex items-center gap-3 text-sm">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? "bg-amber-500/15 text-amber-600" : idx === 1 ? "bg-gray-300/30 text-gray-600" : idx === 2 ? "bg-orange-400/15 text-orange-600" : "bg-muted text-muted-foreground"}`}>
                      {idx + 1}
                    </span>
                    <span className="flex-1 font-medium truncate">{p.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{p.qty} uds</Badge>
                    <span className="text-xs font-bold text-emerald-600 w-16 text-right">${p.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low stock alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Alertas de Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Todo en orden ✓</p>
            ) : (
              <div className="flex flex-col gap-2">
                {lowStock.map(s => (
                  <div key={s.id} className="flex items-center gap-2 rounded-lg bg-destructive/10 p-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="flex-1 font-medium">{s.name}</span>
                    <Badge variant="destructive">{s.stock} {s.unit}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Ordenes recientes</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground"><th className="pb-2 pr-4">Orden</th><th className="pb-2 pr-4">Mesa</th><th className="pb-2 pr-4">Items</th><th className="pb-2 pr-4">Total</th><th className="pb-2">Estado</th></tr></thead>
              <tbody>
                {orders.slice(-5).reverse().map(o => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{o.id.slice(0, 6)}</td>
                    <td className="py-2 pr-4">{o.tableNumber != null ? `Mesa ${o.tableNumber}` : "Venta directa"}</td>
                    <td className="py-2 pr-4">{o.items.length}</td>
                    <td className="py-2 pr-4">${o.total}</td>
                    <td className="py-2"><Badge variant={o.status === "open" ? "default" : "secondary"}>{o.status === "open" ? "Abierta" : "Cerrada"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Table Dialog */}
      <Dialog open={!!editingTable} onOpenChange={(open) => !open && setEditingTable(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Mesa {editingTable?.number}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label>Número</Label>
              <Input type="number" min="1" value={editNumber} onChange={e => {
                const val = e.target.value;
                if (val === "" || parseInt(val) > 0) setEditNumber(val);
              }} />
            </div>
            <div>
              <Label>Asientos</Label>
              <Input type="number" min="1" value={editSeats} onChange={e => {
                const val = e.target.value;
                if (val === "" || parseInt(val) > 0) setEditSeats(val);
              }} />
            </div>
            <div>
              <Label>Zona</Label>
              <Select value={editZone} onValueChange={setEditZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Interior">Interior</SelectItem>
                  <SelectItem value="Terraza">Terraza</SelectItem>
                  <SelectItem value="Bar">Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTable(null)}>Cancelar</Button>
            <Button onClick={handleEditSave} disabled={!editNumber || !editSeats || isPending}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Table Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar mesa</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label>Número</Label>
              <Input type="number" min="1" value={newNumber} onChange={e => {
                const val = e.target.value;
                if (val === "" || parseInt(val) > 0) setNewNumber(val);
              }} />
            </div>
            <div>
              <Label>Asientos</Label>
              <Input type="number" min="1" value={newSeats} onChange={e => {
                const val = e.target.value;
                if (val === "" || parseInt(val) > 0) setNewSeats(val);
              }} />
            </div>
            <div>
              <Label>Zona</Label>
              <Select value={newZone} onValueChange={setNewZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Interior">Interior</SelectItem>
                  <SelectItem value="Terraza">Terraza</SelectItem>
                  <SelectItem value="Bar">Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleAddTable} disabled={!newNumber || isPending}>
              {isPending ? "Agregando..." : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
