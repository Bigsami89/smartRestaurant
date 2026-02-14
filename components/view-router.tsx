"use client"

import { useStore, roleHome, useRolePermissions } from "@/lib/spa-store"
import { AppShell } from "@/components/app-shell"
import { DashboardView } from "@/components/views/dashboard-view"
import { MesasView } from "@/components/views/mesas-view"
import { MenuView } from "@/components/views/menu-view"
import { PosView } from "@/components/views/pos-view"
import { CocinaView } from "@/components/views/cocina-view"
import { CatalogoView } from "@/components/views/inventario-view"
import { EmpleadosView } from "@/components/views/empleados-view"
import { ReportesView } from "@/components/views/reportes-view"
import { useEffect } from "react"
import type { ViewId, UserRole } from "@/lib/types"

import { ReservationsView } from "@/components/views/reservations-view"
import { ConfiguracionView } from "@/components/views/configuracion-view"

export function ViewRouter() {
    const { authState, view, setView } = useStore()
    const allowed = useRolePermissions()

    if (!authState.isAuthenticated) return null

    // Guard: redirect to role home if current view is not allowed
    // "menu" is a sub-view of "mesas", so allow it if user has "mesas" access
    const isViewAllowed = view === "menu"
        ? allowed.includes("mesas")
        : allowed.includes(view)

    useEffect(() => {
        if (!isViewAllowed && authState.user) {
            const role = authState.user.role as UserRole
            const home = (roleHome[role] || "dashboard") as ViewId
            setView(allowed.includes(home) ? home : allowed[0] || "dashboard")
        }
    }, [isViewAllowed, authState.user, allowed, setView])

    if (!isViewAllowed) return null

    return (
        <AppShell>
            {view === "dashboard" && <DashboardView />}
            {view === "mesas" && <MesasView />}
            {view === "reservas" && <ReservationsView />}
            {view === "menu" && <MenuView />}
            {view === "pos" && <PosView />}
            {view === "cocina" && <CocinaView />}
            {view === "catalogo" && <CatalogoView />}
            {view === "empleados" && <EmpleadosView />}
            {view === "reportes" && <ReportesView />}
            {view === "configuracion" && <ConfiguracionView />}
        </AppShell>
    )
}
