"use client"

import { useState, useTransition } from "react"
import { useStore } from "@/lib/spa-store"
import type { Table } from "@/lib/types"
import { createTable, updateTableStatus, deleteTable } from "@/lib/actions"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Users, Trash2, Loader2, Clock } from "lucide-react"

const statusLabel: Record<string, string> = { available: "Disponible", occupied: "Ocupada", reserved: "Reservada", billing: "Cobrando" }
const statusColor: Record<string, string> = { available: "border-success/50 bg-success/5", occupied: "border-primary/50 bg-primary/5", reserved: "border-warning/50 bg-warning/5", billing: "border-accent/50 bg-accent/5" }

export function MesasView() {
  const { state, openMenu } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [newNumber, setNewNumber] = useState("")
  const [newSeats, setNewSeats] = useState("4")
  const [newZone, setNewZone] = useState("Interior")
  const [filter, setFilter] = useState("all")
  const [isPending, startTransition] = useTransition()

  // Filter tables by current branch
  const branchTables = state.tables.filter(t => t.branchId === state.currentBranchId)
  const filtered = filter === "all" ? branchTables : branchTables.filter(t => t.status === filter)


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
        setShowAdd(false); setNewNumber("")
      } else {
        alert(res.error)
      }
    })
  }


  function cycleStatus(t: Table) {
    const next: Record<string, string> = { available: "occupied", occupied: "billing", billing: "available", reserved: "available" }
    const newStatus = next[t.status]
    startTransition(async () => {
      await updateTableStatus(t.id, newStatus)
    })
  }

  function handleDelete(id: string) {
    if (!confirm("Confirmar eliminacion?")) return
    startTransition(async () => {
      await deleteTable(id)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {["all", "available", "occupied", "reserved", "billing"].map(s => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)} disabled={isPending}>
            {s === "all" ? "Todas" : statusLabel[s]}
          </Button>
        ))}
        <Button size="sm" className="ml-auto gap-1" onClick={() => setShowAdd(true)} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Agregar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map(t => {
          // Check for today's reservations
          const todayRes = state.reservations?.find(r =>
            r.tableId === t.id &&
            r.status === 'confirmed' &&
            new Date(r.date).toDateString() === new Date().toDateString()
          )

          return (
            <Card key={t.id} className={`border-2 ${statusColor[t.status]} relative`}>
              {todayRes && (
                <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full z-10 shadow-sm flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(todayRes.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">Mesa {t.number}</span>
                  <Badge variant="secondary" className="text-xs">{statusLabel[t.status]}</Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" />{t.seats} asientos - {t.zone}</div>
                {todayRes && (
                  <div className="text-xs font-semibold text-blue-600 truncate">
                    Reserva: {todayRes.customerName} ({todayRes.partySize}p)
                  </div>
                )}
                <div className="flex gap-1.5 mt-1">
                  <Button size="sm" variant="outline" className="flex-1 text-xs bg-transparent" onClick={() => cycleStatus(t)} disabled={isPending}>
                    {t.status === "available" ? "Ocupar" : t.status === "occupied" ? "Cobrar" : "Liberar"}
                  </Button>
                  {t.status === "available" && (
                    <Button size="sm" variant="secondary" className="text-xs" onClick={() => startTransition(async () => { await updateTableStatus(t.id, "reserved") })} disabled={isPending}>Reservar</Button>
                  )}
                  {t.status === "occupied" && (
                    <Button size="sm" className="flex-1 text-xs" onClick={() => openMenu(t.id)}>Menu</Button>
                  )}
                  {t.status === "available" && (
                    <Button size="sm" variant="destructive" className="text-xs" onClick={() => handleDelete(t.id)} disabled={isPending}><Trash2 className="h-3 w-3" /></Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar mesa</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <div><Label>Numero</Label><Input type="number" value={newNumber} onChange={e => setNewNumber(e.target.value)} /></div>
            <div><Label>Asientos</Label><Input type="number" value={newSeats} onChange={e => setNewSeats(e.target.value)} /></div>
            <div><Label>Zona</Label>
              <Select value={newZone} onValueChange={setNewZone}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Interior">Interior</SelectItem><SelectItem value="Terraza">Terraza</SelectItem><SelectItem value="Bar">Bar</SelectItem></SelectContent></Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleAddTable} disabled={!newNumber || isPending}>Agregar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
