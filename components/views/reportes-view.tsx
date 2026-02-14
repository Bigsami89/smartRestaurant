"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useStore } from "@/lib/spa-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, ShoppingBag, TrendingUp, CreditCard, ArrowDownRight, ArrowUpRight, Clock, Package, Download, Globe, RefreshCw } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import * as XLSX from "xlsx"
import { getHistoricalReports } from "@/lib/actions"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { startOfDay, endOfDay, subDays } from "date-fns"
import { toast } from "sonner"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Area, AreaChart, CartesianGrid } from "recharts"

// --- Date formatting helpers ---
function formatFullDate(date: Date): string {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, "0")
  const month = (d.getMonth() + 1).toString().padStart(2, "0")
  const year = d.getFullYear()
  const hours = d.getHours().toString().padStart(2, "0")
  const minutes = d.getMinutes().toString().padStart(2, "0")
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

function formatDateOnly(date: Date): string {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, "0")
  const month = (d.getMonth() + 1).toString().padStart(2, "0")
  const year = d.getFullYear()
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
  const { state } = useStore()
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date())
  })

  const [reportData, setReportData] = useState<{
    orders: any[],
    supplyMovements: any[],
    cashShifts: any[]
  }>({ orders: [], supplyMovements: [], cashShifts: [] })

  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const loadData = useCallback(async () => {
    if (!dateRange?.from) return

    setIsLoading(true)
    try {
      const from = dateRange.from
      const to = dateRange.to || dateRange.from // If no end date, assume single day

      const res = await getHistoricalReports(from, to)
      if (res.success && res.data) {
        setReportData(res.data)
        setLastUpdated(new Date())
      } else {
        toast.error("Error al cargar datos históricos")
      }
    } catch (e) {
      console.error(e)
      toast.error("Error de conexión")
    } finally {
      setIsLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter Logic
  const filteredData = useMemo(() => {
    // Filter by branch
    const orders = reportData.orders.filter(o => o.branchId === state.currentBranchId)
    const movements = reportData.supplyMovements.filter(m => m.branchId === state.currentBranchId)
    const shifts = reportData.cashShifts.filter(s => s.branchId === state.currentBranchId)

    return { orders, movements, shifts }
  }, [reportData, state.currentBranchId])

  const { orders: closed, movements, shifts } = filteredData

  // --- KPIs ---
  const totalIncome = closed.reduce((s, o) => s + o.total, 0)

  // Costs
  const supplyCosts = movements
    .filter(m => m.type === "exit")
    .reduce((acc, m) => {
      // We need supply cost info. 
      // Currently actions.ts returns partial supply info in movement, or we rely on state.supplies?
      // getHistoricalReports joins supply info but let's check what it returns.
      // It returns `supplyName` but not cost. We need to look up cost in `state.supplies`
      const supply = state.supplies.find(s => s.name === m.supplyName) // Fallback by name if ID matches?
      // Actually `getHistoricalReports` returns `supplyName` and `branchId`. 
      // Better to use state.supplies to find costPerUnit.
      // We need supplyID. `getHistoricalReports` returns `supplyId`.
      const s = state.supplies.find(sup => sup.id === m.supplyId)
      return acc + (s ? m.quantity * s.costPerUnit : 0)
    }, 0)

  const wasteCosts = movements
    .filter(m => m.type === "waste")
    .reduce((acc, m) => {
      const s = state.supplies.find(sup => sup.id === m.supplyId)
      return acc + (s ? m.quantity * s.costPerUnit : 0)
    }, 0)

  const totalExpenses = supplyCosts + wasteCosts
  const balance = totalIncome - totalExpenses
  const avgTicket = closed.length > 0 ? Math.round(totalIncome / closed.length) : 0
  const cash = closed.filter(o => o.paymentMethod === "cash").reduce((s, o) => s + o.total, 0)
  const card = closed.filter(o => o.paymentMethod === "card").reduce((s, o) => s + o.total, 0)

  // --- Charts Data ---

  // Hourly Sales
  const hourlyData = useMemo(() => {
    const hours = Array(24).fill(0).map((_, i) => ({ hour: i, total: 0, count: 0 }))
    closed.forEach(o => {
      const h = new Date(o.createdAt).getHours()
      hours[h].total += o.total
      hours[h].count += 1
    })
    return hours.map(h => ({
      hour: `${h.hour}:00`,
      Ventas: h.total,
      Órdenes: h.count
    }))
  }, [closed])

  // Top Products
  const topProducts = useMemo(() => {
    const products: Record<string, { name: string, qty: number, total: number }> = {}
    closed.forEach(o => {
      o.items.forEach((i: any) => {
        if (!products[i.productName]) {
          products[i.productName] = { name: i.productName, qty: 0, total: 0 }
        }
        products[i.productName].qty += i.quantity
        products[i.productName].total += i.totalPrice
      })
    })
    return Object.values(products)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
  }, [closed])

  // Platform Sales
  const platformSales = useMemo(() => {
    const breakdown: Record<string, number> = {}
    closed.forEach(o => {
      const src = o.source || "direct"
      breakdown[src] = (breakdown[src] || 0) + o.total
    })
    return Object.entries(breakdown)
      .map(([source, amount]) => ({ source, amount, ...getPlatformInfo(source) }))
      .sort((a, b) => b.amount - a.amount)
  }, [closed])

  const onlineSalesTotal = platformSales.filter(p => p.source !== "direct").reduce((s, p) => s + p.amount, 0)
  const onlineOrderCount = closed.filter(o => o.source && o.source !== "direct").length

  // Movements List
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
          description: `${m.supplyName || "Insumo"} (${m.quantity} ${supply?.unit || ""})`,
          source: ""
        }
      })
    // Sort reverse chronological
    return [...saleLogs, ...expenseLogs].sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [closed, movements, state.supplies])


  // --- Export Functions ---
  const exportMovimientosToExcel = () => {
    try {
      if (allMovements.length === 0) {
        toast.error("No hay datos para exportar")
        return
      }

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
      const fileName = `movimientos_${formatDateOnly(dateRange?.from || new Date()).replace(/\//g, "-")}.xlsx`
      XLSX.writeFile(wb, fileName)
      toast.success("Exportación exitosa")
    } catch (e) {
      console.error(e)
      toast.error("Error al exportar Excel")
    }
  }

  const exportCortesToExcel = () => {
    try {
      if (shifts.length === 0) {
        toast.error("No hay cortes para exportar")
        return
      }

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
      XLSX.writeFile(wb, `cortes_caja_${formatDateOnly(new Date()).replace(/\//g, "-")}.xlsx`)
      toast.success("Exportación exitosa")
    } catch (e) {
      console.error(e)
      toast.error("Error al exportar")
    }
  }

  const exportTopProducts = () => {
    try {
      if (topProducts.length === 0) return toast.error("No hay datos")
      const data = topProducts.map(p => ({
        Producto: p.name,
        Cantidad: p.qty,
        Total: p.total
      }))
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Top Productos")
      XLSX.writeFile(wb, `top_productos.xlsx`)
      toast.success("Exportación exitosa")
    } catch (e) { toast.error("Error al exportar") }
  }


  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Análisis Financiero</h2>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Última actualización: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => loadData()} disabled={isLoading} title="Actualizar ahora">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <DatePickerWithRange date={dateRange} setDate={setDateRange} className="w-full sm:w-auto" />
        </div>
      </div>

      {/* KPIs */}
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="movimientos" className="w-full">
        <TabsList>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
          <TabsTrigger value="plataformas">Plataformas</TabsTrigger>
          <TabsTrigger value="cortes">Cortes de Caja</TabsTrigger>
        </TabsList>

        <TabsContent value="movimientos" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Historial de Movimientos</CardTitle>
                  <p className="text-sm text-muted-foreground">Ingresos y egresos detallados del periodo</p>
                </div>
                <Button variant="outline" size="sm" onClick={exportMovimientosToExcel} disabled={allMovements.length === 0}>
                  <Download className="h-4 w-4 mr-2" />Exportar Excel
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-[500px] overflow-auto">
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
                        allMovements.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="text-xs whitespace-nowrap">{formatFullDate(m.date)}</TableCell>
                            <TableCell>
                              <Badge variant={m.type === "Ingreso" ? "success" as any : "destructive" as any} className="text-[10px] px-1.5 py-0">
                                {m.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{m.category}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={m.description}>{m.description}</TableCell>
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
            </div>
          </div>
        </TabsContent>

        {/* Tab: Estadísticas (NEW) */}
        <TabsContent value="estadisticas" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Hourly Sales Chart */}
            <Card className="col-span-2 md:col-span-1">
              <CardHeader>
                <CardTitle>Ventas por Hora</CardTitle>
                <p className="text-sm text-muted-foreground">Distribución de ventas durante el día</p>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="hour" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                    <Tooltip
                      formatter={(value: number) => [`$${value.toLocaleString()}`, "Ventas"]}
                      contentStyle={{ borderRadius: '8px' }}
                    />
                    <Area type="monotone" dataKey="Ventas" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card className="col-span-2 md:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Productos Más Vendidos</CardTitle>
                  <p className="text-sm text-muted-foreground">Top 10 productos por ingresos</p>
                </div>
                <Button variant="ghost" size="icon" onClick={exportTopProducts}>
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-6 flex items-center justify-center rounded bg-secondary text-xs font-medium text-muted-foreground">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.qty} unidades</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold">${p.total.toLocaleString()}</p>
                    </div>
                  ))}
                  {topProducts.length === 0 && <p className="text-center text-muted-foreground text-sm">Sin datos</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="plataformas" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
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
