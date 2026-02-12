"use client"

import React, { createContext, useContext, useReducer, useState, useCallback, useEffect, type ReactNode } from "react"
import type { RestaurantState, RestaurantAction, AuthState, AuthAction, ViewId, UserRole } from "./types"
import { tables, products, orders, employees, supplies, supplyMovements, defaultConfig, roleHome } from "./mock-data"

// ---- Restaurant reducer ----
function restaurantReducer(s: RestaurantState, a: RestaurantAction): RestaurantState {
  switch (a.type) {
    case "SET_TABLES": return { ...s, tables: a.payload }
    case "SET_PRODUCTS": return { ...s, products: a.payload }
    case "SET_ORDERS": return { ...s, orders: a.payload }
    case "SET_EMPLOYEES": return { ...s, employees: a.payload }
    case "SET_SUPPLIES": return { ...s, supplies: a.payload }
    case "SET_SUPPLY_MOVEMENTS": return { ...s, supplyMovements: a.payload }
    case "SET_SHIFT": return { ...s, shift: a.payload }
    case "SET_CASH_SHIFTS": return { ...s, cashShifts: a.payload }
    case "SET_CONFIG_LISTS": return { ...s, configLists: a.payload }
    case "SET_BRANCHES": return { ...s, branches: a.payload }
    case "SET_CURRENT_BRANCH": return { ...s, currentBranchId: a.payload }
    case "ADD_TABLE": return { ...s, tables: [...s.tables, a.payload] }
    case "UPDATE_TABLE": return { ...s, tables: s.tables.map(t => t.id === a.payload.id ? a.payload : t) }
    case "REMOVE_TABLE": return { ...s, tables: s.tables.filter(t => t.id !== a.payload) }
    case "ADD_PRODUCT": return { ...s, products: [...s.products, a.payload] }
    case "UPDATE_PRODUCT": return { ...s, products: s.products.map(p => p.id === a.payload.id ? a.payload : p) }
    case "REMOVE_PRODUCT": return { ...s, products: s.products.filter(p => p.id !== a.payload) }
    case "ADD_ORDER": return { ...s, orders: [...s.orders, a.payload] }
    case "UPDATE_ORDER": return { ...s, orders: s.orders.map(o => o.id === a.payload.id ? a.payload : o) }
    case "ADD_EMPLOYEE": return { ...s, employees: [...s.employees, a.payload] }
    case "UPDATE_EMPLOYEE": return { ...s, employees: s.employees.map(e => e.id === a.payload.id ? a.payload : e) }
    case "REMOVE_EMPLOYEE": return { ...s, employees: s.employees.filter(e => e.id !== a.payload) }
    case "ADD_SUPPLY": return { ...s, supplies: [...s.supplies, a.payload] }
    case "UPDATE_SUPPLY": return { ...s, supplies: s.supplies.map(su => su.id === a.payload.id ? a.payload : su) }
    case "REMOVE_SUPPLY": return { ...s, supplies: s.supplies.filter(su => su.id !== a.payload) }
    case "ADD_SUPPLY_MOVEMENT": return { ...s, supplyMovements: [...s.supplyMovements, a.payload] }
    case "ADD_BRANCH": return { ...s, branches: [...s.branches, a.payload] }
    case "UPDATE_BRANCH": return { ...s, branches: s.branches.map(b => b.id === a.payload.id ? a.payload : b) }
    case "SET_RESERVATIONS": return { ...s, reservations: a.payload }
    case "ADD_RESERVATION": return { ...s, reservations: [...s.reservations, a.payload] }
    case "UPDATE_RESERVATION": return { ...s, reservations: s.reservations.map(r => r.id === a.payload.id ? a.payload : r) }
    case "REMOVE_RESERVATION": return { ...s, reservations: s.reservations.filter(r => r.id !== a.payload) }
    case "SET_DRAFT_ORDER": return { ...s, draftOrders: { ...s.draftOrders, [a.payload.tableId]: a.payload.items } }
    case "CLEAR_DRAFT_ORDER": {
      const newDrafts = { ...s.draftOrders }
      delete newDrafts[a.payload]
      return { ...s, draftOrders: newDrafts }
    }
    default: return s
  }
}


// ---- Auth reducer with sessionStorage persistence ----
function authReducer(s: AuthState, a: AuthAction): AuthState {
  switch (a.type) {
    case "LOGIN":
      if (typeof window !== "undefined") sessionStorage.setItem("auth", JSON.stringify({ user: a.payload }))
      return { user: a.payload, isAuthenticated: true }
    case "LOGOUT":
      if (typeof window !== "undefined") sessionStorage.removeItem("auth")
      return { user: null, isAuthenticated: false }
    default: return s
  }
}

const emptyAuth: AuthState = { user: null, isAuthenticated: false }

