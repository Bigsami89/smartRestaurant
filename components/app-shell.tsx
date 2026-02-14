"use client"

import React, { useEffect } from "react"
import { signOut } from "next-auth/react"

import type { ReactNode } from "react"
import { useStore, useRolePermissions } from "@/lib/spa-store"
import type { ViewId } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ReservationsView } from "@/components/views/reservations-view"
import { LayoutDashboard, Grid3X3, CreditCard, ChefHat, Package, BarChart3, Users, LogOut, Menu, X, UtensilsCrossed, Building2, Armchair, Calendar, Settings } from "lucide-react"
import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ThemeToggle } from "@/components/theme-toggle"

const navItems: { id: ViewId; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "mesas", label: "Mesas", icon: Armchair },
  { id: "reservas", label: "Reservas", icon: Calendar },
  { id: "menu", label: "Menú", icon: UtensilsCrossed },
  { id: "pos", label: "POS", icon: CreditCard },
  { id: "cocina", label: "Cocina", icon: ChefHat },
  { id: "catalogo", label: "Catálogo", icon: Package },
  { id: "empleados", label: "Empleados", icon: Users },
  { id: "reportes", label: "Reportes", icon: BarChart3 },
  { id: "configuracion", label: "Configuración", icon: Settings },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { authState, authDispatch, view, setView, state, dispatch } = useStore()
  const allowed = useRolePermissions()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  // const allowed = (authState.user && roleAllowedViews[authState.user.role as import("@/lib/types").UserRole]) || [] // Deprecated
  const visible = navItems.filter(n => allowed.includes(n.id))
  const currentLabel = view === "menu" ? "Menu" : (visible.find(n => n.id === view)?.label ?? "RestaurantOS")

  const isAdmin = authState.user?.role === "admin"
  const userBranchId = authState.user?.branchId

  // Mark as mounted after hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Force employee's branch on mount (non-admins can only access their assigned branch)
  useEffect(() => {
    if (!isAdmin && userBranchId && state.currentBranchId !== userBranchId) {
      dispatch({ type: "SET_CURRENT_BRANCH", payload: userBranchId })
    }
  }, [isAdmin, userBranchId, state.currentBranchId, dispatch])


  const handleBranchChange = (branchId: string) => {
    // Only admins can change branch
    if (!isAdmin) return
    dispatch({ type: "SET_CURRENT_BRANCH", payload: branchId })
    if (typeof window !== "undefined") {
      sessionStorage.setItem("currentBranchId", branchId)
    }
  }

  const currentBranch = state.branches.find(b => b.id === state.currentBranchId)

  // Check if employee has no branch assigned (block access)
  const employeeNoBranch = !isAdmin && !userBranchId

  if (employeeNoBranch) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Sin sucursal asignada</h2>
          <p className="text-muted-foreground mb-4">
            Tu cuenta no tiene una sucursal asignada. Contacta a un administrador para que te asigne a una sucursal.
          </p>
          <Button onClick={() => signOut()}>Cerrar sesión</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden w-56 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center gap-2 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary overflow-hidden">
            {state.config.logo ? (
              <img src={state.config.logo} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <UtensilsCrossed className="h-4 w-4 text-sidebar-primary-foreground" />
            )}
          </div>
          <span className="text-sm font-semibold truncate">{state.config.name || authState.user?.tenantName || "RestaurantOS"}</span>
        </div>

        {/* Branch selector - only for admins, only after mount to avoid hydration issues */}
        {mounted && isAdmin && state.branches.length > 0 && (
          <div className="px-3 pb-2">
            <Select value={state.currentBranchId || ""} onValueChange={handleBranchChange}>
              <SelectTrigger className="w-full h-8 text-xs bg-sidebar-accent/30 border-sidebar-border">
                <Building2 className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Sucursal" />
              </SelectTrigger>
              <SelectContent>
                {state.branches.map(b => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Branch badge for non-admins */}
        {!isAdmin && currentBranch && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs bg-sidebar-accent/30 rounded-md border border-sidebar-border">
              <Building2 className="h-3 w-3" />
              <span>{currentBranch.name}</span>
            </div>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {visible.map(n => (
            <button key={n.id} onClick={() => setView(n.id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${view === n.id ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`}>
              <n.icon className="h-4 w-4" />{n.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 px-3 flex items-center justify-between">
            <span className="text-xs text-sidebar-foreground/50">{authState.user?.name}</span>
            <ThemeToggle variant="sidebar" />
          </div>
          <button onClick={() => signOut()} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50">
            <LogOut className="h-4 w-4" />Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-40 bg-foreground/40 md:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-56 transform bg-sidebar text-sidebar-foreground transition-transform md:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary overflow-hidden">
              {state.config.logo ? (
                <img src={state.config.logo} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <UtensilsCrossed className="h-4 w-4 text-sidebar-primary-foreground" />
              )}
            </div>
            <span className="text-sm font-semibold truncate max-w-[120px]">{state.config.name || authState.user?.tenantName || "RestaurantOS"}</span>
          </div>
          <button onClick={() => setOpen(false)}><X className="h-5 w-5 text-sidebar-foreground" /></button>
        </div>

        {/* Mobile branch selector - only for admins, only after mount */}
        {mounted && isAdmin && state.branches.length > 0 && (
          <div className="px-3 pb-2">
            <Select value={state.currentBranchId || ""} onValueChange={handleBranchChange}>
              <SelectTrigger className="w-full h-8 text-xs bg-sidebar-accent/30 border-sidebar-border">
                <Building2 className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Sucursal" />
              </SelectTrigger>
              <SelectContent>
                {state.branches.map(b => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Mobile branch badge for non-admins */}
        {!isAdmin && currentBranch && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs bg-sidebar-accent/30 rounded-md border border-sidebar-border">
              <Building2 className="h-3 w-3" />
              <span>{currentBranch.name}</span>
            </div>
          </div>
        )}

        <nav className="flex flex-col gap-1 px-3 py-2">
          {visible.map(n => (
            <button key={n.id} onClick={() => { setView(n.id); setOpen(false) }}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${view === n.id ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"}`}>
              <n.icon className="h-4 w-4" />{n.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto border-t border-sidebar-border p-3">
          <div className="mb-2 px-3 flex items-center justify-between">
            <span className="text-xs text-sidebar-foreground/50">{authState.user?.name}</span>
            <ThemeToggle variant="sidebar" />
          </div>
          <button onClick={() => signOut()} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50">
            <LogOut className="h-4 w-4" />Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
          <button className="md:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <h1 className="text-lg font-semibold text-card-foreground">{currentLabel}</h1>
          <div className="ml-auto flex items-center gap-2">
            {currentBranch && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {currentBranch.name}
              </span>
            )}
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  )
}
