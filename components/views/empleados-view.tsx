"use client"

import { useState, useTransition } from "react"
import { useStore } from "@/lib/spa-store"
import type { Employee, UserRole, Branch } from "@/lib/types"
import { roleLabels } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit2, Search, Loader2, Building2, MapPin, Phone } from "lucide-react"
import { createEmployee, updateEmployee, createBranch, updateBranch, assignEmployeeToBranch } from "@/lib/actions"

const roles: UserRole[] = ["admin", "cajero", "mesero", "cocina"]

export function EmpleadosView() {
  const { state, dispatch, authState } = useStore()
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("Todos")
  const [statusFilter, setStatusFilter] = useState("Todos")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "mesero" as UserRole, branchId: "" })

  // Branch form state
  const [showBranchForm, setShowBranchForm] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [branchForm, setBranchForm] = useState({ name: "", address: "", phone: "", shareMenu: true })

  const [isPending, startTransition] = useTransition()

  const filtered = state.employees.filter(e =>
    e.branchId === state.currentBranchId &&
    e.name.toLowerCase().includes(search.toLowerCase()) &&
    (roleFilter === "Todos" || e.role === roleFilter) &&
    (statusFilter === "Todos" || (statusFilter === "Activo" ? e.active : !e.active))
  )

  function openNew() {
    setEditing(null)
    setForm({ name: "", email: "", password: "", role: "mesero", branchId: state.currentBranchId || "" })
    setShowForm(true)
  }
  function openEdit(e: Employee) {
    setEditing(e)
    setForm({ name: e.name, email: e.email, password: "", role: e.role, branchId: e.branchId || "" })
    setShowForm(true)
  }

  function save() {
    startTransition(async () => {
      let res: { success: boolean, error?: string } = { success: false, error: "Unknown error" };
      if (editing) {
        res = await updateEmployee(editing.id, form)
        // Also update branch assignment if changed
        if (form.branchId !== editing.branchId) {
          await assignEmployeeToBranch(editing.id, form.branchId || null)
        }
      } else {
        res = await createEmployee({ ...form, branchId: form.branchId || undefined })
      }

      if (res.success) {
        setShowForm(false)
        setForm({ name: "", email: "", password: "", role: "mesero", branchId: "" })
      } else {
        alert(res.error)
      }
    })
  }


  function toggleActive(e: Employee) {
    startTransition(async () => {
      await updateEmployee(e.id, { active: !e.active })
    })
  }

  // Branch functions
  function openNewBranch() {
    setEditingBranch(null)
    setBranchForm({ name: "", address: "", phone: "", shareMenu: true })
    setShowBranchForm(true)
  }

  function openEditBranch(b: Branch) {
    setEditingBranch(b)
    setBranchForm({
      name: b.name,
      address: b.address || "",
      phone: b.phone || "",
      shareMenu: b.shareMenu
    })
    setShowBranchForm(true)
  }

  function saveBranch() {
    startTransition(async () => {
      let res;
      if (editingBranch) {
        res = await updateBranch(editingBranch.id, branchForm)
      } else {
        res = await createBranch(branchForm)
      }

      if (res.success && res.branch) {
        if (editingBranch) {
          dispatch({ type: "UPDATE_BRANCH", payload: res.branch as Branch })
        } else {
          dispatch({ type: "ADD_BRANCH", payload: res.branch as Branch })
        }
        setShowBranchForm(false)
        setBranchForm({ name: "", address: "", phone: "", shareMenu: true })
      } else {
        alert(res.error)
      }
    })
  }

  const isAdmin = authState.user?.role === "admin"

  return (
    <div className="flex flex-col gap-4">
      <Tabs defaultValue="empleados">
        <TabsList>
          <TabsTrigger value="empleados">Empleados</TabsTrigger>
          {isAdmin && <TabsTrigger value="sucursales">Sucursales</TabsTrigger>}
        </TabsList>

        <TabsContent value="empleados" className="mt-4">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar empleado..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos los roles</SelectItem>{roles.map(r => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}</SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem><SelectItem value="Activo">Activos</SelectItem><SelectItem value="Inactivo">Inactivos</SelectItem></SelectContent></Select>
            <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" />Empleado</Button>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50 text-left"><th className="p-3">Nombre</th><th className="p-3">Email</th><th className="p-3">Rol</th><th className="p-3">Sucursal</th><th className="p-3">Estado</th><th className="p-3">Alta</th><th className="p-3">Acciones</th></tr></thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.id} className={`border-b last:border-0 ${!emp.active ? "opacity-50" : ""}`}>
                    <td className="p-3 font-medium">{emp.name}</td>
                    <td className="p-3 text-muted-foreground">{emp.email}</td>
                    <td className="p-3"><Badge variant="secondary">{roleLabels[emp.role]}</Badge></td>
                    <td className="p-3 text-xs text-muted-foreground">{emp.branchName || "—"}</td>
                    <td className="p-3"><Switch checked={emp.active} onCheckedChange={() => toggleActive(emp)} disabled={isPending} /></td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(emp.createdAt).toLocaleDateString()}</td>
                    <td className="p-3"><Button size="sm" variant="ghost" onClick={() => openEdit(emp)}><Edit2 className="h-3 w-3" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="sucursales" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Gestión de Sucursales</h3>
              <Button size="sm" className="gap-1" onClick={openNewBranch}><Plus className="h-4 w-4" />Nueva Sucursal</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {state.branches.map(branch => (
                <Card key={branch.id} className={!branch.isActive ? "opacity-50" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {branch.name}
                      </CardTitle>
                      <Button size="sm" variant="ghost" onClick={() => openEditBranch(branch)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    {branch.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{branch.address}</span>
                      </div>
                    )}
                    {branch.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span>{branch.phone}</span>
                      </div>
                    )}
                    <div className="pt-2">
                      <Badge variant={branch.shareMenu ? "secondary" : "outline"}>
                        {branch.shareMenu ? "Menú compartido" : "Menú propio"}
                      </Badge>
                    </div>
                    <div className="text-xs pt-1">
                      Empleados: {state.employees.filter(e => e.branchId === branch.id).length}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Employee Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nuevo"} empleado</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <div><Label>Nombre</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>Contraseña{editing ? " (dejar vacío para mantener)" : ""}</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
            <div><Label>Rol</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as UserRole }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roles.map(r => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}</SelectContent></Select>
            </div>
            {state.branches.length > 0 && (
              <div><Label>Sucursal</Label>
                <Select value={form.branchId} onValueChange={v => setForm(f => ({ ...f, branchId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar sucursal" /></SelectTrigger>
                  <SelectContent>
                    {state.branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter><Button onClick={save} disabled={!form.name || !form.email || isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branch Form Dialog */}
      <Dialog open={showBranchForm} onOpenChange={setShowBranchForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingBranch ? "Editar" : "Nueva"} sucursal</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <div><Label>Nombre</Label><Input value={branchForm.name} onChange={e => setBranchForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Sucursal Centro" /></div>
            <div><Label>Dirección</Label><Input value={branchForm.address} onChange={e => setBranchForm(f => ({ ...f, address: e.target.value }))} placeholder="Ej: Av. Principal 123" /></div>
            <div><Label>Teléfono</Label><Input value={branchForm.phone} onChange={e => setBranchForm(f => ({ ...f, phone: e.target.value }))} placeholder="Ej: 555-1234" /></div>
            <div className="flex items-center justify-between">
              <Label>Compartir menú global</Label>
              <Switch checked={branchForm.shareMenu} onCheckedChange={v => setBranchForm(f => ({ ...f, shareMenu: v }))} />
            </div>
            <p className="text-xs text-muted-foreground">
              {branchForm.shareMenu
                ? "Esta sucursal usará el menú global compartido con otras sucursales."
                : "Esta sucursal tendrá su propio menú independiente."}
            </p>
          </div>
          <DialogFooter><Button onClick={saveBranch} disabled={!branchForm.name || isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
