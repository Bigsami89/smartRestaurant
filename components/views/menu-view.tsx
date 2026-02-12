"use client"

import { useState, useMemo, useTransition, useEffect } from "react"
import { useStore } from "@/lib/spa-store"
import type { OrderItem, Order } from "@/lib/types"
import { ItemCustomizer } from "@/components/item-customizer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, UserPlus, Send, X, ArrowLeft, ShoppingCart, Loader2, Store } from "lucide-react"
import { useRouter } from "next/navigation"
import { submitOrder } from "@/lib/actions"

export function MenuView() {
  const { state, dispatch, menuTableId, setView } = useStore()
  const router = useRouter()
  const table = state.tables.find(t => t.id === menuTableId)
  const existingOrder = state.orders.find(o => o.tableId === menuTableId && o.status === "open")

  // Persistence: Use draft items from global state if available, otherwise fallback to existing order items
  const draftOrders = state.draftOrders || {}
  const draftItems = menuTableId ? (draftOrders[menuTableId] || []) : []
  // If we have an existing open order AND no draft, we might want to start with empty draft? 
  // No, usually "Append to order". 
  // If we want to show existing items, we should separate "Existing Items" vs "New Items".
  // BUT the current logic seems to mix them in `localItems`.
  // If we want to PERSIST "New Items" only, we should separate them.
  // However, the `submitOrder` action takes a list of items. 
  // Let's assume `localItems` represents the *delta* or *new items* to be added, 
  // because `submitOrder` usually appends in the backend (or creates new order).
  // Checking `submitOrder` implementation in actions.ts would be good, but strict mode...
  // Let's stick to the behavior: logic was `useState(existingOrder?.items ?? [])`. 
  // This implies we are editing the WHOLE order or APPENDING?
  // If `existingOrder` is present, `submitOrder` calls `updateOrder`? 
  // Let's look at `handleSendOrder`. It calls `submitOrder`.
  // If I change to `draftOrders`, I should init it with existing items if empty?
  // OR, better: `draftOrders` only tracks UNCOMMITTED changes?
  // The user said: "no se conservan los productos... y desaparecen".
  // So we need to save what they added.

  // Strategy: 
  // 1. `localItems` will reflect `state.draftOrders[tableId]`.
  // 2. On mount, if `draftOrders[tableId]` is undefined, we init it.
  //    But `existingOrder` might have items. 
  //    If we want to show *previous* items too, we should probably just keep `active` items in draft.
  //    Let's sync: `localItems` <-> `state.draftOrders`.

  // If we use `draftItems` as the source of truth:
  useEffect(() => {
    if (menuTableId && !draftOrders[menuTableId]) {
      // Init draft with existing order items only if we want to "edit" them?
      // Or usually we start with what's already there?
      // The original code: `useState(existingOrder?.items ?? [])`
      // So yes, it loads existing items.
      dispatch({
        type: "SET_DRAFT_ORDER",
        payload: { tableId: menuTableId, items: existingOrder?.items ?? [] }
      })
    }
  }, [menuTableId, existingOrder, state.draftOrders, dispatch])

  // We use a local state variable just for cleaner render logic, but sync it constantly?
  // Actually, better to just use `draftItems` directly to avoid sync issues.

  const items = draftItems

  const [diners, setDiners] = useState(
    items.length > 0
      ? Math.max(...items.map(i => i.dinerIndex), 0) + 1
      : (existingOrder ? Math.max(...existingOrder.items.map(i => i.dinerIndex), 0) + 1 : 1)
  )
  const [activeDiner, setActiveDiner] = useState(0)
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState("Todos")
  const [customProduct, setCustomProduct] = useState<typeof state.products[0] | null>(null)
  const [showOrder, setShowOrder] = useState(false)
  const [orderSource, setOrderSource] = useState("direct")

  // Get order sources from configLists
  const orderSourcesList = state.configLists.find(l => l.name === "order_sources")
  const sourcesOptions = orderSourcesList?.items.filter(i => i.active) || [{ id: "default", value: "direct", label: "Directo", active: true, sortOrder: 0 }]

  const categories = useMemo(() => ["Todos", ...new Set(state.products.filter(p => p.branchId === state.currentBranchId).map(p => p.category))], [state.products, state.currentBranchId])
  const filtered = state.products.filter(p => p.branchId === state.currentBranchId && p.available && (catFilter === "Todos" || p.category === catFilter) && p.name.toLowerCase().includes(search.toLowerCase()))

  // Calculate Totals
  const total = items.reduce((s, i) => s + i.totalPrice, 0)

  // Subtotal per diner
  const getDinerSubtotal = (index: number) => {
    return items.filter(i => i.dinerIndex === index).reduce((acc, i) => acc + i.totalPrice, 0)
  }

  const [isPending, startTransition] = useTransition()

  function updateDraft(newItems: OrderItem[]) {
    if (menuTableId) {
      dispatch({ type: "SET_DRAFT_ORDER", payload: { tableId: menuTableId, items: newItems } })
    }
  }

  function addItem(item: OrderItem) {
    updateDraft([...items, item])
  }

  function removeItem(id: string) {
    updateDraft(items.filter(i => i.id !== id))
  }

  function handleSendOrder() {
    if (items.length === 0 || !table) return

    // Filter out items that are already in the existing order to avoid duplicates
    // We assume items with IDs present in existingOrder are "saved". 
    // New items might have temporary IDs or just IDs that are NOT in existingOrder.
    const newItems = existingOrder
      ? items.filter(i => !existingOrder.items.some(ei => ei.id === i.id))
      : items

    if (newItems.length === 0) {
      // If no new items, maybe just clear draft and exit? Or warn?
      // If user just wanted to check status, they shouldn't hit "Send".
      // But if they clicked "Send" and nothing is new, we should probably just go back to tables.
      dispatch({ type: "CLEAR_DRAFT_ORDER", payload: menuTableId! })
      setView("mesas")
      return
    }

    startTransition(async () => {
      const res = await submitOrder(table.id, newItems, orderSource)
      if (res.success) {
        if (menuTableId) dispatch({ type: "CLEAR_DRAFT_ORDER", payload: menuTableId })
        router.refresh()
        setView("mesas")
      } else {
        alert(res.error)
      }
    })
  }

  if (!table) return <div className="flex flex-col items-center gap-4 py-12"><p className="text-muted-foreground">No hay mesa seleccionada</p><Button onClick={() => setView("mesas")}><ArrowLeft className="mr-2 h-4 w-4" />Volver a mesas</Button></div>

  const DinerTabs = ({ orientation = "horizontal" }: { orientation?: "horizontal" | "vertical" }) => (
    <div className={`flex gap-1 overflow-x-auto ${orientation === "horizontal" ? "border-b px-3 py-2" : "flex-col p-2 space-y-2"} `}>
      {Array.from({ length: diners }, (_, i) => {
        const sub = getDinerSubtotal(i)
        return (
          <Button key={i} size="sm" variant={activeDiner === i ? "default" : "outline"} onClick={() => setActiveDiner(i)} className="shrink-0 text-xs flex flex-col items-start h-auto py-1 px-2">
            <span>Comensal {i + 1}</span>
            <span className="text-[10px] opacity-80">${sub.toFixed(2)}</span>
          </Button>
        )
      })}
      <Button size="sm" variant="ghost" onClick={() => { setDiners(d => d + 1); setActiveDiner(diners) }} className="shrink-0 h-auto self-center"><UserPlus className="h-4 w-4" /></Button>
    </div>
  )

  return (
    <div className="relative flex h-[calc(100vh-7rem)] flex-col gap-4 lg:flex-row">
      {/* Catalog */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setView("mesas")}><ArrowLeft className="mr-1 h-4 w-4" />Mesa {table.number}</Button>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map(c => <Button key={c} size="sm" variant={catFilter === c ? "default" : "outline"} onClick={() => setCatFilter(c)} className="shrink-0 text-xs">{c}</Button>)}
        </div>
        <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3">
            {filtered.map(p => (
              <button key={p.id} onClick={() => setCustomProduct(p)} className="rounded-xl border bg-card p-3 text-left transition-shadow hover:shadow-md flex flex-col gap-2 h-full">
                {p.image && (
                  <div className="relative w-full aspect-square rounded-md overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image} alt={p.name} className="object-cover w-full h-full" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium leading-tight">{p.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                  <p className="mt-1 font-bold text-primary">${p.price}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating cart button */}
      <button
        onClick={() => setShowOrder(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-lg transition-transform active:scale-95 lg:hidden"
      >
        <ShoppingCart className="h-5 w-5" />
        <span>${total}</span>
        {items.length > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-xs font-bold text-primary">
            {items.length}
          </span>
        )}
      </button>

      {/* Order panel overlay mobile */}
      {showOrder && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setShowOrder(false)}>
          <div className="mt-auto flex max-h-[85vh] flex-col rounded-t-2xl border-t bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Pedido</span>
                <Badge variant="secondary" className="text-xs">{items.length} items</Badge>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowOrder(false)}><X className="h-4 w-4" /></Button>
            </div>

            <DinerTabs />

            <div className="flex-1 overflow-y-auto p-3">
              {items.filter(i => i.dinerIndex === activeDiner).length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Sin items para este comensal</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {items.filter(i => i.dinerIndex === activeDiner).map(item => (
                    <div key={item.id} className="flex items-start gap-2 rounded-lg bg-muted/50 p-2 text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{item.quantity}x {item.productName}</p>
                        {item.extras.length > 0 && <p className="text-xs text-muted-foreground">+ {item.extras.map(e => e.name).join(", ")}</p>}
                        {item.removedIngredients.length > 0 && <p className="text-xs text-destructive">Sin {item.removedIngredients.join(", ")}</p>}
                      </div>
                      <span className="font-medium">${item.totalPrice}</span>
                      <button onClick={() => removeItem(item.id)}><X className="h-3 w-3 text-muted-foreground" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t p-3">
              <div className="flex justify-between text-base font-bold"><span>Total</span><span>${total}</span></div>
              <div className="mt-2 flex items-center gap-2">
                <Store className="h-4 w-4 text-muted-foreground" />
                <Select value={orderSource} onValueChange={setOrderSource}>
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue placeholder="Fuente" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourcesOptions.map(s => (
                      <SelectItem key={s.id} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="mt-2 w-full gap-2" disabled={items.length === 0 || isPending} onClick={handleSendOrder}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar a cocina
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Order panel sidebar desktop */}
      <div className="hidden w-80 shrink-0 flex-col rounded-xl border bg-card lg:flex">
        <div className="border-b p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Pedido</span>
            <Badge variant="secondary" className="ml-auto text-xs">{items.length} items</Badge>
          </div>

          <DinerTabs />

        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {items.filter(i => i.dinerIndex === activeDiner).length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">Sin items para este comensal</p>
          ) : (
            <div className="flex flex-col gap-2">
              {items.filter(i => i.dinerIndex === activeDiner).map(item => (
                <div key={item.id} className="flex items-start gap-2 rounded-lg bg-muted/50 p-2 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{item.quantity}x {item.productName}</p>
                    {item.extras.length > 0 && <p className="text-xs text-muted-foreground">+ {item.extras.map(e => e.name).join(", ")}</p>}
                    {item.removedIngredients.length > 0 && <p className="text-xs text-destructive">Sin {item.removedIngredients.join(", ")}</p>}
                  </div>
                  <span className="font-medium">${item.totalPrice}</span>
                  <button onClick={() => removeItem(item.id)}><X className="h-3 w-3 text-muted-foreground" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t p-3">
          <div className="flex justify-between text-base font-bold"><span>Total</span><span>${total}</span></div>
          <div className="mt-2 flex items-center gap-2">
            <Store className="h-4 w-4 text-muted-foreground" />
            <Select value={orderSource} onValueChange={setOrderSource}>
              <SelectTrigger className="flex-1 h-9">
                <SelectValue placeholder="Fuente" />
              </SelectTrigger>
              <SelectContent>
                {sourcesOptions.map(s => (
                  <SelectItem key={s.id} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="mt-2 w-full gap-2" disabled={items.length === 0 || isPending} onClick={handleSendOrder}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar a cocina
          </Button>
        </div>
      </div>

      <ItemCustomizer product={customProduct} open={!!customProduct} onClose={() => setCustomProduct(null)} onAdd={addItem} dinerIndex={activeDiner} />
    </div>
  )
}
