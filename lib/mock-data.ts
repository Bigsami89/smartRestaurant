import type { Table, Product, Order, Employee, Supply, SupplyMovement, UserRole, BusinessConfig } from "./types"

export const defaultConfig: BusinessConfig = {
  name: "La Trattoria",
  address: "Av. Reforma 123, Col. Centro, CDMX",
  phone: "55 1234 5678",
  rfc: "XAXX010101000",
  ticketHeader: "Gracias por su visita",
  ticketFooter: "Este no es un comprobante fiscal",
  currency: "MXN",
  timezone: "America/Mexico_City",
}

export const roleLabels: Record<UserRole, string> = {
  admin: "Administrador", cajero: "Cajero", mesero: "Mesero", cocina: "Cocina",
}
export const roleHome: Record<UserRole, string> = {
  admin: "dashboard", cajero: "pos", mesero: "mesas", cocina: "cocina",
}
export const roleAllowedViews: Record<UserRole, string[]> = {
  admin: ["dashboard", "mesas", "menu", "pos", "cocina", "catalogo", "reportes", "empleados"],
  cajero: ["pos"], mesero: ["mesas", "menu"], cocina: ["cocina"],
}

export const employees: Employee[] = [
  { id: "emp1", name: "Carlos Admin", email: "admin@demo.com", password: "demo1234", role: "admin", active: true, createdAt: "2025-01-15T10:00:00Z", tenantId: "t1", tenantName: "La Trattoria" },
  { id: "emp2", name: "Ana Cajera", email: "cajero@demo.com", password: "demo1234", role: "cajero", active: true, createdAt: "2025-02-10T10:00:00Z", tenantId: "t1", tenantName: "La Trattoria" },
  { id: "emp3", name: "Luis Mesero", email: "mesero@demo.com", password: "demo1234", role: "mesero", active: true, createdAt: "2025-03-05T10:00:00Z", tenantId: "t1", tenantName: "La Trattoria" },
  { id: "emp4", name: "Maria Cocina", email: "cocina@demo.com", password: "demo1234", role: "cocina", active: true, createdAt: "2025-03-20T10:00:00Z", tenantId: "t1", tenantName: "La Trattoria" },
]

export const tables: Table[] = [
  { id: "t1", number: 1, seats: 4, zone: "Interior", status: "occupied" },
  { id: "t2", number: 2, seats: 2, zone: "Interior", status: "available" },
  { id: "t3", number: 3, seats: 6, zone: "Interior", status: "reserved" },
  { id: "t4", number: 4, seats: 4, zone: "Terraza", status: "available" },
  { id: "t5", number: 5, seats: 8, zone: "Terraza", status: "occupied" },
  { id: "t6", number: 6, seats: 2, zone: "Terraza", status: "billing" },
]

const mkExtra = (id: string, name: string, price: number) => ({ id, name, price })
const mkIng = (id: string, name: string) => ({ id, name, removable: true })

export const products: Product[] = [
  { id: "p1", name: "Tacos al Pastor", category: "Platos fuertes", price: 95, description: "3 tacos con pina", available: true, extras: [mkExtra("e1", "Queso extra", 15), mkExtra("e2", "Guacamole", 25)], ingredients: [mkIng("i1", "Cebolla"), mkIng("i2", "Cilantro"), mkIng("i3", "Pina")] },
  { id: "p2", name: "Enchiladas Suizas", category: "Platos fuertes", price: 120, description: "3 enchiladas con salsa verde", available: true, extras: [mkExtra("e3", "Crema extra", 10)], ingredients: [mkIng("i4", "Crema"), mkIng("i5", "Queso")] },
  { id: "p3", name: "Hamburguesa Clasica", category: "Platos fuertes", price: 140, description: "Con papas", available: true, extras: [mkExtra("e4", "Tocino", 30), mkExtra("e5", "Queso extra", 20)], ingredients: [mkIng("i6", "Lechuga"), mkIng("i7", "Tomate"), mkIng("i8", "Cebolla")] },
  { id: "p4", name: "Ensalada Caesar", category: "Entradas", price: 85, description: "Lechuga, parmesano, crutones", available: true, extras: [mkExtra("e6", "Pollo", 35)], ingredients: [mkIng("i9", "Crutones"), mkIng("i10", "Parmesano")] },
  { id: "p5", name: "Sopa Azteca", category: "Entradas", price: 75, description: "Sopa de tortilla", available: true, extras: [mkExtra("e7", "Aguacate extra", 20)], ingredients: [mkIng("i11", "Tortilla frita"), mkIng("i12", "Aguacate")] },
  { id: "p6", name: "Agua de Horchata", category: "Bebidas", price: 35, description: "Jarra individual", available: true, extras: [], ingredients: [] },
  { id: "p7", name: "Cerveza IPA", category: "Bebidas", price: 65, description: "Cerveza artesanal 355ml", available: true, extras: [], ingredients: [] },
  { id: "p8", name: "Flan Napolitano", category: "Postres", price: 55, description: "Flan casero", available: true, extras: [mkExtra("e8", "Caramelo extra", 10)], ingredients: [] },
]

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600000).toISOString()
}

