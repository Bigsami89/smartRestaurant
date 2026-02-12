"use client"

import { useState, useTransition } from "react"
import { useStore } from "@/lib/spa-store"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Clock, Users, Phone, Edit2, Trash2, MessageSquare, Plus, Armchair, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Reservation } from "@/lib/types"
import { createReservation, updateReservation, cancelReservation, completeReservation } from "@/lib/actions"

export function ReservationsView() {
    const { state } = useStore()
    const [date, setDate] = useState<Date>(new Date())
    const [showNew, setShowNew] = useState(false)
    const [editing, setEditing] = useState<Reservation | null>(null)
    const [isPending, startTransition] = useTransition()

    // Form state
    const [formData, setFormData] = useState({
        customerName: "",
        customerPhone: "",
        partySize: "2",
        time: "20:00",
        notes: "",
        tableId: "any"
    })

    // Filter reservations
    const dailyReservations = state.reservations?.filter(r =>
        r.branchId === state.currentBranchId &&
        new Date(r.date).toDateString() === date.toDateString() &&
        r.status !== "cancelled"
    ) || []

    const sortedReservations = [...dailyReservations].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const handleCreate = async () => {
        startTransition(async () => {
            const [hours, minutes] = formData.time.split(':').map(Number)
            const reservationDate = new Date(date)
            reservationDate.setHours(hours, minutes, 0, 0)

            const res = await createReservation({
                ...formData,
                date: reservationDate.toISOString(),
                branchId: state.currentBranchId
            })

            if (res.success) {
                setShowNew(false)
                setFormData({ customerName: "", customerPhone: "", partySize: "2", time: "20:00", notes: "", tableId: "any" })
                window.location.reload()
            } else {
                alert(res.error || "Error al crear la reserva")
            }
        })
    }

    const handleUpdate = async () => {
        if (!editing) return
        startTransition(async () => {
            const [hours, minutes] = formData.time.split(':').map(Number)
            const reservationDate = new Date(date)
            reservationDate.setHours(hours, minutes, 0, 0)

            const res = await updateReservation(editing.id, {
                ...formData,
                date: reservationDate.toISOString()
            })

            if (res.success) {
                setEditing(null)
                window.location.reload()
            } else {
                alert(res.error || "Error al actualizar")
            }
        })
    }

    const handleCancel = async (id: string) => {
        if (!confirm("¿Estás seguro de cancelar esta reserva?")) return
        startTransition(async () => {
            const res = await cancelReservation(id)
            if (res.success) window.location.reload()
        })
    }

    const handleComplete = async (id: string) => {
        if (!confirm("¿Marcar reserva como completada/finalizada?")) return
        startTransition(async () => {
            const res = await completeReservation(id)
            if (res.success) window.location.reload()
        })
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2"><CalendarIcon className="h-6 w-6" /> Reservas</h2>
                <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" />Nueva Reserva</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 h-full overflow-hidden">
                {/* Calendar Sidebar */}
                <div className="bg-card rounded-lg border p-4 h-fit">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => d && setDate(d)}
                        className="rounded-md border mx-auto"
                        locale={es}
                    />
                    <div className="mt-4 pt-4 border-t">
                        <h3 className="font-semibold mb-2 text-sm">Resumen del día</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span>Confirmadas:</span> <span className="font-medium">{dailyReservations.filter(r => r.status === 'confirmed').length}</span></div>
                            <div className="flex justify-between"><span>Total Personas:</span> <span className="font-medium">{dailyReservations.reduce((acc, r) => acc + r.partySize, 0)}</span></div>
                        </div>
                    </div>
                </div>

                {/* Reservations List */}
                <div className="bg-card rounded-lg border flex flex-col h-full overflow-hidden">
                    <div className="p-4 border-b bg-muted/40">
                        <h3 className="font-semibold">Reservas para {date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {sortedReservations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                <CalendarIcon className="h-10 w-10 mb-2 opacity-20" />
                                <p>No hay reservaciones para este día</p>
                            </div>
                        ) : (
                            sortedReservations.map(r => {
                                const reservationDate = new Date(r.date)
                                const now = new Date()
                                const isLate = r.status === 'confirmed' && now.getTime() > reservationDate.getTime() + 10 * 60000

                                return (
                                    <Card key={r.id} className={`flex flex-col justify-between ${isLate ? "border-red-500 bg-red-50" : ""}`}>
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-bold text-lg">{r.customerName}</h3>
                                                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> {new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {isLate && <Badge variant="destructive" className="ml-2 text-[10px] h-5">Vencida</Badge>}
                                                    </div>
                                                </div>
                                                <Badge variant={r.status === 'confirmed' ? 'default' : r.status === 'completed' ? 'secondary' : 'outline'}>
                                                    {r.status === 'confirmed' ? 'Confirmada' : r.status === 'completed' ? 'Completada' : 'Cancelada'}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                                                <div className="flex items-center gap-1"><Users className="h-3 w-3" /> {r.partySize} pers.</div>
                                                <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {r.customerPhone || "-"}</div>
                                                {r.tableId && <div className="col-span-2 flex items-center gap-1 text-blue-600 font-medium"><Armchair className="h-3 w-3" /> Mesa asignada: {state.tables.find(t => t.id === r.tableId)?.number}</div>}
                                            </div>
                                            {r.notes && <div className="mt-2 text-xs bg-muted p-2 rounded italic">"{r.notes}"</div>}
                                        </CardContent>
                                        <CardFooter className="p-2 bg-muted/20 flex gap-2 justify-end">
                                            {r.status === 'confirmed' && (
                                                <>
                                                    <Button variant="ghost" size="sm" onClick={() => {
                                                        setEditing(r)
                                                        setFormData({
                                                            customerName: r.customerName,
                                                            customerPhone: r.customerPhone || "",
                                                            partySize: String(r.partySize),
                                                            time: new Date(r.date).toTimeString().substring(0, 5),
                                                            notes: r.notes || "",
                                                            tableId: r.tableId || "any"
                                                        })
                                                    }}>Editar</Button>
                                                    <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleComplete(r.id)}>
                                                        Terminar
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleCancel(r.id)}>Cancelar</Button>
                                                </>
                                            )}
                                        </CardFooter>
                                    </Card>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Dialog for New/Edit */}
            <Dialog open={showNew || !!editing} onOpenChange={(open) => {
                if (!open) {
                    setShowNew(false)
                    setEditing(null)
                    setFormData({ customerName: "", customerPhone: "", partySize: "2", time: "20:00", notes: "", tableId: "any" })
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? "Editar Reserva" : "Nueva Reserva"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nombre del Cliente</Label>
                                <Input value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} placeholder="Ej. Juan Pérez" />
                            </div>
                            <div className="space-y-2">
                                <Label>Teléfono</Label>
                                <Input value={formData.customerPhone} onChange={e => setFormData({ ...formData, customerPhone: e.target.value })} placeholder="Ej. 555-1234" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Personas</Label>
                                <Input type="number" min="1" value={formData.partySize} onChange={e => setFormData({ ...formData, partySize: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Hora</Label>
                                <Input type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Asignar Mesa (Opcional)</Label>
                            <Select value={formData.tableId} onValueChange={v => setFormData({ ...formData, tableId: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar mesa" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="any">Sin asignar (Cualquiera)</SelectItem>
                                    {state.tables
                                        .filter(t => t.branchId === state.currentBranchId)
                                        .map(t => (
                                            <SelectItem key={t.id} value={t.id}>Mesa {t.number} ({t.seats} pers.)</SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Notas</Label>
                            <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Alergias, ocasión especial, etc." />
                        </div>

                        <Button onClick={editing ? handleUpdate : handleCreate} disabled={!formData.customerName || isPending} className="w-full mt-2">
                            {isPending ? "Guardando..." : "Guardar Reserva"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
