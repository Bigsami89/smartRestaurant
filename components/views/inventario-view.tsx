import { useState, useTransition } from "react"
import { useStore } from "@/lib/spa-store"
import type { Product, Supply, SupplyMovement, SupplyCategory } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit2, Trash2, Package, ArrowDownCircle, ArrowUpCircle, AlertTriangle, Search, Loader2, ListTodo, Check, X, Image as ImageIcon, Upload } from "lucide-react"
import { createProduct, updateProduct, deleteProduct, toggleProductAvailability, createSupply, updateSupply, deleteSupply, addSupplyMovement, addConfigListItem, updateConfigListItem, deleteConfigListItem, ensureDefaultLists } from "@/lib/actions"
import { compressImage } from "@/lib/image-utils"

// ---- Product Catalog ----
function CatalogoTab() {
  const { state } = useStore()
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: "", category: "General", price: "0", description: "", image: "",
    available: true, requiresKitchen: true
  })
  const [extras, setExtras] = useState<{ name: string; price: number }[]>([])
  const [ingredients, setIngredients] = useState<{ name: string; removable: boolean }[]>([])

  const [isPending, startTransition] = useTransition()

  const filtered = state.products.filter(p => p.branchId === state.currentBranchId && p.name.toLowerCase().includes(search.toLowerCase()))

  function openNew() {
    setEditing(null)
    setFormData({ name: "", category: "Platos fuertes", price: "", description: "", image: "", available: true, requiresKitchen: true })
    setExtras([]); setIngredients([])
    setShowForm(true)
  }
  function openEdit(p: Product) {
    setEditing(p)
    setFormData({
      name: p.name,
      category: p.category,
      price: String(p.price),
      description: p.description ?? "",
      image: p.image || "",
      available: p.available,
      requiresKitchen: p.requiresKitchen !== false
    })
    setExtras(p.extras.map(e => ({ name: e.name, price: e.price })))
    setIngredients(p.ingredients.map(i => ({ name: i.name, removable: i.removable })))
    setShowForm(true)
  }

  function save() {
    startTransition(async () => {
      const data = {
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        description: formData.description,
        image: formData.image,
        available: formData.available,
        requiresKitchen: formData.requiresKitchen,
        extras,
        ingredients,
        branchId: state.currentBranchId
      }

      if (editing) {
        await updateProduct(editing.id, data)
      } else {
        await createProduct(data)
      }
      setShowForm(false)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-8" placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" />Producto</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50 text-left"><th className="p-3">Nombre</th><th className="p-3">Categoria</th><th className="p-3">Precio</th><th className="p-3">Disponible</th><th className="p-3">Acciones</th></tr></thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-3 font-medium">
                  {p.name}
                  <div className="flex gap-1 mt-1">
                    {p.extras.length > 0 && <Badge variant="outline" className="text-[9px] h-4 py-0">+{p.extras.length} Ext</Badge>}
                    {p.ingredients.length > 0 && <Badge variant="outline" className="text-[9px] h-4 py-0">{p.ingredients.length} Ing</Badge>}
                  </div>
                </td>
                <td className="p-3"><Badge variant="secondary">{p.category}</Badge></td>
                <td className="p-3 font-bold">${p.price}</td>
                <td className="p-3"><Switch checked={p.available} onCheckedChange={v => startTransition(async () => { await toggleProductAvailability(p.id, v) })} disabled={isPending} /></td>
                <td className="p-3 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Edit2 className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => startTransition(async () => { if (confirm("¿Eliminar?")) await deleteProduct(p.id) })} disabled={isPending}><Trash2 className="h-3 w-3" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nuevo"} producto</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto pr-2">
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Información Básica</h3>
              <div className="space-y-1"><Label>Nombre</Label><Input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Precio</Label><Input type="number" value={formData.price} onChange={e => setFormData(f => ({ ...f, price: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Categoria</Label>
                  <Select value={formData.category} onValueChange={v => setFormData(f => ({ ...f, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Entradas", "Platos fuertes", "Bebidas", "Postres"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>
              <div className="space-y-1"><Label>Descripcion</Label><Input value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>Imagen</Label>
                <div className="flex gap-4 items-start">
                  {formData.image && (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                      <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                      <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setFormData(f => ({ ...f, image: "" }))}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      className="text-xs"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          try {
                            const compressed = await compressImage(file)
                            setFormData(f => ({ ...f, image: compressed }))
                          } catch (err) {
                            console.error("Error compressing image", err)
                          }
                        }
                      }}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Se comprimirá automáticamente para ahorrar espacio.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 border-t pt-4"> {/* Added a div to group checkboxes and provide spacing */}
                <div className="flex flex-col gap-2"> {/* Grouping checkboxes */}
                  <div className="flex items-center space-x-2">
                    <Checkbox id="available" checked={formData.available} onCheckedChange={(c) => setFormData({ ...formData, available: c as boolean })} />
                    <Label htmlFor="available">Disponible</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="requiresKitchen" checked={formData.requiresKitchen} onCheckedChange={(c) => setFormData({ ...formData, requiresKitchen: c as boolean })} />
                    <Label htmlFor="requiresKitchen">Enviar a cocina</Label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Extras</h3>
                  <Button variant="outline" size="sm" onClick={() => setExtras([...extras, { name: "", price: 0 }])} className="h-6 text-[10px]"><Plus className="h-3 w-3 mr-1" />Agregar</Button>
                </div>
                <div className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border">
                  {extras.length === 0 ? <p className="text-[10px] text-center py-2 text-muted-foreground italic">Sin extras</p> : extras.map((ex, i) => (
                    <div key={i} className="flex gap-2">
                      <Input placeholder="Nombre" className="h-8 text-xs flex-1" value={ex.name} onChange={e => {
                        const next = [...extras]; next[i].name = e.target.value; setExtras(next)
                      }} />
                      <Input type="number" placeholder="$" className="h-8 text-xs w-20" value={ex.price} onChange={e => {
                        const next = [...extras]; next[i].price = parseFloat(e.target.value) || 0; setExtras(next)
                      }} />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setExtras(extras.filter((_, idx) => idx !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Ingredientes</h3>
                  <Button variant="outline" size="sm" onClick={() => setIngredients([...ingredients, { name: "", removable: true }])} className="h-6 text-[10px]"><Plus className="h-3 w-3 mr-1" />Agregar</Button>
                </div>
                <div className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border">
                  {ingredients.length === 0 ? <p className="text-[10px] text-center py-2 text-muted-foreground italic">Sin ingredientes</p> : ingredients.map((ing, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input placeholder="Nombre" className="h-8 text-xs flex-1" value={ing.name} onChange={e => {
                        const next = [...ingredients]; next[i].name = e.target.value; setIngredients(next)
                      }} />
                      <div className="flex items-center gap-1.5 shrink-0 px-1">
                        <Label className="text-[10px] m-0">Removible</Label>
                        <Switch checked={ing.removable} className="scale-75 h-4 w-7" onCheckedChange={v => {
                          const next = [...ingredients]; next[i].removable = v; setIngredients(next)
                        }} />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setIngredients(ingredients.filter((_, idx) => idx !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 pt-4 border-t"><Button onClick={save} className="w-full md:w-auto" disabled={!formData.name || !formData.price || isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar Producto</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- Materia Prima ----
const supplyCategories: SupplyCategory[] = ["Carnes", "Verduras", "Lacteos", "Granos", "Bebidas", "Condimentos", "Otros"]

function MateriaPrimaTab() {
  const { state } = useStore()
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState("Todos")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Supply | null>(null)
  const [form, setForm] = useState({ name: "", category: "Carnes" as SupplyCategory, unit: "kg", stock: "", minStock: "", costPerUnit: "" })
  const [showMove, setShowMove] = useState(false)
  const [moveSupply, setMoveSupply] = useState<Supply | null>(null)
  const [moveType, setMoveType] = useState<"entry" | "exit" | "waste">("entry")
  const [moveQty, setMoveQty] = useState("")
  const [moveReason, setMoveReason] = useState("")

  const [isPending, startTransition] = useTransition()

  const filtered = state.supplies.filter(s => s.branchId === state.currentBranchId && (catFilter === "Todos" || s.category === catFilter) && s.name.toLowerCase().includes(search.toLowerCase()))
  const lowStock = state.supplies.filter(s => s.branchId === state.currentBranchId && s.stock <= s.minStock)
  const totalValue = filtered.reduce((s, su) => s + su.stock * su.costPerUnit, 0)

  function openNew() { setEditing(null); setForm({ name: "", category: "Carnes", unit: "kg", stock: "", minStock: "", costPerUnit: "" }); setShowForm(true) }
  function openEdit(s: Supply) { setEditing(s); setForm({ name: s.name, category: s.category as SupplyCategory, unit: s.unit, stock: String(s.stock), minStock: String(s.minStock), costPerUnit: String(s.costPerUnit) }); setShowForm(true) }

  function save() {
    startTransition(async () => {
      const data = {
        name: form.name, category: form.category, unit: form.unit,
        stock: form.stock, minStock: form.minStock, costPerUnit: form.costPerUnit,
        branchId: state.currentBranchId
      }
      if (editing) {
        await updateSupply(editing.id, data)
      } else {
        await createSupply(data)
      }
      setShowForm(false)
    })
  }

  function openMovement(s: Supply, type: "entry" | "exit" | "waste") { setMoveSupply(s); setMoveType(type); setMoveQty(""); setMoveReason(""); setShowMove(true) }

  function saveMovement() {
    if (!moveSupply) return
    startTransition(async () => {
      await addSupplyMovement({
        supplyId: moveSupply.id,
        type: moveType,
        quantity: moveQty,
        reason: moveReason
      })
      setShowMove(false)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Valor total</p><p className="text-lg font-bold">${totalValue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Insumos</p><p className="text-lg font-bold">{state.supplies.filter(s => s.branchId === state.currentBranchId).length}</p></CardContent></Card>
        <Card className={lowStock.length > 0 ? "border-destructive/50" : ""}><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Stock bajo</p><p className={`text-lg font-bold ${lowStock.length > 0 ? "text-destructive" : ""}`}>{lowStock.length}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-8" placeholder="Buscar insumo..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={catFilter} onValueChange={setCatFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem>{supplyCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
        <Button size="sm" className="gap-1" onClick={openNew}><Plus className="h-4 w-4" />Insumo</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50 text-left"><th className="p-3">Insumo</th><th className="p-3">Categoria</th><th className="p-3">Stock</th><th className="p-3">Min</th><th className="p-3">Costo/u</th><th className="p-3">Acciones</th></tr></thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className={`border-b last:border-0 ${s.stock <= s.minStock ? "bg-destructive/5" : ""}`}>
                <td className="p-3 font-medium">{s.name}{s.stock <= s.minStock && <AlertTriangle className="ml-1 inline h-3 w-3 text-destructive" />}</td>
                <td className="p-3"><Badge variant="secondary">{s.category}</Badge></td>
                <td className="p-3">{s.stock} {s.unit}</td>
                <td className="p-3">{s.minStock}</td>
                <td className="p-3">${s.costPerUnit}</td>
                <td className="p-3"><div className="flex gap-1">
                  <Button size="sm" variant="ghost" title="Entrada" onClick={() => openMovement(s, "entry")} disabled={isPending}><ArrowDownCircle className="h-3 w-3 text-success" /></Button>
                  <Button size="sm" variant="ghost" title="Salida" onClick={() => openMovement(s, "exit")} disabled={isPending}><ArrowUpCircle className="h-3 w-3 text-warning" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Edit2 className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => startTransition(async () => { if (confirm("¿Eliminar?")) await deleteSupply(s.id) })} disabled={isPending}><Trash2 className="h-3 w-3" /></Button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent movements */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Movimientos recientes</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            {state.supplyMovements.filter(m => m.branchId === state.currentBranchId).slice(-8).reverse().map(m => (
              <div key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm odd:bg-muted/30">
                <Badge variant={m.type === "entry" ? "default" : m.type === "exit" ? "secondary" : "destructive"} className="text-xs">{m.type === "entry" ? "Entrada" : m.type === "exit" ? "Salida" : "Merma"}</Badge>
                <span className="flex-1">{m.supplyName}</span>
                <span className="font-medium">{m.type === "entry" ? "+" : "-"}{m.quantity}</span>
                <span className="text-xs text-muted-foreground">{m.createdBy}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Supply form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nuevo"} insumo</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <div><Label>Nombre</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Categoria</Label><Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as SupplyCategory }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{supplyCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Unidad</Label><Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} /></div>
              <div><Label>Min</Label><Input type="number" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))} /></div>
              <div><Label>Costo/u</Label><Input type="number" value={form.costPerUnit} onChange={e => setForm(f => ({ ...f, costPerUnit: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={save} disabled={!form.name || isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement form */}
      <Dialog open={showMove} onOpenChange={setShowMove}>
        <DialogContent>
          <DialogHeader><DialogTitle>{moveType === "entry" ? "Registrar entrada" : moveType === "exit" ? "Registrar salida" : "Registrar merma"} - {moveSupply?.name}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <div><Label>Cantidad ({moveSupply?.unit})</Label><Input type="number" value={moveQty} onChange={e => setMoveQty(e.target.value)} /></div>
            <div><Label>Motivo</Label><Input value={moveReason} onChange={e => setMoveReason(e.target.value)} placeholder={moveType === "entry" ? "Ej: Compra proveedor" : "Ej: Consumo diario"} /></div>
          </div>
          <DialogFooter><Button onClick={saveMovement} disabled={!moveQty || Number(moveQty) <= 0 || isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Registrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- Listas Configurables ----
function ListasTab() {
  const { state } = useStore()
  const [isPending, startTransition] = useTransition()
  const [newItem, setNewItem] = useState<{ listName: string; value: string; label: string } | null>(null)
  const [editingItem, setEditingItem] = useState<{ id: string; label: string; active: boolean } | null>(null)

  const listLabels: Record<string, string> = {
    order_sources: "Fuentes de Pedido",
    product_categories: "Categorías de Productos",
    table_zones: "Zonas de Mesas"
  }

  function handleEnsureDefaults() {
    startTransition(async () => {
      await ensureDefaultLists()
    })
  }

  function handleAddItem() {
    if (!newItem?.value || !newItem?.label) return
    startTransition(async () => {
      await addConfigListItem(newItem.listName, newItem.value, newItem.label)
      setNewItem(null)
    })
  }

  function handleUpdateItem() {
    if (!editingItem) return
    startTransition(async () => {
      await updateConfigListItem(editingItem.id, editingItem.label, editingItem.active)
      setEditingItem(null)
    })
  }

  function handleDeleteItem(id: string) {
    if (!confirm("¿Eliminar este elemento?")) return
    startTransition(async () => {
      await deleteConfigListItem(id)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {state.configLists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
            <ListTodo className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No hay listas configuradas</p>
            <Button onClick={handleEnsureDefaults} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear listas predeterminadas
            </Button>
          </CardContent>
        </Card>
      ) : (
        state.configLists.map(list => (
          <Card key={list.id}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">{listLabels[list.name] || list.name}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setNewItem({ listName: list.name, value: "", label: "" })}>
                <Plus className="h-3 w-3 mr-1" />Agregar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {list.items.map(item => (
                  <div key={item.id} className={`flex items-center gap-2 p-2 rounded-lg border ${!item.active ? "bg-muted/50 opacity-60" : ""}`}>
                    {editingItem?.id === item.id ? (
                      <>
                        <Input
                          className="flex-1 h-8"
                          value={editingItem.label}
                          onChange={e => setEditingItem({ ...editingItem, label: e.target.value })}
                        />
                        <label className="flex items-center gap-1.5 text-xs">
                          <Switch
                            checked={editingItem.active}
                            onCheckedChange={v => setEditingItem({ ...editingItem, active: v })}
                          />
                          Activo
                        </label>
                        <Button size="sm" variant="ghost" onClick={handleUpdateItem} disabled={isPending}>
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className="text-xs">{item.value}</Badge>
                        <span className="flex-1 text-sm">{item.label}</span>
                        {!item.active && <Badge variant="secondary" className="text-[10px]">Inactivo</Badge>}
                        <Button size="sm" variant="ghost" onClick={() => setEditingItem({ id: item.id, label: item.label, active: item.active })}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteItem(item.id)} disabled={isPending}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
                {list.items.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin elementos</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Add new item dialog */}
      {(() => {
        const placeholders: Record<string, { value: string; label: string }> = {
          order_sources: { value: "ej: uber_eats", label: "ej: Uber Eats" },
          product_categories: { value: "ej: sopas", label: "ej: Sopas" },
          table_zones: { value: "ej: jardin", label: "ej: Jardín" },
        }
        const ph = placeholders[newItem?.listName || ""] || { value: "ej: valor", label: "ej: Etiqueta" }
        return (
          <Dialog open={!!newItem} onOpenChange={open => !open && setNewItem(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Agregar a {listLabels[newItem?.listName || ""] || "lista"}</DialogTitle></DialogHeader>
              <div className="flex flex-col gap-3">
                <div><Label>Valor (ID interno)</Label><Input placeholder={ph.value} value={newItem?.value || ""} onChange={e => setNewItem(n => n ? { ...n, value: e.target.value } : null)} /></div>
                <div><Label>Etiqueta (visible)</Label><Input placeholder={ph.label} value={newItem?.label || ""} onChange={e => setNewItem(n => n ? { ...n, label: e.target.value } : null)} /></div>
              </div>
              <DialogFooter><Button onClick={handleAddItem} disabled={!newItem?.value || !newItem?.label || isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Agregar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )
      })()}
    </div>
  )
}

export function CatalogoView() {
  return (
    <Tabs defaultValue="productos">
      <TabsList className="mx-auto">
        <TabsTrigger value="productos">Productos</TabsTrigger>
        <TabsTrigger value="insumos">Insumos</TabsTrigger>
        <TabsTrigger value="listas">Listas</TabsTrigger>
      </TabsList>
      <TabsContent value="productos" className="mt-4"><CatalogoTab /></TabsContent>
      <TabsContent value="insumos" className="mt-4"><MateriaPrimaTab /></TabsContent>
      <TabsContent value="listas" className="mt-4"><ListasTab /></TabsContent>
    </Tabs>
  )
}