export const orders: Order[] = [
  {
    id: "o1", tableId: "t1", tableNumber: 1, status: "open", paymentMethod: null, source: "direct", createdAt: hoursAgo(1), closedAt: null, total: 285, invoiced: false, items: [
      { id: "oi1", productId: "p1", productName: "Tacos al Pastor", quantity: 2, unitPrice: 95, totalPrice: 190, extras: [], removedIngredients: [], notes: "", dinerIndex: 0, status: "ready" },
      { id: "oi2", productId: "p6", productName: "Agua de Horchata", quantity: 1, unitPrice: 35, totalPrice: 35, extras: [], removedIngredients: [], notes: "", dinerIndex: 0, status: "delivered" },
      { id: "oi3", productId: "p8", productName: "Flan Napolitano", quantity: 1, unitPrice: 55, totalPrice: 60, extras: [{ id: "e8", name: "Caramelo extra", price: 10 }], removedIngredients: [], notes: "", dinerIndex: 1, status: "pending" },
    ]
  },
  {
    id: "o2", tableId: "t5", tableNumber: 5, status: "open", paymentMethod: null, source: "direct", createdAt: hoursAgo(2), closedAt: null, total: 330, invoiced: false, items: [
      { id: "oi4", productId: "p3", productName: "Hamburguesa Clasica", quantity: 1, unitPrice: 140, totalPrice: 170, extras: [{ id: "e4", name: "Tocino", price: 30 }], removedIngredients: ["Cebolla"], notes: "Termino medio", dinerIndex: 0, status: "preparing" },
      { id: "oi5", productId: "p2", productName: "Enchiladas Suizas", quantity: 1, unitPrice: 120, totalPrice: 120, extras: [], removedIngredients: [], notes: "", dinerIndex: 1, status: "pending" },
      { id: "oi6", productId: "p7", productName: "Cerveza IPA", quantity: 2, unitPrice: 65, totalPrice: 130, extras: [], removedIngredients: [], notes: "", dinerIndex: 0, status: "delivered" },
    ]
  },
]

export const supplies: Supply[] = [
  { id: "s1", name: "Carne de res", category: "Carnes", unit: "kg", stock: 25, minStock: 10, costPerUnit: 180 },
  { id: "s2", name: "Pechuga de pollo", category: "Carnes", unit: "kg", stock: 18, minStock: 8, costPerUnit: 120 },
  { id: "s3", name: "Lechuga romana", category: "Verduras", unit: "pzas", stock: 30, minStock: 10, costPerUnit: 25 },
  { id: "s4", name: "Tomate", category: "Verduras", unit: "kg", stock: 15, minStock: 5, costPerUnit: 35 },
  { id: "s5", name: "Queso mozzarella", category: "Lacteos", unit: "kg", stock: 8, minStock: 3, costPerUnit: 220 },
  { id: "s6", name: "Harina para pizza", category: "Granos", unit: "kg", stock: 20, minStock: 8, costPerUnit: 28 },
  { id: "s7", name: "Tortillas de maiz", category: "Granos", unit: "paquetes", stock: 50, minStock: 20, costPerUnit: 18 },
  { id: "s8", name: "Aceite de oliva", category: "Condimentos", unit: "litros", stock: 6, minStock: 3, costPerUnit: 150 },
  { id: "s9", name: "Cerveza IPA", category: "Bebidas", unit: "botellas", stock: 80, minStock: 24, costPerUnit: 35 },
]

export const supplyMovements: SupplyMovement[] = [
  { id: "sm1", supplyId: "s1", supplyName: "Carne de res", type: "entry", quantity: 15, reason: "Compra proveedor", createdAt: hoursAgo(48), createdBy: "Carlos Admin" },
  { id: "sm2", supplyId: "s3", supplyName: "Lechuga romana", type: "entry", quantity: 20, reason: "Compra mercado", createdAt: hoursAgo(24), createdBy: "Carlos Admin" },
  { id: "sm3", supplyId: "s5", supplyName: "Queso mozzarella", type: "exit", quantity: 2, reason: "Consumo diario", createdAt: hoursAgo(12), createdBy: "Maria Cocina" },
  { id: "sm4", supplyId: "s4", supplyName: "Tomate", type: "waste", quantity: 3, reason: "Producto en mal estado", createdAt: hoursAgo(2), createdBy: "Luis Mesero" },
]
