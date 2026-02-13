"use client"

import React, { useMemo } from "react"

import { useStore } from "@/lib/spa-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, ChefHat, CheckCircle, Loader2, UtensilsCrossed } from "lucide-react"
import { updateOrderItemStatus } from "@/lib/actions"
import { useTransition } from "react"
import type { Order, OrderItem } from "@/lib/types"

type KitchenOrder = Order & { kitchenItems: OrderItem[] }

function getOrderStatus(items: OrderItem[]): "pending" | "preparing" | "ready" {
  if (items.every(i => i.status === "ready")) return "ready"
  if (items.some(i => i.status === "preparing")) return "preparing"
  return "pending"
}

const statusIcons: Record<string, React.ElementType> = { pending: Clock, preparing: ChefHat, ready: CheckCircle }
const statusLabel: Record<string, string> = { pending: "Pendiente", preparing: "Preparando", ready: "Listo" }

export function CocinaView() {
  const { state } = useStore()
  const [isPending, startTransition] = useTransition()

  // Group by order, not individual items - filter by current branch
  const kitchenOrders: KitchenOrder[] = state.orders
    .filter(o => (o.status === "open" || o.status === "closed") && (!o.branchId || o.branchId === state.currentBranchId))
    .map(o => ({
      ...o,
      kitchenItems: o.items.filter((i: any) => i.status !== "delivered" && i.product?.requiresKitchen !== false)
    }))
    .filter(o => o.kitchenItems.length > 0)


  // Advance all items of an order to next status
  function handleAdvanceOrder(order: KitchenOrder) {
    const status = getOrderStatus(order.kitchenItems)
    const nextStatus = status === "pending" ? "preparing" : status === "preparing" ? "ready" : null
    if (!nextStatus) return

    startTransition(async () => {
      for (const item of order.kitchenItems.filter(i => i.status === status)) {
        await updateOrderItemStatus(item.id, nextStatus)
      }
    })
  }

  // Deliver all ready items
  function handleDeliverOrder(order: KitchenOrder) {
    startTransition(async () => {
      for (const item of order.kitchenItems.filter(i => i.status === "ready")) {
        await updateOrderItemStatus(item.id, "delivered")
      }
    })
  }

  // Deliver all ready orders
  function handleDeliverAllReady() {
    const readyOrders = kitchenOrders.filter(o => getOrderStatus(o.kitchenItems) === "ready")
    startTransition(async () => {
      for (const order of readyOrders) {
        for (const item of order.kitchenItems.filter(i => i.status === "ready")) {
          await updateOrderItemStatus(item.id, "delivered")
        }
      }
    })
  }

  const pending = kitchenOrders.filter(o => getOrderStatus(o.kitchenItems) === "pending")
  const preparing = kitchenOrders.filter(o => getOrderStatus(o.kitchenItems) === "preparing")
  const ready = kitchenOrders.filter(o => getOrderStatus(o.kitchenItems) === "ready")

  function OrderCard({ order }: { order: KitchenOrder }) {
    const status = getOrderStatus(order.kitchenItems)
    const Icon = statusIcons[status]

    const itemsByDiner = useMemo(() => {
      const groups: Record<number, OrderItem[]> = {}
      order.kitchenItems.forEach(i => {
        const idx = i.dinerIndex ?? 0
        if (!groups[idx]) groups[idx] = []
        groups[idx].push(i)
      })
      return groups
    }, [order.kitchenItems])

    const dinerIndices = Object.keys(itemsByDiner).map(Number).sort((a, b) => a - b)

    return (
      <Card className="shadow-sm">
        <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
            <span className="font-bold text-sm">
              {order.tableNumber != null ? `Mesa ${order.tableNumber}` : "Venta Directa"}
            </span>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {order.kitchenItems.length} item{order.kitchenItems.length > 1 ? "s" : ""}
          </Badge>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="flex flex-col gap-3 mb-3">
            {dinerIndices.map(dIdx => (
              <div key={dIdx} className="flex flex-col gap-2">
                <div className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/40 p-1 rounded flex justify-between">
                  <span>{order.dinerNames?.[dIdx] || `Comensal ${dIdx + 1}`}</span>
                </div>
                {itemsByDiner[dIdx].map(item => (
                  <div key={item.id} className="flex items-start gap-2 text-sm border-l-2 border-muted pl-2">
                    <span className="font-medium">{item.quantity}x</span>
                    <div className="flex-1">
                      <p className="leading-tight">{item.productName}</p>
                      {item.extras.length > 0 && (
                        <p className="text-[11px] text-muted-foreground flex flex-wrap gap-1 mt-0.5">
                          {item.extras.map(e => <span key={e.id} className="bg-muted px-1 rounded-sm">+{e.name}</span>)}
                        </p>
                      )}
                      {item.removedIngredients.length > 0 && (
                        <p className="text-[11px] text-destructive">Sin {item.removedIngredients.join(", ")}</p>
                      )}
                      {item.notes && (
                        <p className="text-[11px] italic text-muted-foreground bg-accent/10 p-1 rounded-sm border-l-2 border-accent mt-1">{item.notes}</p>
                      )}
                    </div>
                    <Badge variant={item.status === "ready" ? "secondary" : "outline"} className="text-[9px] shrink-0">
                      {statusLabel[item.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {status !== "ready" ? (
            <Button size="sm" className="w-full text-xs h-8 gap-2" onClick={() => handleAdvanceOrder(order)} disabled={isPending}>
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
              {status === "pending" ? "Iniciar preparación" : "Marcar como listo"}
            </Button>
          ) : (
            <Button size="sm" variant="secondary" className="w-full text-xs h-8 gap-2 bg-green-600 hover:bg-green-700 text-white border-none" onClick={() => handleDeliverOrder(order)} disabled={isPending}>
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              Entregar pedido
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  function Column({ title, orders, color, showClear }: { title: string; orders: KitchenOrder[]; color: string; showClear?: boolean }) {
    return (
      <div className="flex flex-1 flex-col gap-3 min-w-[320px]">
        <Card className="border-none bg-muted/50">
          <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <h2 className={`text-sm font-bold ${color}`}>{title}</h2>
              <Badge variant="secondary" className="font-bold">{orders.length}</Badge>
            </div>
            {showClear && orders.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={handleDeliverAllReady} disabled={isPending}>
                Entregar todos
              </Button>
            )}
          </CardHeader>
        </Card>

        <div className="flex flex-col gap-2">
          {orders.length === 0 ? (
            <Card className="border-dashed bg-transparent border-muted-foreground/20">
              <CardContent className="p-6 flex flex-col items-center justify-center text-muted-foreground">
                <p className="text-xs italic">No hay pedidos</p>
              </CardContent>
            </Card>
          ) : orders.map(order => <OrderCard key={order.id} order={order} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-6 overflow-x-auto pb-4">
      <Column title="PENDIENTES" orders={pending} color="text-destructive" />
      <Column title="EN PREPARACIÓN" orders={preparing} color="text-warning" />
      <Column title="LISTOS PARA ENTREGA" orders={ready} color="text-success" showClear />
    </div>
  )
}
