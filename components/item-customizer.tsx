"use client"

import { useState } from "react"
import type { Product, ProductExtra, OrderItem } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Minus, Plus } from "lucide-react"

interface Props {
  product: Product | null
  open: boolean
  onClose: () => void
  onAdd: (item: OrderItem) => void
  dinerIndex: number
}

export function ItemCustomizer({ product, open, onClose, onAdd, dinerIndex }: Props) {
  const [qty, setQty] = useState(1)
  const [extras, setExtras] = useState<ProductExtra[]>([])
  const [removed, setRemoved] = useState<string[]>([])
  const [notes, setNotes] = useState("")

  function reset() { setQty(1); setExtras([]); setRemoved([]); setNotes("") }

  if (!product) return null

  const unitPrice = product.price + extras.reduce((s, e) => s + e.price, 0)
  const total = unitPrice * qty

  function toggleExtra(ex: ProductExtra) {
    setExtras(prev => prev.find(e => e.id === ex.id) ? prev.filter(e => e.id !== ex.id) : [...prev, ex])
  }
  function toggleRemoved(name: string) {
    setRemoved(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])
  }
  function submit() {
    onAdd({
      id: `oi-${Date.now()}`, productId: product.id, productName: product.name,
      quantity: qty, unitPrice, totalPrice: total, extras, removedIngredients: removed,
      notes, dinerIndex, status: "pending",
    })
    reset(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">{product.description}</p>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {/* Quantity */}
          <div className="flex items-center gap-3">
            <Label>Cantidad</Label>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" className="h-8 w-8 bg-transparent" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-3 w-3" /></Button>
              <span className="w-8 text-center font-bold">{qty}</span>
              <Button size="icon" variant="outline" className="h-8 w-8 bg-transparent" onClick={() => setQty(qty + 1)}><Plus className="h-3 w-3" /></Button>
            </div>
          </div>

          {/* Extras */}
          {product.extras.length > 0 && (
            <div>
              <Label className="mb-2 block">Extras</Label>
              <div className="flex flex-col gap-2">
                {product.extras.map(ex => (
                  <label key={ex.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={extras.some(e => e.id === ex.id)} onCheckedChange={() => toggleExtra(ex)} />
                    <span className="flex-1">{ex.name}</span><span className="text-muted-foreground">+${ex.price}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Remove ingredients */}
          {product.ingredients.filter(i => i.removable).length > 0 && (
            <div>
              <Label className="mb-2 block">Quitar ingredientes</Label>
              <div className="flex flex-col gap-2">
                {product.ingredients.filter(i => i.removable).map(ing => (
                  <label key={ing.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={removed.includes(ing.name)} onCheckedChange={() => toggleRemoved(ing.name)} />
                    <span>Sin {ing.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label>Notas</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instrucciones especiales..." />
          </div>
        </div>
        <DialogFooter>
          <div className="flex w-full items-center justify-between">
            <span className="text-lg font-bold">${total}</span>
            <Button onClick={submit}>Agregar al pedido</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
