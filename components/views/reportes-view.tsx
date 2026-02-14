"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { useStore } from "@/lib/spa-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, ShoppingBag, TrendingUp, CreditCard, ArrowDownRight, ArrowUpRight, Calendar, Clock, Package, Download, Globe, RefreshCw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import * as XLSX from "xlsx"
import { fetchReportData } from "@/lib/actions"

// --- Date formatting helpers ---
function formatFullDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0")
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

function formatDateOnly(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0")
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// --- Platform label & color config ---
const platformConfig: Record<string, { label: string; color: string; bg: string }> = {
  direct: { label: "Directo", color: "text-emerald-500", bg: "bg-emerald-500" },
  rappi: { label: "Rappi", color: "text-orange-500", bg: "bg-orange-500" },
  uber_eats: { label: "Uber Eats", color: "text-green-600", bg: "bg-green-600" },
  didi: { label: "Didi Food", color: "text-amber-500", bg: "bg-amber-500" },
}

function getPlatformInfo(source: string | null) {
  return platformConfig[source || "direct"] || { label: source || "Otro", color: "text-purple-500", bg: "bg-purple-500" }
}

export function ReportesView() {
  const { state, dispatch } = useStore()
  const [period, setPeriod] = useState<"day" | "week" | "month">("day")
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // --- Auto-refresh polling ---
  const refreshData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const result = await fetchReportData()
      if (result.success && result.data) {
        dispatch({ type: "SET_ORDERS", payload: result.data.orders as any })
        dispatch({ type: "SET_SUPPLY_MOVEMENTS", payload: result.data.supplyMovements as any })
        dispatch({ type: "SET_CASH_SHIFTS", payload: result.data.cashShifts as any })
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error("[ReportesView] Refresh error:", err)
    } finally {
      setIsRefreshing(false)
    }
  }, [dispatch])

  useEffect(() => {
    intervalRef.current = setInterval(refreshData, 15000) // 15 seconds
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [refreshData])

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

  // --- Platform sales breakdown ---
  const platformSales = useMemo(() => {
    const breakdown: Record<string, number> = {}
    closed.forEach(o => {
      const src = o.source || "direct"
      breakdown[src] = (breakdown[src] || 0) + o.total
    })
    // Sort by amount descending
    return Object.entries(breakdown)
      .map(([source, amount]) => ({ source, amount, ...getPlatformInfo(source) }))
      .sort((a, b) => b.amount - a.amount)
  }, [closed])

  const onlineSalesTotal = useMemo(() => {
    return platformSales
      .filter(p => p.source !== "direct")
      .reduce((sum, p) => sum + p.amount, 0)
  }, [platformSales])

  const onlineOrderCount = useMemo(() => {
    return closed.filter(o => o.source && o.source !== "direct").length
  }, [closed])

  // Movements for history table
  const allMovements = useMemo(() => {
    const saleLogs = closed.map(o => ({
      id: o.id,
      date: new Date(o.createdAt),
      type: "Ingreso",
      category: o.paymentMethod === "cash" ? "Venta Efectivo" : "Venta Tarjeta",
      amount: o.total,
      description: o.tableNumber ? `Mesa ${o.tableNumber}` : "Venta Directa",
      source: o.source || "direct"
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
          description: `${m.supplyName} (${m.quantity} ${supply?.unit || ""})`,
          source: ""
        }
      })

    return [...saleLogs, ...expenseLogs].sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [closed, movements, state.supplies])

  // Excel export functions
  const exportMovimientosToExcel = () => {
    const data = allMovements.map(m => ({
      Fecha: formatFullDate(m.date),
      Tipo: m.type,
      Categoría: m.category,
      Plataforma: m.source ? getPlatformInfo(m.source).label : "—",
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
      Fecha: formatDateOnly(new Date(s.openedAt)),
      Usuario: s.userName || "—",
      Apertura: new Date(s.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      Cierre: s.closedAt ? new Date(s.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—",
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
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Análisis Financiero</h2>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Fecha: {formatDateOnly(new Date())} · Última actualización: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            {isRefreshing && <RefreshCw className="h-3 w-3 animate-spin ml-1" />}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={refreshData} disabled={isRefreshing} title="Actualizar ahora">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
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
          <TabsTrigger value="plataformas">Plataformas</TabsTrigger>
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
                            <TableCell className="text-xs">{formatFullDate(m.date)}</TableCell>
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
                      <div className="flex justify-between text-sm mb-1"><span>Efectivo</span><span className="font-medium">${cash.toLocaleString()}</span></div>
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
                      <div className="flex justify-between text-sm mb-1"><span>Tarjeta</span><span className="font-medium">${card.toLocaleString()}</span></div>
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

        {/* --- Ventas por Plataforma Tab --- */}
        <TabsContent value="plataformas" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Summary cards */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5 text-purple-500" />
                  Ventas por Plataforma
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Desglose de ingresos por canal de venta
                </p>
              </CardHeader>
              <CardContent>
                {platformSales.length === 0 ? (
                  <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                    Sin ventas registradas en este periodo
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {platformSales.map(p => {
                      const pct = totalIncome > 0 ? (p.amount / totalIncome) * 100 : 0
                      const orderCount = closed.filter(o => (o.source || "direct") === p.source).length
                      return (
                        <div key={p.source} className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className={`h-3 w-3 rounded-full ${p.bg}`} />
                              <span className="font-medium">{p.label}</span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                                {orderCount} {orderCount === 1 ? "orden" : "órdenes"}
                              </Badge>
                            </div>
                            <span className="font-bold">${p.amount.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-secondary h-2 rounded-full overflow-hidden">
                              <div className={`${p.bg} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-12 text-right">{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-6">
              {/* Online sales summary card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resumen Plataformas en Línea</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="text-muted-foreground">Total Ventas en Línea</span>
                    <span className="font-bold text-purple-600">${onlineSalesTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="text-muted-foreground">Órdenes en Línea</span>
                    <span className="font-bold">{onlineOrderCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="text-muted-foreground">% del Total</span>
                    <span className="font-bold">
                      {totalIncome > 0 ? ((onlineSalesTotal / totalIncome) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Ticket Promedio en Línea</span>
                    <span className="font-bold">
                      ${onlineOrderCount > 0 ? Math.round(onlineSalesTotal / onlineOrderCount).toLocaleString() : "0"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Platform detail list */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detalle por Plataforma</CardTitle>
                </CardHeader>
                <CardContent>
                  {platformSales.filter(p => p.source !== "direct").length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Sin ventas en plataformas en línea
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {platformSales.filter(p => p.source !== "direct").map(p => {
                        const orderCount = closed.filter(o => o.source === p.source).length
                        return (
                          <div key={p.source} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                            <div className={`h-8 w-8 flex items-center justify-center rounded-full ${p.bg}/10 ${p.color}`}>
                              <Globe className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{p.label}</p>
                              <p className="text-xs text-muted-foreground">{orderCount} órdenes</p>
                            </div>
                            <p className="text-sm font-bold">${p.amount.toLocaleString()}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
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
                            {formatDateOnly(new Date(s.openedAt))}
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
