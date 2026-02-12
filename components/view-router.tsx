"use client"

import { useStore, roleHome } from "@/lib/spa-store"
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
import type { ViewId } from "@/lib/types"

import { ReservationsView } from "@/components/views/reservations-view"
import { ConfiguracionView } from "@/components/views/configuracion-view"

export function ViewRouter() {
    const { authState, view, setView } = useStore()


    if (!authState.isAuthenticated) return null // Should be handled by middleware/redirect, but safe guard

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
