"use client"

import { useStore, defaultRolePermissions } from "@/lib/spa-store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Save, Shield, LayoutDashboard, Grid3X3, CreditCard, ChefHat, Package, BarChart3, Users, UtensilsCrossed, Armchair, Calendar, Settings } from "lucide-react"
import type { ViewId, UserRole } from "@/lib/types"
import { useTransition, useState, useEffect, useRef } from "react"
import { updateRolePermissions, updateBusinessConfig } from "@/lib/actions"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { ImagePlus, Trash2 } from "lucide-react"

const roles: { id: UserRole; label: string }[] = [
    { id: "admin", label: "Administrador" },
    { id: "cajero", label: "Cajero" },
    { id: "mesero", label: "Mesero" },
    { id: "cocina", label: "Cocina" },
]

const views: { id: ViewId; label: string; icon: any }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "mesas", label: "Mesas", icon: Armchair },
    { id: "reservas", label: "Reservas", icon: Calendar },
    { id: "menu", label: "Menú", icon: UtensilsCrossed },
    { id: "pos", label: "Punto de Venta", icon: CreditCard },
    { id: "cocina", label: "Pantalla Cocina", icon: ChefHat },
    { id: "catalogo", label: "Inventario / Catálogo", icon: Package },
    { id: "empleados", label: "Empleados", icon: Users },
    { id: "reportes", label: "Reportes", icon: BarChart3 },
    { id: "configuracion", label: "Configuración", icon: Settings },
]

