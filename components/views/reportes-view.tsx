"use client"

import { useState, useMemo } from "react"
import { useStore } from "@/lib/spa-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, ShoppingBag, TrendingUp, CreditCard, ArrowDownRight, ArrowUpRight, Calendar, Filter, Clock, Package, Download } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import * as XLSX from "xlsx"

export function ReportesView() {
  const { state } = useStore()
  const [period, setPeriod] = useState<"day" | "week" | "month">("day")

  // Filter logic (includes branch filtering)
  const filteredData = useMemo(() => {
    const now = new Date()
    const startOfPeriod = new Date()

    if (period === "day") {
      startOfPeriod.setHours(0, 0, 0, 0)
    } else if (period === "week") {
      startOfPeriod.setDate(now.getDate() - now.getDay())
      startOfPeriod.setHours(0, 0, 0, 0)
    } else if (period === "month") {
      startOfPeriod.setDate(1)
      startOfPeriod.setHours(0, 0, 0, 0)
    }

    // Filter by branch first, then by period
    const branchOrders = state.orders.filter(o =>
      (o as any).branchId === state.currentBranchId
    )
    const filteredOrders = branchOrders.filter(o =>
      o.status === "closed" && new Date(o.createdAt) >= startOfPeriod
    )

    const filteredMovements = state.supplyMovements.filter(m =>
      (m as any).branchId === state.currentBranchId &&
      new Date(m.createdAt) >= startOfPeriod
    )

    // Filter cash shifts by branch
    const branchShifts = state.cashShifts.filter(s =>
      (s as any).branchId === state.currentBranchId
    )
    const filteredShifts = branchShifts.filter(s =>
      new Date(s.openedAt) >= startOfPeriod
    )

    return { orders: filteredOrders, movements: filteredMovements, shifts: filteredShifts }
  }, [state.orders, state.supplyMovements, state.cashShifts, state.currentBranchId, period])


  const { orders: closed, movements, shifts } = filteredData

  const totalIncome = closed.reduce((s, o) => s + o.total, 0)

  // Calculate supply costs separately
  const supplyCosts = movements
    .filter(m => m.type === "exit")
    .reduce((acc, m) => {
      const supply = state.supplies.find(s => s.id === m.supplyId)
      const cost = supply ? m.quantity * supply.costPerUnit : 0
      return acc + cost
    }, 0)

  const wasteCosts = movements
    .filter(m => m.type === "waste")
    .reduce((acc, m) => {
      const supply = state.supplies.find(s => s.id === m.supplyId)
      const cost = supply ? m.quantity * supply.costPerUnit : 0
      return acc + cost
    }, 0)

  const totalExpenses = supplyCosts + wasteCosts
  const balance = totalIncome - totalExpenses
  const avgTicket = closed.length > 0 ? Math.round(totalIncome / closed.length) : 0
  const cash = closed.filter(o => o.paymentMethod === "cash").reduce((s, o) => s + o.total, 0)
  const card = closed.filter(o => o.paymentMethod === "card").reduce((s, o) => s + o.total, 0)

  // Movements for history table
  const allMovements = useMemo(() => {
    const saleLogs = closed.map(o => ({
      id: o.id,
      date: new Date(o.createdAt),
      type: "Ingreso",
      category: o.paymentMethod === "cash" ? "Venta Efectivo" : "Venta Tarjeta",
      amount: o.total,
      description: o.tableNumber ? `Mesa ${o.tableNumber}` : "Venta Directa"
    }))

    const expenseLogs = movements
      .filter(m => m.type === "exit" || m.type === "waste")
      .map(m => {
        const supply = state.supplies.find(s => s.id === m.supplyId)
        const cost = supply ? m.quantity * supply.costPerUnit : 0
        return {
          id: m.id,
          date: new Date(m.createdAt),
          type: "Egreso",
          category: m.type === "waste" ? "Merma" : "Insumo",
          amount: cost,
          description: `${m.supplyName} (${m.quantity} ${supply?.unit || ""})`
        }
      })

    return [...saleLogs, ...expenseLogs].sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [closed, movements, state.supplies])

  // Excel export functions
  const exportMovimientosToExcel = () => {
    const data = allMovements.map(m => ({
      Fecha: m.date.toLocaleString(),
      Tipo: m.type,
      Categoría: m.category,
      Descripción: m.description,
      Monto: m.type === "Ingreso" ? m.amount : -m.amount
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos")
    XLSX.writeFile(wb, `movimientos_${period}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const exportCortesToExcel = () => {
    const data = shifts.map(s => ({
      Fecha: new Date(s.openedAt).toLocaleDateString(),
      Usuario: s.userName || "—",
      Apertura: new Date(s.openedAt).toLocaleTimeString(),
      Cierre: s.closedAt ? new Date(s.closedAt).toLocaleTimeString() : "—",
      "Fondo Inicial": s.startAmount || 0,
      "Efectivo Esperado": s.expectedCash || 0,
      "Efectivo Real": s.endAmount ?? "—",
      Diferencia: s.difference ?? "—",
      Estado: s.status === "open" ? "Abierto" : "Cerrado"
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Cortes de Caja")
    XLSX.writeFile(wb, `cortes_caja_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Análisis Financiero</h2>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Hoy</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: "Ingresos Totales", value: `$${totalIncome.toLocaleString()}`, icon: ArrowUpRight, color: "text-green-500", bg: "bg-green-500/10" },
          { label: "Costo Insumos", value: `$${supplyCosts.toLocaleString()}`, icon: Package, color: "text-orange-500", bg: "bg-orange-500/10" },
          { label: "Mermas", value: `$${wasteCosts.toLocaleString()}`, icon: ArrowDownRight, color: "text-red-500", bg: "bg-red-500/10" },
          { label: "Balance Neto", value: `$${balance.toLocaleString()}`, icon: TrendingUp, color: balance >= 0 ? "text-primary" : "text-destructive", bg: "bg-primary/10" },
          { label: "Ticket Promedio", value: `$${avgTicket}`, icon: ShoppingBag, color: "text-blue-500", bg: "bg-blue-500/10" },
        ].map(kpi => (
          <Card key={kpi.label} className="border-none shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${kpi.bg}`}>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-muted-foreground truncate">{kpi.label}</p>
                <p className="text-xl font-bold tracking-tight">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="movimientos" className="w-full">
        <TabsList>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="cortes">Cortes de Caja</TabsTrigger>
        </TabsList>

        <TabsContent value="movimientos" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Historial de Movimientos</CardTitle>
                  <p className="text-sm text-muted-foreground">Ingresos y egresos detallados</p>
                </div>
                <Button variant="outline" size="sm" onClick={exportMovimientosToExcel} disabled={allMovements.length === 0}>
                  <Download className="h-4 w-4 mr-2" />Exportar Excel
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allMovements.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Sin movimientos en este periodo</TableCell>
                        </TableRow>
                      ) : (
                        allMovements.slice(0, 20).map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="text-xs">{m.date.toLocaleTimeString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                            <TableCell>
                              <Badge variant={m.type === "Ingreso" ? "success" as any : "destructive" as any} className="text-[10px] px-1.5 py-0">
                                {m.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{m.category}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{m.description}</TableCell>
                            <TableCell className={`text-right font-medium ${m.type === "Ingreso" ? "text-green-600" : "text-red-600"}`}>
                              {m.type === "Ingreso" ? "+" : "-"}${m.amount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Distribución Venta</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-green-500/10 text-green-500">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1"><span>Efectivo</span><span className="font-medium">${cash}</span></div>
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full" style={{ width: `${totalIncome > 0 ? (cash / totalIncome) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1"><span>Tarjeta</span><span className="font-medium">${card}</span></div>
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: `${totalIncome > 0 ? (card / totalIncome) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Métricas de Operación</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="text-muted-foreground">Órdenes Finalizadas</span>
                    <span className="font-bold">{closed.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="text-muted-foreground">Cortes de Caja</span>
                    <span className="font-bold">{shifts.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="text-muted-foreground">Gastos Insumos</span>
                    <span className="font-bold text-orange-500">${supplyCosts.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Mermas (Pérdida)</span>
                    <span className="font-bold text-red-500">${wasteCosts.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cortes" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Historial de Cortes de Caja</CardTitle>
                <p className="text-sm text-muted-foreground">Apertura y cierre de turnos</p>
              </div>
              <Button variant="outline" size="sm" onClick={exportCortesToExcel} disabled={shifts.length === 0}>
                <Download className="h-4 w-4 mr-2" />Exportar Excel
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Apertura</TableHead>
                      <TableHead>Cierre</TableHead>
                      <TableHead className="text-right">Fondo Inicial</TableHead>
                      <TableHead className="text-right">Efectivo Esperado</TableHead>
                      <TableHead className="text-right">Efectivo Real</TableHead>
                      <TableHead className="text-right">Diferencia</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shifts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">Sin cortes de caja registrados en este periodo</TableCell>
                      </TableRow>
                    ) : (
                      shifts.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs font-medium">
                            {new Date(s.openedAt).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                          </TableCell>
                          <TableCell className="text-xs">{s.userName || "—"}</TableCell>
                          <TableCell className="text-xs">
                            {new Date(s.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell className="text-xs">
                            {s.closedAt ? new Date(s.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs">${s.startAmount?.toLocaleString() || 0}</TableCell>
                          <TableCell className="text-right text-xs text-green-600">${s.expectedCash?.toLocaleString() || 0}</TableCell>
                          <TableCell className="text-right text-xs">${s.endAmount?.toLocaleString() || "—"}</TableCell>
                          <TableCell className={`text-right text-xs font-medium ${(s.difference || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {s.difference != null ? `${s.difference >= 0 ? "+" : ""}$${s.difference.toLocaleString()}` : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={s.status === "open" ? "default" : "secondary"} className="text-[10px]">
                              {s.status === "open" ? "Abierto" : "Cerrado"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div >
  )
}
