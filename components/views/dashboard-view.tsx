"use client"

import { useStore } from "@/lib/spa-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Grid3X3, ShoppingBag, DollarSign, ChefHat, AlertTriangle } from "lucide-react"

const statusColors: Record<string, string> = {
  available: "bg-success", occupied: "bg-primary", reserved: "bg-warning", billing: "bg-accent",
}

export function DashboardView() {
  const { state, setView } = useStore()
  const { tables, orders, products, supplies } = state
  const openOrders = orders.filter(o => o.status === "open")
  const todaySales = orders.filter(o => o.status === "closed").reduce((s, o) => s + o.total, 0)
  const kitchenPending = openOrders.flatMap(o => o.items).filter(i => i.status === "pending" || i.status === "preparing").length
  const lowStock = supplies.filter(s => s.stock <= s.minStock)
  const occupied = tables.filter(t => t.status === "occupied").length

  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Mesas ocupadas", value: `${occupied}/${tables.length}`, icon: Grid3X3, color: "text-primary" },
          { label: "Ordenes abiertas", value: openOrders.length, icon: ShoppingBag, color: "text-accent" },
          { label: "Venta del dia", value: `$${todaySales.toLocaleString()}`, icon: DollarSign, color: "text-success" },
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
                <div key={t.id} className={`flex h-12 items-center justify-center rounded-lg text-sm font-medium text-primary-foreground ${statusColors[t.status]}`}>
                  {t.number}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low stock alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Alertas de stock</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todo en orden</p>
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
    </div>
  )
}