// ---- Context ----
interface StoreValue {
  state: RestaurantState; dispatch: React.Dispatch<RestaurantAction>
  authState: AuthState; authDispatch: React.Dispatch<AuthAction>
  view: ViewId; setView: (v: ViewId) => void
  menuTableId: string | null; openMenu: (tableId: string) => void
}

const Ctx = createContext<StoreValue | null>(null)

// Hardcoded defaults merely as fallback
export const defaultRolePermissions: Record<UserRole, ViewId[]> = {
  admin: ["dashboard", "mesas", "pos", "cocina", "catalogo", "reportes", "empleados", "configuracion", "reservas"],
  cajero: ["dashboard", "mesas", "pos", "reportes", "reservas"],
  mesero: ["mesas", "pos", "reservas"],
  cocina: ["cocina"]
}

export function StoreProvider({ children, initialUser, initialData }: { children: ReactNode, initialUser: any, initialData?: RestaurantState }) {
  const initR: RestaurantState = initialData || { tables, products, orders, employees, supplies, supplyMovements, config: defaultConfig, shift: null, cashShifts: [], configLists: [], branches: [], currentBranchId: null, reservations: [], draftOrders: {} }
  const [state, dispatch] = useReducer(restaurantReducer, initR)

  const [authState, authDispatch] = useReducer(authReducer, { user: initialUser, isAuthenticated: !!initialUser })

  // Default view must be consistent for hydration
  const [view, setViewRaw] = useState<ViewId>("dashboard")
  const [menuTableId, setMenuTableId] = useState<string | null>(null)

  // Client-only initialization to avoid SSR mismatch
  useEffect(() => {
    const saved = sessionStorage.getItem("activeView") as ViewId
    if (saved) {
      setViewRaw(saved)
    } else if (initialUser?.role) {
      const home = roleHome[initialUser.role as import("./types").UserRole] as ViewId
      if (home) setViewRaw(home)
    }
  }, [initialUser])


  // Sync state with server data (revalidation)
  useEffect(() => {
    if (initialData) {
      dispatch({ type: "SET_TABLES", payload: initialData.tables })
      dispatch({ type: "SET_PRODUCTS", payload: initialData.products })
      dispatch({ type: "SET_ORDERS", payload: initialData.orders })
      dispatch({ type: "SET_EMPLOYEES", payload: initialData.employees })
      dispatch({ type: "SET_SUPPLIES", payload: initialData.supplies })
      dispatch({ type: "SET_SUPPLY_MOVEMENTS", payload: initialData.supplyMovements })
      dispatch({ type: "SET_SHIFT", payload: initialData.shift })
      dispatch({ type: "SET_CASH_SHIFTS", payload: initialData.cashShifts })
      dispatch({ type: "SET_CONFIG_LISTS", payload: initialData.configLists })
      dispatch({ type: "SET_BRANCHES", payload: initialData.branches })
      if (initialData.currentBranchId) {
        dispatch({ type: "SET_CURRENT_BRANCH", payload: initialData.currentBranchId })
      }
      // But we don't have a SET_ALL action.
      // Let's rely on component re-mounting? No, StoreProvider is at top.
      // We need to dispatch updates for critical data used in views.
      // Tables, Orders, Products.
      // Products probably don't change often but nice to have.
      // Orders are critical for MenuView and Kitchen.
      // But wait, RestaurantReducer has ADD/UPDATE/REMOVE. 
      // It doesn't have SET_ORDERS.
      // I should add SET_ORDERS, SET_PRODUCTS to types and reducer.
    }
  }, [initialData])

  // Sync view based on role default if needed, or just let AppShell handle it
  useEffect(() => {
    if (initialUser && roleHome[initialUser.role as import("./types").UserRole]) {
      // If we wanted to reset view on login, but usually dashboard is fine
    }
  }, [initialUser])

  const setView = useCallback((v: ViewId) => {
    if (v !== "menu") setMenuTableId(null)
    setViewRaw(v)
    if (typeof window !== "undefined") {
      sessionStorage.setItem("activeView", v)
    }
  }, [])

  const openMenu = useCallback((tableId: string) => {
    setMenuTableId(tableId)
    setViewRaw("menu")
  }, [])

  return (
    <Ctx.Provider value={{ state, dispatch, authState, authDispatch, view, setView, menuTableId, openMenu }}>
      {children}
    </Ctx.Provider>
  )
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useStore must be inside StoreProvider")
  return ctx
}

export { roleHome }

export function useRolePermissions() {
  const { state, authState } = useStore()
  if (!authState.user) return []

  const role = authState.user.role as UserRole
  const listName = `permissions_${role}`
  const configList = state.configLists.find(l => l.name === listName)

  if (configList && configList.items.length > 0) {
    return configList.items.filter(i => i.active).map(i => i.value as ViewId)
  }

  return defaultRolePermissions[role] || []
}