export function ConfiguracionView() {
    const { state, authState, dispatch } = useStore()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [selectedRole, setSelectedRole] = useState<UserRole>("admin")
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Permissions Local State
    const [permissions, setPermissions] = useState<Record<UserRole, ViewId[]>>({ ...defaultRolePermissions })

    // Business Config State
    const [businessData, setBusinessData] = useState({
        name: state.config.name,
        address: state.config.address,
        phone: state.config.phone,
        rfc: state.config.rfc,
        ticketHeader: state.config.ticketHeader,
        ticketFooter: state.config.ticketFooter,
        currency: state.config.currency,
        timezone: state.config.timezone,
        logo: state.config.logo || ""
    })

    // Sync businessData when global state changes
    useEffect(() => {
        setBusinessData({
            name: state.config.name,
            address: state.config.address,
            phone: state.config.phone,
            rfc: state.config.rfc,
            ticketHeader: state.config.ticketHeader,
            ticketFooter: state.config.ticketFooter,
            currency: state.config.currency,
            timezone: state.config.timezone,
            logo: state.config.logo || ""
        })
    }, [state.config])

    // Load from configLists on mount / change
    useEffect(() => {
        const loaded: Record<string, ViewId[]> = {}
        let hasCustom = false

        roles.forEach(role => {
            const listName = `permissions_${role.id}`
            const list = state.configLists.find(l => l.name === listName)
            if (list) {
                loaded[role.id] = list.items.filter(i => i.active).map(i => i.value as ViewId)
                hasCustom = true
            } else {
                loaded[role.id] = defaultRolePermissions[role.id]
            }
        })

        if (hasCustom) {
            setPermissions(prev => ({ ...prev, ...loaded }))
        }
    }, [state.configLists])

    function togglePermission(role: UserRole, viewId: ViewId) {
        setPermissions(prev => {
            const current = prev[role] || []
            const exists = current.includes(viewId)
            let next = exists ? current.filter(v => v !== viewId) : [...current, viewId]

            // Prevent locking out configuration for admin
            if (role === 'admin' && viewId === 'configuracion' && exists) {
                alert("No puedes quitar el acceso a configuración al administrador.")
                return prev
            }

            return { ...prev, [role]: next }
        })
    }

    function handleSave(role: UserRole) {
        const viewIds = permissions[role]
        startTransition(async () => {
            const res = await updateRolePermissions(role, viewIds)
            if (res.success) {
                router.refresh()
            } else {
                alert("Error al guardar permisos")
            }
        })
    }

    function handleSaveConfig() {
        startTransition(async () => {
            const res = await updateBusinessConfig(businessData)
            if (res.success) {
                router.refresh()
            } else {
                alert("Error al guardar la configuración")
            }
        })
    }

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 1024 * 1024) {
            alert("El archivo es demasiado grande (máximo 1MB)")
            return
        }

        const reader = new FileReader()
        reader.onload = (event) => {
            const base64 = event.target?.result as string
            setBusinessData(prev => ({ ...prev, logo: base64 }))
        }
        reader.readAsDataURL(file)
    }

    if (authState.user?.role !== "admin") {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                <p>No tienes acceso a esta sección.</p>
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100vh-6rem)] flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Configuración</h2>
                    <p className="text-muted-foreground">Administra los permisos y accesos del sistema.</p>
                </div>
            </div>

            <Tabs defaultValue="general" className="flex-1 flex flex-col">
                <TabsList>
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="roles">Permisos por Rol</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="flex-1 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Branding</CardTitle>
                                <CardDescription>Configura el nombre y el logo de tu restaurante.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="res-name">Nombre del Restaurante</Label>
                                    <Input
                                        id="res-name"
                                        value={businessData.name}
                                        onChange={(e) => setBusinessData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Ej. La Trattoria"
                                    />
                                </div>

                                <div className="space-y-4 pt-2">
                                    <Label>Logotipo</Label>
                                    <div className="flex items-center gap-6">
                                        <div className="relative h-24 w-24 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted/50">
                                            {businessData.logo ? (
                                                <img
                                                    src={businessData.logo}
                                                    alt="Restaurant logo"
                                                    className="h-full w-full object-contain"
                                                />
                                            ) : (
                                                <ImagePlus className="h-8 w-8 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                Subir Logo
                                            </Button>
                                            {businessData.logo && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => setBusinessData(prev => ({ ...prev, logo: "" }))}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Eliminar
                                                </Button>
                                            )}
                                            <p className="text-[10px] text-muted-foreground max-w-[150px]">
                                                JPG, PNG o SVG. Máximo 1MB. Se utilizará para el sidebar y tickets.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Información de Negocio</CardTitle>
                                <CardDescription>Datos que aparecerán en tus tickets de venta.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="res-phone">Teléfono</Label>
                                        <Input
                                            id="res-phone"
                                            value={businessData.phone}
                                            onChange={(e) => setBusinessData(prev => ({ ...prev, phone: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="res-rfc">RFC</Label>
                                        <Input
                                            id="res-rfc"
                                            value={businessData.rfc}
                                            onChange={(e) => setBusinessData(prev => ({ ...prev, rfc: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="res-address">Dirección</Label>
                                    <Input
                                        id="res-address"
                                        value={businessData.address}
                                        onChange={(e) => setBusinessData(prev => ({ ...prev, address: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="res-header">Encabezado de Ticket</Label>
                                    <Input
                                        id="res-header"
                                        value={businessData.ticketHeader}
                                        onChange={(e) => setBusinessData(prev => ({ ...prev, ticketHeader: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="res-footer">Pie de Ticket</Label>
                                    <Input
                                        id="res-footer"
                                        value={businessData.ticketFooter}
                                        onChange={(e) => setBusinessData(prev => ({ ...prev, ticketFooter: e.target.value }))}
                                    />
                                </div>
                            </CardContent>
                            <div className="border-t p-4 flex justify-end">
                                <Button onClick={handleSaveConfig} disabled={isPending}>
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    Guardar Configuración
                                </Button>
                            </div>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="roles" className="flex-1 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-full">
                        {/* Role Selector */}
                        <Card className="col-span-1 border-none shadow-none bg-muted/30">
                            <CardHeader className="px-4 py-3">
                                <CardTitle className="text-base">Roles</CardTitle>
                            </CardHeader>
                            <CardContent className="px-2">
                                <div className="flex flex-col gap-1">
                                    {roles.map(role => (
                                        <button
                                            key={role.id}
                                            onClick={() => setSelectedRole(role.id)}
                                            className={`flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${selectedRole === role.id
                                                ? "bg-primary text-primary-foreground font-medium"
                                                : "hover:bg-muted text-foreground"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Shield className="h-3.5 w-3.5" />
                                                {role.label}
                                            </div>
                                            {(permissions[role.id]?.length || 0) > 0 && (
                                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                                    {permissions[role.id]?.length}
                                                </Badge>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Permissions Editor */}
                        <Card className="col-span-1 md:col-span-3 h-full flex flex-col">
                            <CardHeader className="border-b pb-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>{roles.find(r => r.id === selectedRole)?.label}</CardTitle>
                                        <CardDescription>
                                            Selecciona las vistas a las que tiene acceso el {roles.find(r => r.id === selectedRole)?.label.toLowerCase()}.
                                        </CardDescription>
                                    </div>
                                    <Button onClick={() => handleSave(selectedRole)} disabled={isPending}>
                                        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                        Guardar Cambios
                                    </Button>
                                </div>
                            </CardHeader>
                            <ScrollArea className="flex-1">
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {views.map(view => {
                                            const isAllowed = permissions[selectedRole]?.includes(view.id)
                                            const Icon = view.icon
                                            return (
                                                <div
                                                    key={view.id}
                                                    className={`
                                                        flex items-start space-x-3 rounded-lg border p-4 transition-all
                                                        ${isAllowed ? "border-primary bg-primary/5" : "opacity-70"}
                                                    `}
                                                >
                                                    <Checkbox
                                                        id={view.id}
                                                        checked={isAllowed}
                                                        onCheckedChange={() => togglePermission(selectedRole, view.id)}
                                                    />
                                                    <div className="grid gap-1.5 leading-none">
                                                        <Label
                                                            htmlFor={view.id}
                                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                                                        >
                                                            <Icon className="h-4 w-4 text-muted-foreground" />
                                                            {view.label}
                                                        </Label>
                                                        <p className="text-xs text-muted-foreground">
                                                            Acceso al módulo de {view.label.toLowerCase()}.
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </ScrollArea>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
