export type UserRole = "admin" | "cajero" | "mesero" | "cocina"

export interface Branch {
  id: string; name: string; address?: string; phone?: string
  tenantId: string; isActive: boolean; shareMenu: boolean
}

export interface User {
  id: string; name: string; email: string; role: UserRole
  tenantId: string; tenantName: string
  branchId?: string; branchName?: string
}

export interface Employee {
  id: string; name: string; email: string; password: string
  role: UserRole; active: boolean; createdAt: string
  tenantId: string; tenantName: string
  branchId?: string; branchName?: string
}

export interface Table {
  id: string; number: number; seats: number; zone: string
  status: "available" | "occupied" | "reserved" | "billing"
  branchId?: string
}

export interface ProductExtra { id: string; name: string; price: number }
export interface ProductIngredient { id: string; name: string; removable: boolean }

export interface Product {
  id: string; name: string; category: string; price: number
  description: string; available: boolean
  requiresKitchen: boolean;
  image?: string;
  extras: ProductExtra[]; ingredients: ProductIngredient[]
  branchId?: string
}

export interface OrderItem {
  id: string; productId: string; productName: string
  quantity: number; unitPrice: number; totalPrice: number
  extras: ProductExtra[]; removedIngredients: string[]
  notes: string; dinerIndex: number
  status: "pending" | "preparing" | "ready" | "delivered"
  product?: Product
}

export interface Order {
  id: string; tableId: string | null; tableNumber: number | null
  items: OrderItem[]; status: "open" | "closed"
  total: number; paymentMethod: string | null
  source: string | null; branchId?: string | null
  createdAt: string; closedAt: string | null
  transactionFolio?: string | null
  invoiced: boolean
  createdByName?: string | null
  closedByName?: string | null
  dinerNames?: string[]
}

export type SupplyCategory = "Carnes" | "Verduras" | "Lacteos" | "Granos" | "Bebidas" | "Condimentos" | "Otros"

export interface Supply {
  id: string; name: string; category: SupplyCategory; unit: string
  stock: number; minStock: number; costPerUnit: number
  branchId?: string
}

export interface SupplyMovement {
  id: string; supplyId: string; supplyName: string
  type: "entry" | "exit" | "waste"; quantity: number
  reason: string; createdAt: string; createdBy: string
  branchId?: string
}

export interface CashShift {
  id: string; openedAt: string; closedAt: string | null; status: "open" | "closed"
  startAmount: number; endAmount: number | null
  expectedCash: number | null; expectedCard: number | null; difference: number | null
  userId: string; userName?: string
  branchId?: string | null
}

export interface ConfigListItem {
  id: string; value: string; label: string; active: boolean; sortOrder: number
}

export interface ConfigList {
  id: string; name: string; items: ConfigListItem[]
}

export interface BusinessConfig {
  name: string
  address: string
  phone: string
  rfc: string
  ticketHeader: string
  ticketFooter: string
  currency: string
  timezone: string
  logo?: string
}

export type ViewId = "dashboard" | "mesas" | "menu" | "pos" | "cocina" | "catalogo" | "reportes" | "empleados" | "configuracion" | "reservas"

export interface Reservation {
  id: string; date: string; customerName: string; customerPhone?: string
  partySize: number; status: "pending" | "confirmed" | "cancelled" | "completed"
  notes?: string; branchId: string; tableId?: string
  createdAt: string
}

export interface RestaurantState {
  tables: Table[]; products: Product[]; orders: Order[]
  employees: Employee[]; supplies: Supply[]; supplyMovements: SupplyMovement[]
  config: BusinessConfig
  shift: CashShift | null
  cashShifts: CashShift[]
  configLists: ConfigList[]
  branches: Branch[]
  currentBranchId: string | null
  reservations: Reservation[]
  draftOrders: Record<string, OrderItem[]>
}

export type RestaurantAction =
  | { type: "SET_TABLES"; payload: Table[] }
  | { type: "SET_PRODUCTS"; payload: Product[] }
  | { type: "SET_ORDERS"; payload: Order[] }
  | { type: "SET_EMPLOYEES"; payload: Employee[] }
  | { type: "SET_SUPPLIES"; payload: Supply[] }
  | { type: "SET_SUPPLY_MOVEMENTS"; payload: SupplyMovement[] }
  | { type: "SET_SHIFT"; payload: CashShift | null }
  | { type: "SET_CASH_SHIFTS"; payload: CashShift[] }
  | { type: "SET_CONFIG_LISTS"; payload: ConfigList[] }
  | { type: "SET_BRANCHES"; payload: Branch[] }
  | { type: "SET_CURRENT_BRANCH"; payload: string | null }
  | { type: "ADD_TABLE"; payload: Table }
  | { type: "UPDATE_TABLE"; payload: Table }
  | { type: "REMOVE_TABLE"; payload: string }
  | { type: "ADD_PRODUCT"; payload: Product }
  | { type: "UPDATE_PRODUCT"; payload: Product }
  | { type: "REMOVE_PRODUCT"; payload: string }
  | { type: "ADD_ORDER"; payload: Order }
  | { type: "UPDATE_ORDER"; payload: Order }
  | { type: "ADD_EMPLOYEE"; payload: Employee }
  | { type: "UPDATE_EMPLOYEE"; payload: Employee }
  | { type: "REMOVE_EMPLOYEE"; payload: string }
  | { type: "ADD_SUPPLY"; payload: Supply }
  | { type: "UPDATE_SUPPLY"; payload: Supply }
  | { type: "REMOVE_SUPPLY"; payload: string }
  | { type: "ADD_SUPPLY_MOVEMENT"; payload: SupplyMovement }
  | { type: "UPDATE_CONFIG"; payload: BusinessConfig }
  | { type: "ADD_BRANCH"; payload: Branch }
  | { type: "UPDATE_BRANCH"; payload: Branch }
  | { type: "SET_RESERVATIONS"; payload: Reservation[] }
  | { type: "ADD_RESERVATION"; payload: Reservation }
  | { type: "UPDATE_RESERVATION"; payload: Reservation }
  | { type: "REMOVE_RESERVATION"; payload: string }
  | { type: "SET_DRAFT_ORDER"; payload: { tableId: string; items: OrderItem[] } }
  | { type: "CLEAR_DRAFT_ORDER"; payload: string }

export interface CategoryHistory {
  id: string; listName: string; action: string; itemName: string
  details?: string | null; userId: string; userName?: string
  createdAt: string
}

export interface AuthState { user: User | null; isAuthenticated: boolean }
export type AuthAction = { type: "LOGIN"; payload: User } | { type: "LOGOUT" }
