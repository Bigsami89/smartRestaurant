"use client"

import { useState, useMemo, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/spa-store"
import type { OrderItem, Order } from "@/lib/types"
import { ItemCustomizer } from "@/components/item-customizer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Plus, Trash2, Edit2, Loader2, X, Send, Banknote, CreditCard, Layout, Printer, UtensilsCrossed, ReceiptText, ShoppingBag, Store } from "lucide-react"
import { submitOrder, closeOrder, openShift, closeShift, invoiceOrder, processDirectSale } from "@/lib/actions"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"

function TipSection({ subtotal, tipMode, setTipMode, tipPercent, setTipPercent, tipFixed, setTipFixed, tipAmount }: {
  subtotal: number; tipMode: "percent" | "fixed"; setTipMode: (m: "percent" | "fixed") => void
  tipPercent: number; setTipPercent: (n: number) => void; tipFixed: string; setTipFixed: (s: string) => void; tipAmount: number
}) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <Label className="text-xs font-semibold text-muted-foreground">Propina</Label>
      <div className="mt-2 flex gap-1.5">
        {[0, 10, 15, 20].map(pct => (
          <Button key={pct} variant={tipMode === "percent" && tipPercent === pct ? "default" : "outline"} size="sm" className="flex-1 text-xs"
            onClick={() => { setTipMode("percent"); setTipPercent(pct); setTipFixed("") }}>
            {pct === 0 ? "Sin" : `${pct}%`}
          </Button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Monto fijo:</span>
        <Input type="number" min="0" placeholder="$0" className="h-7 w-24 text-xs" value={tipFixed}
          onChange={e => { setTipMode("fixed"); setTipPercent(0); setTipFixed(e.target.value) }} />
      </div>
      {tipAmount > 0 && (
        <div className="mt-1.5 flex justify-between text-xs">
          <span className="text-muted-foreground">Propina{tipMode === "percent" ? ` (${tipPercent}%)` : ""}</span>
          <span className="font-medium">${tipAmount}</span>
        </div>
      )}
    </div>
  )
}

function ShiftOpeningView({ onOpen }: { onOpen: (amount: number) => void }) {
  const [amount, setAmount] = useState("")
  const [isPending, setIsPending] = useState(false)

  const handleOpen = async () => {
    const val = parseFloat(amount)
    if (isNaN(val) || val < 0) return
    setIsPending(true)
    await onOpen(val)
    setIsPending(false)
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-primary/20 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <ShoppingBag className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Apertura de Caja</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Ingresa el monto inicial para comenzar el día</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="startAmount">Monto Inicial (Fondo de caja)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
              <Input id="startAmount" type="number" placeholder="0.00" className="pl-7 text-lg h-12" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
          </div>
          <Button className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20" onClick={handleOpen} disabled={isPending || !amount}>
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Abrir Caja"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function CashPaymentDialog({ open, onClose, onConfirm, total, isPending }: {
  open: boolean, onClose: () => void, onConfirm: () => void, total: number, isPending: boolean
}) {
  const [received, setReceived] = useState("")
  const change = Math.max(0, (parseFloat(received) || 0) - total)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Cobro en Efectivo</DialogTitle>
          <DialogDescription>Confirma el monto recibido para calcular el cambio.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Total a cobrar:</span>
            <span className="text-2xl font-black text-primary">${total.toLocaleString()}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="received">Efectivo Recibido</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
              <Input id="received" type="number" placeholder="0.00" className="pl-7 text-xl h-12" value={received} onChange={e => setReceived(e.target.value)} autoFocus />
            </div>
          </div>

          <div className="flex justify-between items-center p-4 bg-primary/10 rounded-xl border border-primary/20">
            <span className="text-sm font-bold text-primary uppercase tracking-wider">Cambio a devolver:</span>
            <span className="text-2xl font-black text-primary">${change.toLocaleString()}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="h-12 px-8 font-bold text-lg" onClick={onConfirm} disabled={isPending || (parseFloat(received) || 0) < total}>
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Completar Venta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ShiftClosingDialog({ open, onClose, onConfirm, isPending, expectedCash, shift }: {
  open: boolean, onClose: () => void, onConfirm: (amount: number) => void, isPending: boolean, expectedCash: number, shift: any
}) {
  const [amount, setAmount] = useState("")

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Cierre de Caja</DialogTitle>
          <DialogDescription>
            Revisa el resumen del turno e ingresa el efectivo contado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4">
          <div className="bg-muted/50 p-3 rounded-lg border">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Fondo Inicial</p>
            <p className="text-lg font-bold">${shift?.startAmount?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-muted/50 p-3 rounded-lg border">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Ventas Efectivo</p>
            <p className="text-lg font-bold text-success">+${(shift?.expectedCash - shift?.startAmount || 0).toLocaleString()}</p>
          </div>
          <div className="bg-muted/50 p-3 rounded-lg border">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Ventas Tarjeta</p>
            <p className="text-lg font-bold text-primary">${shift?.expectedCard?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
            <p className="text-[10px] text-primary uppercase font-bold">Total Esperado</p>
            <p className="text-xl font-black text-primary">${expectedCash.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="endAmount" className="text-base font-bold">Efectivo contado físico</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
            <Input id="endAmount" type="number" placeholder="0.00" className="pl-7 text-2xl h-14 font-black" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="h-12 px-6">Cancelar</Button>
          <Button className="h-12 px-8 font-bold text-lg" onClick={() => onConfirm(parseFloat(amount))} disabled={isPending || !amount}>
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Finalizar Turno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PosView() {
  const { state, dispatch, authState } = useStore()
  const router = useRouter()

  // Get current shift for this branch (from cashShifts filtered by branchId)
  const currentShift = useMemo(() => {
    return state.cashShifts.find(s =>
      s.status === "open" && s.branchId === state.currentBranchId
    ) || null
  }, [state.cashShifts, state.currentBranchId])

  const openOrders = state.orders.filter(o => o.status === "open" && o.tableId && o.branchId === state.currentBranchId)


  const [isPending, startTransition] = useTransition()
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [showCashDialog, setShowCashDialog] = useState(false)
  const [paymentTotal, setPaymentTotal] = useState(0)
  const [paymentCallback, setPaymentCallback] = useState<(() => void) | null>(null)

  // Mesa mode
  const [selId, setSelId] = useState<string | null>(null)
  const selOrder = openOrders.find(o => o.id === selId)
  const [mTipMode, setMTipMode] = useState<"percent" | "fixed">("percent")

  // Edit mode
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [mTipPct, setMTipPct] = useState(0)
  const [mTipFixed, setMTipFixed] = useState("")
  const mSub = selOrder?.total ?? 0
  const mTip = mTipMode === "percent" ? Math.round(mSub * mTipPct / 100) : (parseFloat(mTipFixed) || 0)
  const mTotal = mSub + mTip

  async function handleOpenShift(amount: number) {
    const res = await openShift(amount, state.currentBranchId || undefined)
    if (res.success) {
      router.refresh()
    } else {
      if (res.error?.includes("Ya existe un turno abierto")) {
        // If it exists but UI didn't show it, force refresh to sync
        router.refresh()
      } else {
        alert(res.error || "Error al abrir la caja")
      }
    }
  }

  async function handleCloseShift(amount: number) {
    if (!currentShift) return
    setIsClosing(true)
    const res = await closeShift(currentShift.id, amount)
    setIsClosing(false)
    if (res.success) {
      setShowCloseDialog(false)
      router.refresh()
    } else {
      alert(res.error)
    }
  }

  const [isClosing, setIsClosing] = useState(false)

  function handleChargeMesa(method: "cash" | "card") {
    if (!selOrder) return

    if (method === "cash") {
      setPaymentTotal(mTotal)
      setPaymentCallback(() => async () => {
        startTransition(async () => {
          const res = await closeOrder(selOrder.id, "cash", mTip, "")
          if (res.success) {
            setSelId(null); setMTipPct(0); setMTipFixed("")
            setShowCashDialog(false)
            router.refresh()
          }
        })
      })
      setShowCashDialog(true)
      return
    }

    let folio = ""
    if (method === "card") {
      folio = window.prompt("Ingrese el folio de la transacción (opcional):") || ""
    }
    startTransition(async () => {
      const res = await closeOrder(selOrder.id, method, mTip, folio)
      if (res.success) {
        setSelId(null); setMTipPct(0); setMTipFixed("")
        router.refresh()
      }
    })
  }

  // Direct mode
  const [dItems, setDItems] = useState<OrderItem[]>([])
  const [dSearch, setDSearch] = useState("")
  const [dCat, setDCat] = useState("Todos")
  const [dProd, setDProd] = useState<typeof state.products[0] | null>(null)
  const [dTipMode, setDTipMode] = useState<"percent" | "fixed">("percent")
  const [dTipPct, setDTipPct] = useState(0)
  const [dTipFixed, setDTipFixed] = useState("")
  const [dSource, setDSource] = useState("direct")
  const dSub = dItems.reduce((s, i) => s + i.totalPrice, 0)
  const dTip = dTipMode === "percent" ? Math.round(dSub * dTipPct / 100) : (parseFloat(dTipFixed) || 0)
  const dTotal = dSub + dTip
  const dCats = useMemo(() => ["Todos", ...new Set(state.products.filter(p => p.branchId === state.currentBranchId).map(p => p.category))], [state.products, state.currentBranchId])
  const dFiltered = state.products.filter(p => p.branchId === state.currentBranchId && p.available && (dCat === "Todos" || p.category === dCat) && p.name.toLowerCase().includes(dSearch.toLowerCase()))

  // Get order sources from configLists
  const orderSourcesList = state.configLists.find(l => l.name === "order_sources")
  const sourcesOptions = orderSourcesList?.items.filter(i => i.active) || [{ id: "default", value: "direct", label: "Directo", active: true, sortOrder: 0 }]

  function handleChargeDirect(method: "cash" | "card", sendKitchen: boolean) {
    if (dItems.length === 0) return

    if (!sendKitchen && method === "cash") {
      setPaymentTotal(dTotal)
      setPaymentCallback(() => async () => {
        startTransition(async () => {
          const res = await processDirectSale(dItems, "cash", dTip, "", dSource, state.currentBranchId || undefined)
          if (res.success) {
            setDItems([]); setDTipPct(0); setDTipFixed(""); setDTipMode("percent"); setDSource("direct")
            setShowCashDialog(false)
            router.refresh()
          }
        })
      })
      setShowCashDialog(true)
      return
    }

    let folio = ""
    if (!sendKitchen && method === "card") {
      folio = window.prompt("Ingrese el folio de la transacción (opcional):") || ""
    }
    startTransition(async () => {
      if (sendKitchen) {
        const res = await submitOrder(null, dItems, dSource)
        if (res.success && res.orderId) {
          setDItems([]); setDTipPct(0); setDTipFixed(""); setDTipMode("percent"); setDSource("direct")
          router.refresh()
        }
      } else {
        const res = await processDirectSale(dItems, method, dTip, folio, dSource, state.currentBranchId || undefined)
        if (res.success) {
          setDItems([]); setDTipPct(0); setDTipFixed(""); setDTipMode("percent"); setDSource("direct")
          router.refresh()
        }
      }
    })
  }

  if (!currentShift || currentShift.status === "closed") {
    return <ShiftOpeningView onOpen={handleOpenShift} />
  }

  const expectedCashTotal = (currentShift.expectedCash || currentShift.startAmount || 0)
  const expectedCardTotal = (currentShift.expectedCard || 0)

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mb-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-2 w-2 rounded-full p-0 bg-green-500 border-green-500" /> Turno Abierto
          <span className="text-xs text-muted-foreground ml-2">Abr: {new Date(currentShift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div className="flex justify-center gap-6">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Efectivo esperado</p>
            <p className="text-sm font-bold text-success">${expectedCashTotal.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Tarjeta acumulado</p>
            <p className="text-sm font-bold text-primary">${expectedCardTotal.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-destructive text-destructive hover:bg-destructive hover:text-white" onClick={() => setShowCloseDialog(true)}>
            <X className="h-3.5 w-3.5" /> Cerrar Caja
          </Button>
        </div>
      </div>

      <Tabs defaultValue="mesa" className="flex flex-1 flex-col">
        <TabsList className="mx-auto">
          <TabsTrigger value="mesa">Por mesa</TabsTrigger>
          <TabsTrigger value="directa">Venta directa</TabsTrigger>
          <TabsTrigger value="recientes">Recientes</TabsTrigger>
        </TabsList>

        {/* Tab: Mesa */}
        <TabsContent value="mesa" className="flex flex-1 gap-4 overflow-hidden mt-4 data-[state=inactive]:hidden">
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
            <Card className="border-none bg-muted/30 mb-2">
              <CardHeader className="p-3"><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cuentas Abiertas</p></CardHeader>
            </Card>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {openOrders.length === 0 ? (
                <div className="col-span-full">
                  <Card className="border-dashed bg-transparent border-muted-foreground/20">
                    <CardContent className="p-10 flex flex-col items-center justify-center text-muted-foreground">
                      <Layout className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-sm font-medium">No hay mesas con cuenta abierta</p>
                      <p className="text-xs opacity-60">Las nuevas órdenes aparecerán aquí</p>
                    </CardContent>
                  </Card>
                </div>
              ) : openOrders.map(o => (
                <button key={o.id} onClick={() => { setSelId(o.id); setMTipPct(0); setMTipFixed("") }}
                  className={`flex flex-col gap-1 rounded-xl border p-4 text-left transition-all hover:shadow-md ${selId === o.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:bg-accent/50"}`}>
                  <div className="flex justify-between items-center w-full">
                    <span className="font-bold text-sm">Mesa {o.tableNumber}</span>
                    <Badge variant="outline" className="text-[9px] h-4 py-0 font-bold">{o.items.length}</Badge>
                  </div>
                  <p className="mt-2 text-xl font-bold text-primary">${o.total}</p>
                </button>
              ))}
            </div>
          </div>
          {selOrder && (
            <div className="flex w-72 shrink-0 flex-col rounded-xl border bg-card lg:w-80 shadow-sm h-full">
              <div className="border-b p-4"><span className="font-semibold">Mesa {selOrder.tableNumber}</span></div>
              <div className="flex-1 overflow-y-auto p-4">
                {selOrder.items.map(i => (
                  <div key={i.id} className="flex justify-between border-b py-2 text-sm last:border-0">
                    <span>{i.quantity}x {i.productName}</span><span>${i.totalPrice}</span>
                  </div>
                ))}
              </div>
              <div className="border-t p-4 flex flex-col gap-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Consumo</span><span>${mSub}</span></div>
                <TipSection subtotal={mSub} tipMode={mTipMode} setTipMode={setMTipMode} tipPercent={mTipPct} setTipPercent={setMTipPct} tipFixed={mTipFixed} setTipFixed={setMTipFixed} tipAmount={mTip} />
                <div className="flex justify-between text-lg font-bold"><span>Total</span><span>${mTotal}</span></div>
                <div className="flex gap-2">
                  <Button className="flex-1 gap-1" onClick={() => handleChargeMesa("cash")} disabled={isPending}>{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}Efectivo</Button>
                  <Button className="flex-1 gap-1" variant="secondary" onClick={() => handleChargeMesa("card")} disabled={isPending}>{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}Tarjeta</Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab: Directa */}
        <TabsContent value="directa" className="flex flex-1 gap-4 overflow-hidden mt-4 data-[state=inactive]:hidden">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
            <div className="relative shrink-0"><Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-8" placeholder="Buscar..." value={dSearch} onChange={e => setDSearch(e.target.value)} /></div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 shrink-0">{dCats.map(c => <Button key={c} size="sm" variant={dCat === c ? "default" : "outline"} onClick={() => setDCat(c)} className="shrink-0 text-xs">{c}</Button>)}</div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {dFiltered.length === 0 ? (
                  <div className="col-span-full">
                    <Card className="border-dashed bg-transparent border-muted-foreground/20">
                      <CardContent className="p-10 flex flex-col items-center justify-center text-muted-foreground text-center">
                        <UtensilsCrossed className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm font-medium">No se encontraron productos</p>
                      </CardContent>
                    </Card>
                  </div>
                ) : dFiltered.map(p => (
                  <button key={p.id} onClick={() => setDProd(p)} className="flex flex-col justify-between rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md hover:bg-accent/50 group h-auto min-h-[100px]">
                    <p className="text-sm font-medium leading-tight group-hover:text-foreground/90">{p.name}</p>
                    <p className="mt-2 font-bold text-primary text-lg">${p.price}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex w-72 shrink-0 flex-col rounded-xl border bg-card lg:w-80">
            <div className="border-b p-3 flex items-center justify-between"><span className="font-semibold">Ticket</span><Badge variant="secondary">{dItems.length}</Badge></div>
            <div className="flex-1 overflow-y-auto p-3">
              {dItems.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">Agrega productos</p> : dItems.map(i => (
                <div key={i.id} className="flex items-center gap-2 border-b py-1.5 text-sm last:border-0">
                  <span className="flex-1">{i.quantity}x {i.productName}</span><span>${i.totalPrice}</span>
                  <button onClick={() => setDItems(prev => prev.filter(x => x.id !== i.id))}><X className="h-3 w-3 text-muted-foreground" /></button>
                </div>
              ))}
            </div>
            <div className="border-t p-3 flex flex-col gap-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Consumo</span><span>${dSub}</span></div>
              <TipSection subtotal={dSub} tipMode={dTipMode} setTipMode={setDTipMode} tipPercent={dTipPct} setTipPercent={setDTipPct} tipFixed={dTipFixed} setTipFixed={setDTipFixed} tipAmount={dTip} />
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={dSource} onValueChange={setDSource}>
                  <SelectTrigger className="flex-1 h-8 text-xs">
                    <SelectValue placeholder="Fuente" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourcesOptions.map(s => (
                      <SelectItem key={s.id} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between text-base font-bold"><span>Total</span><span>${dTotal}</span></div>
              <div className="flex gap-2">
                <Button className="flex-1 gap-1" disabled={dItems.length === 0 || isPending} onClick={() => handleChargeDirect("cash", false)}>{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}Efectivo</Button>
                <Button className="flex-1 gap-1" variant="secondary" disabled={dItems.length === 0 || isPending} onClick={() => handleChargeDirect("card", false)}>{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}Tarjeta</Button>
              </div>
            </div>
          </div>
          <ItemCustomizer product={dProd} open={!!dProd} onClose={() => setDProd(null)} onAdd={i => setDItems(prev => [...prev, i])} dinerIndex={0} />
        </TabsContent>

        {/* Tab: Recientes */}
        <TabsContent value="recientes" className="flex flex-1 gap-4 overflow-hidden mt-4 data-[state=inactive]:hidden px-1">
          <div className="flex-1 overflow-y-auto">
            <Card className="border-none bg-muted/30 mb-4">
              <CardHeader className="p-4"><CardTitle className="text-sm font-bold uppercase tracking-widest">Órdenes Pagadas Recientemente</CardTitle></CardHeader>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-6">
              {state.orders.filter(o => o.status === "closed").length === 0 ? (
                <div className="col-span-full">
                  <Card className="border-dashed bg-transparent border-muted-foreground/20">
                    <CardContent className="p-12 flex flex-col items-center justify-center text-muted-foreground text-center">
                      <Layout className="h-10 w-10 mb-2 opacity-10" />
                      <p className="font-medium text-sm">No hay ventas recientes</p>
                    </CardContent>
                  </Card>
                </div>
              ) : state.orders.filter(o => o.status === "closed").map(o => (
                <Card key={o.id} className="shadow-sm overflow-hidden border-none bg-card/50">
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm">Orden {o.tableNumber != null ? `Mesa ${o.tableNumber}` : "Directa"}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {o.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}</p>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {o.source && o.source !== 'direct' && (
                          <Badge variant="secondary" className="text-[9px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                            {sourcesOptions.find(s => s.value === o.source)?.label || o.source}
                          </Badge>
                        )}
                        <Badge variant={o.invoiced ? "default" : "outline"} className="text-[10px] border-primary text-primary bg-primary/5">
                          {o.invoiced ? "Facturado" : "Sin Factura"}
                        </Badge>
                      </div>
                    </div>

                    <div className="py-2 border-t border-b border-dashed flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-muted-foreground uppercase">Total Pagado</span>
                        <span className="text-lg font-black text-primary">${o.total}</span>
                      </div>
                      {(o.createdByName || o.closedByName) && (
                        <div className="text-[10px] text-muted-foreground">
                          {o.createdByName && <span>Tomó: <strong>{o.createdByName}</strong></span>}
                          {o.createdByName && o.closedByName && <span> • </span>}
                          {o.closedByName && <span>Cobró: <strong>{o.closedByName}</strong></span>}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-[11px] font-bold uppercase gap-1.5" onClick={() => {
                        const win = window.open('', '_blank');
                        if (win) {
                          const { config } = state;
                          win.document.write(`
                            <html>
                              <head><title>Ticket - ${o.id}</title></head>
                              <body style="font-family: monospace; width: 300px; padding: 10px; font-size: 12px; color: #333;">
                                <div style="text-align: center; margin-bottom: 15px;">
                                  <h1 style="margin: 0; font-size: 16px;">${config.name}</h1>
                                  <p style="margin: 2px 0;">${config.address}</p>
                                  <p style="margin: 2px 0;">Tel: ${config.phone}</p>
                                  <p style="margin: 2px 0;">RFC: ${config.rfc}</p>
                                </div>
                                <div style="border-bottom: 1px dashed #ccc; padding-bottom: 5px; margin-bottom: 10px;">
                                  <div style="display: flex; justify-content: space-between;"><span>Folio:</span><span>${o.id.slice(-6).toUpperCase()}</span></div>
                                  <div style="display: flex; justify-content: space-between;"><span>Fecha:</span><span>${new Date(o.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span></div>
                                  <div style="display: flex; justify-content: space-between;"><span>${o.tableNumber != null ? 'Mesa:' : 'Venta:'}</span><span>${o.tableNumber != null ? o.tableNumber : 'Directa'}</span></div>
                                  ${o.source && o.source !== 'direct' ? `<div style="display: flex; justify-content: space-between;"><span>Fuente:</span><span><strong>${o.source}</strong></span></div>` : ''}
                                </div>
                                ${o.items.map(i => `
                                  <div style="display: flex; justify-content: space-between; margin: 3px 0;">
                                    <span style="flex: 1;">${i.quantity}x ${i.productName}</span>
                                    <span>$${i.totalPrice}</span>
                                  </div>
                                `).join('')}
                                <div style="border-top: 1px dashed #ccc; margin-top: 10px; padding-top: 10px;">
                                  <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
                                    <span>TOTAL:</span><span>$${o.total}</span>
                                  </div>
                                  <p style="text-align: center; margin-top: 15px; font-style: italic;">${config.ticketFooter}</p>
                                </div>
                                <script>window.print(); setTimeout(() => window.close(), 500);</script>
                              </body>
                            </html>
                          `);
                        }
                      }}>
                        <ReceiptText className="h-3.5 w-3.5" /> Ticket
                      </Button>
                      <Button
                        variant={o.invoiced ? "default" : "secondary"}
                        size="sm"
                        className="flex-1 h-8 text-[11px] font-bold uppercase gap-1.5 border-primary/20"
                        onClick={() => {
                          if (!o.invoiced) {
                            startTransition(async () => {
                              const res = await invoiceOrder(o.id, true);
                              if (res.success) {
                                // Simulate professional invoice view
                                const win = window.open('', '_blank');
                                if (win) {
                                  const { config } = state;
                                  win.document.write(`
                                    <html>
                                      <head><title>Factura - ${o.id}</title></head>
                                      <body style="font-family: sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.5;">
                                        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px;">
                                          <div>
                                            <h1 style="margin: 0; color: #2563eb;">${config.name}</h1>
                                            <p style="margin: 5px 0; color: #666;">${config.address}<br/>RFC: ${config.rfc}<br/>Tel: ${config.phone}</p>
                                          </div>
                                          <div style="text-align: right;">
                                            <h2 style="margin: 0; color: #666;">FACTURA</h2>
                                            <p style="margin: 5px 0; font-weight: bold;">#FCT-${o.id.slice(-6).toUpperCase()}</p>
                                            <p style="margin: 5px 0; font-size: 0.9em; color: #888;">Fecha: ${new Date().toLocaleDateString()}</p>
                                            ${o.source && o.source !== 'direct' ? `<p style="margin: 5px 0; font-size: 0.9em; color: #2563eb;"><strong>Plataforma: ${o.source}</strong></p>` : ''}
                                          </div>
                                        </div>
                                        <div style="margin-bottom: 30px;">
                                          <p style="font-weight: bold; margin-bottom: 5px;">Receptor:</p>
                                          <p style="margin: 0; color: #444;">PÚBLICO EN GENERAL<br/>RFC: XAXX010101000</p>
                                        </div>
                                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                                          <thead>
                                            <tr style="background: #f8fafc; text-align: left;">
                                              <th style="padding: 12px; border-bottom: 1px solid #e2e8f0;">Cant.</th>
                                              <th style="padding: 12px; border-bottom: 1px solid #e2e8f0;">Descripción</th>
                                              <th style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">P.U.</th>
                                              <th style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">Total</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            ${o.items.map(i => `
                                              <tr>
                                                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">${i.quantity}</td>
                                                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">${i.productName}</td>
                                                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right;">$${i.unitPrice}</td>
                                                <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right;">$${i.totalPrice}</td>
                                              </tr>
                                            `).join('')}
                                          </tbody>
                                        </table>
                                        <div style="margin-left: auto; width: 250px;">
                                          <div style="display: flex; justify-content: space-between; padding: 5px 0;"><span>Subtotal:</span><span>$${(o.total / 1.16).toFixed(2)}</span></div>
                                          <div style="display: flex; justify-content: space-between; padding: 5px 0;"><span>IVA (16%):</span><span>$${(o.total - (o.total / 1.16)).toFixed(2)}</span></div>
                                          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 1px solid #eee; font-weight: bold; font-size: 1.2em; color: #2563eb;">
                                            <span>TOTAL:</span><span>$${o.total}</span>
                                          </div>
                                        </div>
                                        <div style="margin-top: 50px; text-align: center; color: #94a3b8; font-size: 0.8em; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                                          Este documento es una representación impresa de un CFDI.
                                        </div>
                                        <script>window.print();</script>
                                      </body>
                                    </html>
                                  `);
                                }
                              }
                            })
                          } else {
                            startTransition(async () => { await invoiceOrder(o.id, false); })
                          }
                        }}
                        disabled={isPending}
                      >
                        {o.invoiced ? "Ver Factura" : "Facturar"}
                      </Button>

                      {state.employees.find(e => e.id === authState.user?.id)?.role === 'admin' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingOrder(o)}>
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}

                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <ShiftClosingDialog
        open={showCloseDialog}
        onClose={() => setShowCloseDialog(false)}
        onConfirm={handleCloseShift}
        isPending={isClosing}
        expectedCash={expectedCashTotal}
        shift={currentShift}
      />

      <CashPaymentDialog
        open={showCashDialog}
        onClose={() => setShowCashDialog(false)}
        total={paymentTotal}
        onConfirm={paymentCallback || (() => { })}
        isPending={isPending}
      />

      <EditOrderDialog
        order={editingOrder}
        open={!!editingOrder}
        onClose={() => setEditingOrder(null)}
        products={state.products}
      />
    </div>
  )
}

import { updateOrder } from "@/lib/actions"

function EditOrderDialog({ order, open, onClose, products }: { order: Order | null, open: boolean, onClose: () => void, products: any[] }) {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash")
  const [tip, setTip] = useState(0)
  const [folio, setFolio] = useState("")
  const [isPending, startTransition] = useTransition()

  // Customizer
  const [prodToAdd, setProdToAdd] = useState<any | null>(null)

  useEffect(() => {
    if (order && open) {
      setItems(order.items.map(i => ({
        productId: i.productId,
        productName: i.productName,
        price: i.unitPrice,
        quantity: i.quantity,
        totalPrice: i.totalPrice, // Initialize, but we should recalc if qty changes
        removedIngredients: i.removedIngredients || []
      })))
      setPaymentMethod(order.paymentMethod as "cash" | "card")
      setTip((order as any).tip || 0)
      setFolio((order as any).transactionId || "")
    }
  }, [order, open])

  const subtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0)
  const total = subtotal + tip

  const handleSave = () => {
    if (!order) return
    startTransition(async () => {
      const res = await updateOrder(order.id, items, paymentMethod, tip, folio)
      if (res.success) {
        onClose()
        router.refresh()
      } else {
        alert("Error al actualizar orden")
      }
    })
  }

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Orden #{order.id.slice(-6)}</DialogTitle>
          <DialogDescription>Modificar productos y método de pago. Solo administradores.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-4">
          {/* Items */}
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold">Productos</h3>
              <Button size="sm" variant="outline" onClick={() => setProdToAdd(products[0])}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm border-b pb-2 last:border-0">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                    const newItems = [...items]
                    if (newItems[idx].quantity > 1) {
                      newItems[idx].quantity--
                      newItems[idx].totalPrice = newItems[idx].quantity * newItems[idx].price
                      setItems(newItems)
                    } else {
                      setItems(items.filter((_, i) => i !== idx))
                    }
                  }}><UtensilsCrossed className="h-3 w-3 text-red-500" /></Button> {/* Minus/Trash icon placeholder */}
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                    const newItems = [...items]
                    newItems[idx].quantity++
                    newItems[idx].totalPrice = newItems[idx].quantity * newItems[idx].price
                    setItems(newItems)
                  }}><Plus className="h-3 w-3" /></Button>
                  <span className="flex-1">{item.productName}</span>
                  <span className="font-bold">${item.totalPrice}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentMethod === 'card' && (
              <div className="space-y-2">
                <Label>Folio / Voucher</Label>
                <Input value={folio} onChange={e => setFolio(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Propina</Label>
              <Input type="number" value={tip} onChange={e => setTip(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Totals */}
          <div className="bg-muted p-4 rounded-lg flex flex-col gap-1 items-end">
            <div className="flex justify-between w-40 text-sm"><span>Subtotal:</span><span>${subtotal}</span></div>
            <div className="flex justify-between w-40 text-sm"><span>Propina:</span><span>${tip}</span></div>
            <div className="flex justify-between w-40 font-bold text-lg text-primary border-t pt-1 mt-1"><span>Total:</span><span>${total}</span></div>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Cambios"}
          </Button>
        </DialogFooter>

        {/* Simple Item Selector Modal */}
        <Dialog open={!!prodToAdd} onOpenChange={() => setProdToAdd(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Agregar Producto</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
              {products.filter(p => p.available).map(p => (
                <Button key={p.id} variant="outline" className="justify-start h-auto py-2 text-left" onClick={() => {
                  setItems([...items, {
                    productId: p.id,
                    productName: p.name,
                    price: p.price,
                    quantity: 1,
                    totalPrice: p.price, // No extras support in edit for now for simplicity
                    removedIngredients: []
                  }])
                  setProdToAdd(null)
                }}>
                  <div>
                    <div className="font-bold">{p.name}</div>
                    <div className="text-xs text-muted-foreground">${p.price}</div>
                  </div>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

      </DialogContent>
    </Dialog>
  )
}
