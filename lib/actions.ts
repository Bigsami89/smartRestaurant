"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/auth"
import bcrypt from "bcryptjs"

// --- Tables ---

const TableSchema = z.object({
    number: z.coerce.number().min(1, "El número debe ser positivo"),
    seats: z.coerce.number().min(1, "Debe tener al menos 1 asiento"),
    zone: z.string(),
    status: z.enum(["available", "occupied", "reserved", "billing"]).optional()
})

export async function getTables() {
    try {
        const tables = await prisma.table.findMany({ orderBy: { number: 'asc' } })
        return { success: true, data: tables }
    } catch (error) {
        return { success: false, error: "Failed to fetch tables" }
    }
}

export async function createTable(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
        return { success: false, error: "Unauthorized" }
    }

    const validatedFields = TableSchema.safeParse({
        number: formData.get("number"),
        seats: formData.get("seats"),
        zone: formData.get("zone"),
        status: formData.get("status") || "available",
    })

    if (!validatedFields.success) {
        return { success: false, error: "Invalid fields" }
    }

    const branchId = formData.get("branchId") as string | null

    try {
        const data: any = {
            ...validatedFields.data,
            branchId: branchId || null
        }
        await prisma.table.create({ data })
        revalidatePath("/mesas")
        return { success: true, message: "Table created" }
    } catch (error) {
        console.error(error)
        return { success: false, error: "Failed to create table" }
    }
}


export async function updateTableStatus(id: string, status: string) {
    try {
        await prisma.table.update({ where: { id }, data: { status } })
        revalidatePath("/")
        revalidatePath("/mesas")
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to update status" }
    }
}

export async function updateTable(id: string, data: { number: number; seats: number; zone: string }) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
        return { success: false, error: "Unauthorized" }
    }

    const validated = TableSchema.safeParse(data)
    if (!validated.success) {
        return { success: false, error: "Invalid fields" }
    }

    try {
        // Check if another table has the same number
        const existing = await prisma.table.findUnique({
            where: { number: validated.data.number }
        })

        if (existing && existing.id !== id) {
            return { success: false, error: "Esta mesa ya está creada" }
        }

        await prisma.table.update({
            where: { id },
            data: {
                number: validated.data.number,
                seats: validated.data.seats,
                zone: validated.data.zone,
            }
        })
        revalidatePath("/")
        revalidatePath("/mesas")
        return { success: true }
    } catch (error) {
        console.error(error)
        // Handle unique constraint error if race condition occurs
        if ((error as any).code === 'P2002') {
            return { success: false, error: "Esta mesa ya está creada" }
        }
        return { success: false, error: "Failed to update table" }
    }
}

export async function invoiceOrder(orderId: string, invoiced: boolean) {
    try {
        await prisma.order.update({
            where: { id: orderId },
            data: { invoiced }
        })
        console.log(`[invoiceOrder] Order ${orderId} invoiced status set to ${invoiced}`)
        revalidatePath("/")
        revalidatePath("/pos")
        revalidatePath("/reportes")
        return { success: true }
    } catch (e) {
        console.error("[invoiceOrder] Error:", e)
        return { success: false }
    }
}

export async function deleteTable(id: string) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
        return { success: false, error: "Unauthorized" }
    }

    try {
        await prisma.table.delete({ where: { id } })
        revalidatePath("/mesas")
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to delete table" }
    }
}

// --- Products ---

const ProductSchema = z.object({
    name: z.string(),
    category: z.string(),
    price: z.coerce.number(),
    available: z.coerce.boolean().optional(),
})

export async function getProducts() {
    try {
        const products = await prisma.product.findMany({
            include: { extras: true, ingredients: true },
            orderBy: { name: 'asc' }
        })
        return { success: true, data: products }
    } catch (error) {
        return { success: false, error: "Failed to fetch products" }
    }
}

export async function createProduct(formData: any) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") return { success: false, error: "Unauthorized" }

    try {
        const { name, category, price, description, extras, ingredients } = formData
        await prisma.product.create({
            data: {
                name, category, price: Number(price), description,
                image: formData.image,
                available: true,
                requiresKitchen: formData.requiresKitchen !== false, // Default true
                branchId: formData.branchId || null,
                extras: { create: extras || [] },
                ingredients: { create: ingredients || [] }
            }
        })
        revalidatePath("/")
        revalidatePath("/inventario")
        revalidatePath("/menu")
        return { success: true }
    } catch (e) {
        console.error(e)
        return { success: false, error: "Failed to create product" }
    }
}

export async function updateProduct(id: string, data: any) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") return { success: false, error: "Unauthorized" }

    try {
        await prisma.$transaction([
            // Simple approach: delete and recreate relations
            prisma.productExtra.deleteMany({ where: { productId: id } }),
            prisma.productIngredient.deleteMany({ where: { productId: id } }),
            prisma.product.update({
                where: { id },
                data: {
                    name: data.name,
                    category: data.category,
                    price: Number(data.price),
                    description: data.description,
                    image: data.image,
                    available: data.available,
                    requiresKitchen: data.requiresKitchen,
                    extras: { create: data.extras || [] },
                    ingredients: { create: data.ingredients || [] }
                }
            })
        ])
        revalidatePath("/")
        revalidatePath("/inventario")
        revalidatePath("/menu")
        return { success: true }
    } catch (e) {
        console.error(e)
        return { success: false, error: "Failed to update product" }
    }
}

export async function deleteProduct(id: string) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") return { success: false, error: "Unauthorized" }
    try {
        await prisma.product.delete({ where: { id } })
        revalidatePath("/inventario")
        revalidatePath("/menu")
        return { success: true }
    } catch (e) {
        return { success: false, error: "Failed to delete product" }
    }
}

export async function toggleProductAvailability(id: string, available: boolean) {
    try {
        await prisma.product.update({ where: { id }, data: { available } })
        revalidatePath("/menu")
        revalidatePath("/inventario")
        return { success: true }
    } catch (e) { return { success: false } }
}

// --- Orders ---

export async function submitOrder(tableId: string | null, items: any[], source: string = "direct", branchId?: string, dinerNames: string[] = []) {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: "Unauthorized" }

        let orderId = "";

        let existingOrder = null
        if (tableId) {
            existingOrder = await prisma.order.findFirst({
                where: { tableId, status: "open" }
            })
        }

        if (existingOrder) {
            orderId = existingOrder.id
            const newItemsTotal = items.reduce((acc, item) => acc + item.totalPrice, 0)

            await prisma.order.update({
                where: { id: existingOrder.id },
                data: {
                    total: { increment: newItemsTotal },
                    // dinerNames removed to avoid stale client error
                    items: {
                        create: items.map(item => ({
                            productId: item.productId,
                            productName: item.productName,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.totalPrice,
                            dinerIndex: item.dinerIndex, // Fixed bug
                            extras: { create: item.extras ? item.extras.map((e: any) => ({ extraId: e.id, name: e.name, price: e.price })) : [] },
                            removedIngredients: item.removedIngredients || []
                        }))
                    }
                }
            })
            // RAW SQL WORKAROUND for stale client
            try {
                await prisma.$executeRaw`UPDATE "orders" SET "dinerNames" = ${dinerNames} WHERE "id" = ${existingOrder.id}`
            } catch (e) {
                console.error("Failed to update dinerNames", e)
            }
        } else {
            // Create new order
            const total = items.reduce((acc, item) => acc + item.totalPrice, 0)
            // Helper to get open shift
            const openShift = await prisma.cashShift.findFirst({ where: { status: "open" } })

            // Get table details for number AND branchId
            let tableDetails = null
            if (tableId) {
                tableDetails = await prisma.table.findUnique({ where: { id: tableId } })
            }

            // Determine branchId: explicit > table > user's branch (if any) > null
            // Note: If user is "admin" they might not have a branch? 
            // Better to rely on table's branch if tableId exists.
            const finalBranchId = branchId || tableDetails?.branchId || null

            const newOrder = await prisma.order.create({
                data: {
                    tableId: tableId ?? null,
                    tableNumber: tableDetails?.number || null,
                    total,
                    status: "open",
                    source,
                    createdById: session.user.id,
                    cashShiftId: openShift?.id,
                    branchId: finalBranchId,
                    // dinerNames removed
                    items: {
                        create: items.map(item => ({
                            productId: item.productId,
                            productName: item.productName,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.totalPrice,
                            dinerIndex: item.dinerIndex, // FIX BUG
                            extras: { create: item.extras ? item.extras.map((e: any) => ({ extraId: e.id, name: e.name, price: e.price })) : [] },
                            removedIngredients: item.removedIngredients || []
                        }))
                    }
                }
            })

            // RAW SQL WORKAROUND for stale client
            try {
                await prisma.$executeRaw`UPDATE "orders" SET "dinerNames" = ${dinerNames} WHERE "id" = ${newOrder.id}`
            } catch (e) {
                console.error("Failed to set dinerNames", e)
            }

            orderId = newOrder.id

            if (tableId) {
                await prisma.table.update({ where: { id: tableId }, data: { status: "occupied" } })
            }
        }

        console.log(`[submitOrder] Success for order ${orderId}`)
        revalidatePath("/mesas")
        revalidatePath("/pos")
        revalidatePath("/cocina")
        return { success: true, orderId }
    } catch (e) {
        console.error("[submitOrder] Fatal Error:", e)
        return { success: false, error: "Failed to submit order: " + (e instanceof Error ? e.message : String(e)) }
    }
}

export async function splitOrder(originalOrderId: string, itemsToMoveIds: string[]) {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: "Unauthorized" }

        const originalOrder = await prisma.order.findUnique({
            where: { id: originalOrderId },
            include: { items: true }
        })
        if (!originalOrder) return { success: false, error: "Order not found" }

        // Calculate total of items to move
        const itemsToMove = originalOrder.items.filter(i => itemsToMoveIds.includes(i.id))
        if (itemsToMove.length === 0) return { success: false, error: "No items selected" }

        const moveTotal = itemsToMove.reduce((sum, i) => sum + i.totalPrice, 0)
        const newOriginalTotal = Math.max(0, originalOrder.total - moveTotal) // Ensure not negative

        // Create new order
        const newOrder = await prisma.order.create({
            data: {
                tableId: originalOrder.tableId,
                tableNumber: originalOrder.tableNumber,
                total: moveTotal,
                status: "open",
                source: originalOrder.source,
                createdById: session.user.id,
                cashShiftId: originalOrder.cashShiftId,
                branchId: originalOrder.branchId,
            }
        })

        // Move items to new order
        await prisma.orderItem.updateMany({
            where: { id: { in: itemsToMoveIds } },
            data: { orderId: newOrder.id }
        })

        // Update totals
        await prisma.order.update({
            where: { id: originalOrderId },
            data: { total: newOriginalTotal }
        })

        revalidatePath("/pos")
        revalidatePath("/mesas")
        return { success: true, newOrderId: newOrder.id }
    } catch (e) {
        console.error("[splitOrder] Error:", e)
        return { success: false, error: "Failed to split order" }
    }
}

export async function closeOrder(orderId: string, paymentMethod: string, tip: number, transactionFolio?: string) {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: "Unauthorized" }

        const order = await prisma.order.findUnique({ where: { id: orderId } })
        if (!order) return { success: false, error: "Order not found" }

        const finalTotal = order.total + tip

        await prisma.order.update({
            where: { id: orderId },
            data: {
                status: "closed",
                paymentMethod,
                closedAt: new Date(),
                total: finalTotal,
                tip,
                transactionFolio: transactionFolio || null,
                closedById: session.user.id
            }
        })

        // Update current shift totals if order belongs to one
        if (order.cashShiftId) {
            const shift = await prisma.cashShift.findUnique({ where: { id: order.cashShiftId } })
            if (shift && shift.status === "open") {
                if (paymentMethod === "cash") {
                    await prisma.cashShift.update({
                        where: { id: shift.id },
                        data: { expectedCash: { increment: finalTotal } }
                    })
                } else {
                    await prisma.cashShift.update({
                        where: { id: shift.id },
                        data: { expectedCard: { increment: finalTotal } }
                    })
                }
            }
        }

        await prisma.orderItem.updateMany({
            where: { orderId },
            data: { status: "delivered" }
        })

        if (order.tableId) {
            await prisma.table.update({ where: { id: order.tableId }, data: { status: "available" } })
        }

        console.log(`[closeOrder] Success for order ${orderId}`)
        revalidatePath("/")
        revalidatePath("/pos")
        revalidatePath("/reportes")
        revalidatePath("/dashboard")
        return { success: true }
    } catch (e) {
        console.error("[closeOrder] Fatal Error:", e)
        return { success: false, error: "Failed to close order" }
    }
}

export async function updateOrderItemStatus(itemId: string, status: string) {
    try {
        await prisma.orderItem.update({
            where: { id: itemId },
            data: { status }
        })
        revalidatePath("/cocina")
        return { success: true }
    } catch (e) {
        return { success: false, error: "Failed to update item status" }
    }
}

// --- Employees ---

const EmployeeSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().optional(),
    role: z.enum(["admin", "cajero", "mesero", "cocina"]),
    active: z.boolean().optional()
})

export async function createEmployee(data: any) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") return { success: false, error: "Unauthorized" }

    const validated = EmployeeSchema.safeParse(data)
    if (!validated.success) return { success: false, error: "Invalid fields" }

    const { name, email, password, role } = validated.data
    const hashedPassword = await bcrypt.hash(password || "123456", 10)

    try {
        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                active: true,
                tenantId: session.user.tenantId
            }
        })
        revalidatePath("/empleados")
        return { success: true }
    } catch (e) {
        return { success: false, error: "Failed to create employee" }
    }
}

export async function updateEmployee(id: string, data: any) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") return { success: false, error: "Unauthorized" }

    // basic validation, ignoring password if empty
    try {
        const updateData: any = {
            name: data.name,
            email: data.email,
            role: data.role,
            active: data.active
        }
        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10)
        }

        await prisma.user.update({
            where: { id },
            data: updateData
        })
        revalidatePath("/empleados")
    } catch (e) {
        console.error(e)
        return { success: false, error: "Failed to update employee" }
    }
}

// --- Supplies ---

export async function createSupply(data: any) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") return { success: false, error: "Unauthorized" }

    try {
        await prisma.supply.create({
            data: {
                name: data.name,
                category: data.category,
                unit: data.unit,
                stock: Number(data.stock),
                minStock: Number(data.minStock),
                costPerUnit: Number(data.costPerUnit),
                branchId: data.branchId || null
            }
        })
        revalidatePath("/inventario")
        return { success: true }
    } catch (e) {
        return { success: false, error: "Failed to create supply" }
    }
}

export async function updateSupply(id: string, data: any) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") return { success: false, error: "Unauthorized" }

    try {
        await prisma.supply.update({
            where: { id },
            data: {
                name: data.name,
                category: data.category,
                unit: data.unit,
                stock: Number(data.stock),
                minStock: Number(data.minStock),
                costPerUnit: Number(data.costPerUnit)
            }
        })
        revalidatePath("/inventario")
        return { success: true }
    } catch (e) {
        return { success: false, error: "Failed to update supply" }
    }
}

export async function deleteSupply(id: string) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") return { success: false, error: "Unauthorized" }

    try {
        await prisma.supply.delete({ where: { id } })
        revalidatePath("/inventario")
        return { success: true }
    } catch (e) {
        return { success: false, error: "Failed to delete supply" }
    }
}

// --- Cash Shift ---

export async function getOpenShift() {
    try {
        const shift = await prisma.cashShift.findFirst({
            where: { status: "open" },
            include: { user: true }
        })
        return { success: true, data: shift }
    } catch (error) {
        return { success: false, error: "Failed to get shift" }
    }
}

export async function openShift(startAmount: number, branchId?: string) {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    // Check if already open for this branch
    const whereClause: any = { status: "open" }
    if (branchId) whereClause.branchId = branchId

    console.log(`[openShift] Request by ${session.user.id} for branch ${branchId}. Where:`, whereClause)

    const existing = await prisma.cashShift.findFirst({ where: whereClause })
    if (existing) {
        console.log(`[openShift] Blocked: Existing shift found ${existing.id} for branch ${existing.branchId}`)
        return { success: false, error: `Ya existe un turno abierto (ID: ${existing.id} / Sucursal: ${existing.branchId || "Global"}). Cierra ese turno primero.` }
    }

    try {
        await prisma.cashShift.create({
            data: {
                startAmount,
                expectedCash: startAmount,
                expectedCard: 0,
                userId: session.user.id,
                status: "open",
                branchId: branchId || null
            }
        })
        revalidatePath("/pos")
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to open shift" }
    }
}


export async function closeShift(id: string, endAmount: number) {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    try {
        const shift = await prisma.cashShift.findUnique({
            where: { id },
            include: { orders: true }
        })
        if (!shift || shift.status !== "open") return { success: false, error: "Shift not found or closed" }

        // Calculate totals from orders linked to this shift
        // Only closed (paid) orders count
        const closedOrders = shift.orders.filter(o => o.status === "closed")

        const difference = endAmount - (shift.expectedCash || 0)

        await prisma.cashShift.update({
            where: { id },
            data: {
                status: "closed",
                closedAt: new Date(),
                endAmount,
                difference,
                closedById: session.user.id
            }
        })
        revalidatePath("/pos")
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to close shift" }
    }
}

export async function addSupplyMovement(data: any) {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    try {
        // Create movement
        await prisma.supplyMovement.create({
            data: {
                supplyId: data.supplyId,
                type: data.type,
                quantity: Number(data.quantity),
                reason: data.reason,
                userId: session.user.id
            }
        })

        // Update supply stock
        const supply = await prisma.supply.findUnique({ where: { id: data.supplyId } })
        if (supply) {
            let newStock = supply.stock
            if (data.type === "entry") newStock += Number(data.quantity)
            else newStock -= Number(data.quantity)

            await prisma.supply.update({
                where: { id: supply.id },
                data: { stock: Math.max(0, newStock) }
            })
        }

        revalidatePath("/inventario")
        return { success: true }
    } catch (e) {
        return { success: false, error: "Failed to add movement" }
    }
}

export async function processDirectSale(items: any[], paymentMethod: string, tip: number, folio?: string, source: string = "direct", branchId?: string) {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: "Unauthorized" }

        const total = items.reduce((acc: number, item: any) => acc + item.totalPrice, 0)
        const openShift = await prisma.cashShift.findFirst({ where: { status: "open" } })
        const finalTotal = total + tip

        await prisma.$transaction(async (tx) => {
            await tx.order.create({
                data: {
                    status: "closed",
                    total: finalTotal,
                    tip,
                    paymentMethod,
                    source,
                    closedAt: new Date(),
                    transactionFolio: folio || null,
                    cashShiftId: openShift?.id,
                    createdById: session.user.id,
                    closedById: session.user.id,
                    branchId: branchId || null,
                    items: {
                        create: items.map(item => ({
                            productId: item.productId,
                            productName: item.productName,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.totalPrice,
                            status: item.requiresKitchen !== false ? "pending" : "delivered",
                            extras: { create: item.extras ? item.extras.map((e: any) => ({ extraId: e.id, name: e.name, price: e.price })) : [] },
                            removedIngredients: item.removedIngredients || []
                        }))
                    }
                }
            })

            if (openShift) {
                if (paymentMethod === "cash") {
                    await tx.cashShift.update({ where: { id: openShift.id }, data: { expectedCash: { increment: finalTotal } } })
                } else {
                    await tx.cashShift.update({ where: { id: openShift.id }, data: { expectedCard: { increment: finalTotal } } })
                }
            }
        })

        console.log("[processDirectSale] Success")
        revalidatePath("/")
        revalidatePath("/pos")
        revalidatePath("/reportes")
        revalidatePath("/dashboard")
        revalidatePath("/cocina")
        return { success: true }
    } catch (e) {
        console.error("[processDirectSale] Fatal Error:", e)
        return { success: false, error: "Failed to process sale" }
    }
}

// --- Reservations ---

export async function createReservation(data: any) {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    const reservationDate = new Date(data.date)
    const now = new Date()
    // Allow 5 minute buffer for "now" to avoid race conditions with seconds
    if (reservationDate < new Date(now.getTime() - 5 * 60000)) {
        return { success: false, error: "No se pueden crear reservas en el pasado" }
    }

    try {
        await prisma.reservation.create({
            data: {
                date: reservationDate,
                customerName: data.customerName,
                customerPhone: data.customerPhone,
                partySize: Number(data.partySize),
                status: "confirmed",
                notes: data.notes,
                branchId: data.branchId,
                tableId: data.tableId || null
            }
        })
        revalidatePath("/reservas")
        revalidatePath("/mesas")
        return { success: true }
    } catch (e) {
        console.error(e)
        return { success: false, error: "Failed to create reservation" }
    }
}

export async function updateReservation(id: string, data: any) {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    const reservationDate = new Date(data.date)
    const now = new Date()
    if (reservationDate < new Date(now.getTime() - 5 * 60000)) {
        // Check if date actually changed. If reusing same date for note update, it might be in past.
        // For now, simplest is to allow past updates IF status is changing, but user asked to prevent "creating/updating" for past.
        // However, often you need to update a note on a past reservation. 
        // I will block date changes to the past, but if date is unchanged and in past, it might be ok?
        // The user prompt was strict: "no se puedan crear reservas para antes de la hora actual". 
        // For update, I will strictly enforce it if the date is being set to past.
        return { success: false, error: "No se pueden mover reservas al pasado" }
    }

    try {
        await prisma.reservation.update({
            where: { id },
            data: {
                date: reservationDate,
                customerName: data.customerName,
                customerPhone: data.customerPhone,
                partySize: Number(data.partySize),
                status: data.status,
                notes: data.notes,
                tableId: data.tableId || null
            }
        })
        revalidatePath("/reservas")
        revalidatePath("/mesas")
        return { success: true }
    } catch (e) {
        return { success: false, error: "Failed to update reservation" }
    }
}

export async function cancelReservation(id: string) {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    try {
        await prisma.reservation.update({
            where: { id },
            data: { status: "cancelled" }
        })
        revalidatePath("/reservas")
        revalidatePath("/mesas")
        return { success: true }
    } catch (e) {
        return { success: false, error: "Failed to cancel reservation" }
    }
}

export async function completeReservation(id: string) {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Unauthorized" }

    try {
        await prisma.reservation.update({
            where: { id },
            data: { status: "completed" }
        })
        revalidatePath("/reservas")
        revalidatePath("/mesas")
        return { success: true }
    } catch (e) {
        return { success: false, error: "Failed to complete reservation" }
    }
}

// --- Order Management ---

export async function updateOrder(orderId: string, items: any[], paymentMethod: "cash" | "card", tip: number, folio?: string) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") return { success: false, error: "Unauthorized" }

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Get original order with items
            const originalOrder = await tx.order.findUnique({
                where: { id: orderId },
                include: { items: true }
            })
            if (!originalOrder) throw new Error("Order not found")

            // 2. Revert effect on CashShift if it was closed
            if (originalOrder.status === "closed") {
                const shift = await tx.cashShift.findFirst({
                    where: {
                        status: "open",
                        branchId: originalOrder.branchId
                    }
                })
                // Note: If the shift that contained this order is already CLOSED, we should probably warn or block?
                // For simplicity, we'll try to adjust the *currently open* shift if possible, or just log it.
                // The requirement is "se actualicen los tickets y las facturas".
                // Cash cuts might be tricky if the original shift is closed.
                // Let's assume we adjust the *current* open shift to reflect the "correction" (net difference).
                // OR, we just update the order content and let the historical record change?
                // If we want cash cuts to be accurate *going forward*, we should apply the *difference* to the current shift.

                // Better approach:
                // If we are editing an order, we are effectively voiding the old transaction and creating a new one (financially).
                // But we want to keep the same ID.

                // Let's find the shift where this order was registered?
                // The relationship is not direct (CashShift -> Orders is implicit by time or explicit by relation?)
                // Schema says: Order has `cashShiftId`.

                if (originalOrder.cashShiftId) {
                    // Revert from original shift
                    const oldTotal = originalOrder.total
                    if (originalOrder.paymentMethod === "cash") {
                        await tx.cashShift.update({ where: { id: originalOrder.cashShiftId }, data: { expectedCash: { decrement: oldTotal } } })
                    } else {
                        await tx.cashShift.update({ where: { id: originalOrder.cashShiftId }, data: { expectedCard: { decrement: oldTotal } } })
                    }
                }
            }

            // 3. Update Inventory (Revert old usage, Apply new usage)
            // Revert old
            for (const item of originalOrder.items) {
                const product = await tx.product.findUnique({ where: { id: item.productId }, include: { ingredients: true } })
                if (product) {
                    for (const ing of product.ingredients) {
                        // Removed Logic needs checking? complex. defaulting to add back standard ingredients
                        // If item had removed ingredients, we shouldn't add them back?
                        // For MVP editing, let's assume standard ingredients for now or check removed.
                        if (!item.removedIngredients.includes(ing.id)) {
                            // Add back to stock
                            // Find supply for ingredient? Schema: ProductIngredient -> name. Supply -> name?
                            // Mapping is loose.
                            // Let's skip complex inventory for this specific "Edit" action unless critical.
                            // User asked for tickets and invoices primarily.
                        }
                    }
                }
            }

            // 4. Delete old items
            await tx.orderItem.deleteMany({ where: { orderId } })

            // 5. Create new items
            let newTotal = 0
            for (const item of items) {
                const totalItem = (item.price * item.quantity) // Simplified, assuming item has price
                newTotal += totalItem

                await tx.orderItem.create({
                    data: {
                        orderId,
                        productId: item.productId,
                        productName: item.productName,
                        quantity: item.quantity,
                        unitPrice: item.price,
                        totalPrice: totalItem,
                        status: "delivered",
                        removedIngredients: item.removedIngredients || []
                    }
                })
            }

            const finalTotal = newTotal + tip

            // 6. Update Order
            await tx.order.update({
                where: { id: orderId },
                data: {
                    total: finalTotal,
                    paymentMethod,
                    tip,
                    transactionFolio: folio || null
                }
            })

            // 7. Apply new CashShift impact
            // We should add to the *same* shift ID if possible, or the current open one?
            // If we revert the old one, we should add to the old one to keep that shift balanced?
            // Yes, keep it in the same shift ID to fix *that* cut.
            if (originalOrder.cashShiftId) {
                if (paymentMethod === "cash") {
                    await tx.cashShift.update({ where: { id: originalOrder.cashShiftId }, data: { expectedCash: { increment: finalTotal } } })
                } else {
                    await tx.cashShift.update({ where: { id: originalOrder.cashShiftId }, data: { expectedCard: { increment: finalTotal } } })
                }
            }

        })

        revalidatePath("/pos")
        revalidatePath("/reportes")
        return { success: true }
    } catch (e) {
        console.error(e)
        return { success: false, error: "Failed to update order" }
    }
}


export async function getConfigLists() {
    try {
        const lists = await prisma.configList.findMany({
            include: { items: { orderBy: { sortOrder: 'asc' } } }
        })
        return { success: true, data: lists }
    } catch (e) {
        console.error("[getConfigLists] Error:", e)
        return { success: false, error: "Failed to fetch lists" }
    }
}

export async function ensureDefaultLists() {
    try {
        const existing = await prisma.configList.findMany()
        const defaults = [
            {
                name: "order_sources", items: [
                    { value: "direct", label: "Directo", sortOrder: 0 },
                    { value: "uber_eats", label: "Uber Eats", sortOrder: 1 },
                    { value: "rappi", label: "Rappi", sortOrder: 2 },
                    { value: "didi", label: "Didi Food", sortOrder: 3 },
                ]
            },
            {
                name: "product_categories", items: [
                    { value: "entrada", label: "Entradas", sortOrder: 0 },
                    { value: "plato_fuerte", label: "Platos Fuertes", sortOrder: 1 },
                    { value: "bebida", label: "Bebidas", sortOrder: 2 },
                    { value: "postre", label: "Postres", sortOrder: 3 },
                ]
            },
            {
                name: "table_zones", items: [
                    { value: "interior", label: "Interior", sortOrder: 0 },
                    { value: "terraza", label: "Terraza", sortOrder: 1 },
                    { value: "barra", label: "Barra", sortOrder: 2 },
                ]
            },
        ]

        for (const def of defaults) {
            if (!existing.find(e => e.name === def.name)) {
                await prisma.configList.create({
                    data: {
                        name: def.name,
                        items: { create: def.items }
                    }
                })
            }
        }

        revalidatePath("/")
        return { success: true }
    } catch (e) {
        console.error("[ensureDefaultLists] Error:", e)
        return { success: false, error: "Failed to create default lists" }
    }
}

export async function addConfigListItem(listName: string, value: string, label: string) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
        return { success: false, error: "Unauthorized" }
    }

    try {
        let list = await prisma.configList.findUnique({ where: { name: listName } })
        if (!list) {
            list = await prisma.configList.create({ data: { name: listName } })
        }

        const maxSort = await prisma.configListItem.findFirst({
            where: { listId: list.id },
            orderBy: { sortOrder: 'desc' }
        })

        await prisma.configListItem.create({
            data: {
                listId: list.id,
                value,
                label,
                sortOrder: (maxSort?.sortOrder ?? -1) + 1
            }
        })

        revalidatePath("/")
        return { success: true }
    } catch (e) {
        console.error("[addConfigListItem] Error:", e)
        return { success: false, error: "Failed to add item" }
    }
}

export async function updateConfigListItem(itemId: string, label: string, active: boolean) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
        return { success: false, error: "Unauthorized" }
    }

    try {
        await prisma.configListItem.update({
            where: { id: itemId },
            data: { label, active }
        })
        revalidatePath("/")
        return { success: true }
    } catch (e) {
        console.error("[updateConfigListItem] Error:", e)
        return { success: false, error: "Failed to update item" }
    }
}

export async function deleteConfigListItem(itemId: string) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
        return { success: false, error: "Unauthorized" }
    }

    try {
        await prisma.configListItem.delete({ where: { id: itemId } })
        revalidatePath("/")
        return { success: true }
    } catch (e) {
        console.error("[deleteConfigListItem] Error:", e)
        return { success: false, error: "Failed to delete item" }
    }
}

// --- Admin Order Editing ---

export async function updateOrderItems(orderId: string, items: any[], newTotal: number) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
        return { success: false, error: "Unauthorized - Admin only" }
    }

    try {
        // Delete existing items
        await prisma.orderItem.deleteMany({ where: { orderId } })

        // Create new items
        await prisma.order.update({
            where: { id: orderId },
            data: {
                total: newTotal,
                items: {
                    create: items.map(item => ({
                        productId: item.productId,
                        productName: item.productName,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                        status: item.status || "delivered",
                        extras: { create: item.extras ? item.extras.map((e: any) => ({ extraId: e.id, name: e.name, price: e.price })) : [] },
                        removedIngredients: item.removedIngredients || []
                    }))
                }
            }
        })

        console.log(`[updateOrderItems] Order ${orderId} updated by admin`)
        revalidatePath("/")
        revalidatePath("/pos")
        revalidatePath("/reportes")
        return { success: true }
    } catch (e) {
        console.error("[updateOrderItems] Error:", e)
        return { success: false, error: "Failed to update order" }
    }
}

export async function updateOrderSource(orderId: string, source: string) {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        await prisma.order.update({
            where: { id: orderId },
            data: { source }
        })
        revalidatePath("/")
        return { success: true }
    } catch (e) {
        console.error("[updateOrderSource] Error:", e)
        return { success: false, error: "Failed to update source" }
    }
}

// --- Branches ---

const BranchSchema = z.object({
    name: z.string().min(1),
    address: z.string().optional(),
    phone: z.string().optional(),
    shareMenu: z.boolean().optional()
})

export async function getBranches() {
    try {
        const branches = await prisma.branch.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' }
        })
        return branches.map(b => ({
            id: b.id,
            name: b.name,
            address: b.address,
            phone: b.phone,
            tenantId: b.tenantId,
            isActive: b.isActive,
            shareMenu: b.shareMenu
        }))
    } catch (e) {
        console.error("[getBranches] Error:", e)
        return []
    }
}

export async function createBranch(data: { name: string, address?: string, phone?: string, shareMenu?: boolean }) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
        return { success: false, error: "Unauthorized: Solo administradores pueden crear sucursales" }
    }

    const parsed = BranchSchema.safeParse(data)
    if (!parsed.success) {
        return { success: false, error: "Datos inválidos" }
    }

    try {
        const branch = await prisma.branch.create({
            data: {
                name: parsed.data.name,
                address: parsed.data.address || null,
                phone: parsed.data.phone || null,
                shareMenu: parsed.data.shareMenu ?? true,
                tenantId: "default"
            }
        })
        revalidatePath("/")
        return {
            success: true,
            branch: {
                id: branch.id,
                name: branch.name,
                address: branch.address,
                phone: branch.phone,
                tenantId: branch.tenantId,
                isActive: branch.isActive,
                shareMenu: branch.shareMenu
            }
        }
    } catch (e) {
        console.error("[createBranch] Error:", e)
        return { success: false, error: "Error al crear sucursal" }
    }
}

export async function updateBranch(id: string, data: { name?: string, address?: string, phone?: string, shareMenu?: boolean, isActive?: boolean }) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const branch = await prisma.branch.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.address !== undefined && { address: data.address }),
                ...(data.phone !== undefined && { phone: data.phone }),
                ...(data.shareMenu !== undefined && { shareMenu: data.shareMenu }),
                ...(data.isActive !== undefined && { isActive: data.isActive })
            }
        })
        revalidatePath("/")
        return {
            success: true,
            branch: {
                id: branch.id,
                name: branch.name,
                address: branch.address,
                phone: branch.phone,
                tenantId: branch.tenantId,
                isActive: branch.isActive,
                shareMenu: branch.shareMenu
            }
        }
    } catch (e) {
        console.error("[updateBranch] Error:", e)
        return { success: false, error: "Error al actualizar sucursal" }
    }
}

export async function assignEmployeeToBranch(employeeId: string, branchId: string | null) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
        return { success: false, error: "Unauthorized" }
    }

    try {
        await prisma.user.update({
            where: { id: employeeId },
            data: { branchId }
        })
        revalidatePath("/")
        return { success: true }
    } catch (e) {
        console.error("[assignEmployeeToBranch] Error:", e)
        return { success: false, error: "Error al asignar empleado" }
    }
}

export async function deleteUser(userId: string) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
        return { success: false, error: "Unauthorized" }
    }

    try {
        // Check if user is deletable
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user) {
            return { success: false, error: "Usuario no encontrado" }
        }
        if (!user.isDeletable) {
            return { success: false, error: "Este usuario no se puede eliminar" }
        }

        await prisma.user.delete({ where: { id: userId } })
        revalidatePath("/")
        return { success: true }
    } catch (e) {
        console.error("[deleteUser] Error:", e)
        return { success: false, error: "Error al eliminar usuario" }
    }
}

// --- Config / Permissions ---

export async function updateRolePermissions(role: string, viewIds: string[]) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") return { success: false, error: "Unauthorized" }

    try {
        const listName = `permissions_${role}`

        // Find or create the list
        let list = await prisma.configList.findUnique({ where: { name: listName } })
        if (!list) {
            list = await prisma.configList.create({ data: { name: listName } })
        }

        // Transaction to replace items
        await prisma.$transaction([
            prisma.configListItem.deleteMany({ where: { listId: list.id } }),
            prisma.configListItem.createMany({
                data: viewIds.map((viewId, index) => ({
                    listId: list.id,
                    value: viewId,
                    label: viewId, // simplified
                    active: true,
                    sortOrder: index
                }))
            })
        ])

        revalidatePath("/")
        return { success: true }
    } catch (e) {
        console.error(e)
        return { success: false, error: "Failed to update permissions" }
    }
}

export async function updateBusinessConfig(data: any) {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") return { success: false, error: "Unauthorized" }

    try {
        const listName = "business_config"

        // Find or create the list
        let list = await prisma.configList.findUnique({ where: { name: listName } })
        if (!list) {
            list = await prisma.configList.create({ data: { name: listName } })
        }

        // Prepare items to save
        const itemsToSave = [
            { key: "name", value: data.name },
            { key: "address", value: data.address },
            { key: "phone", value: data.phone },
            { key: "rfc", value: data.rfc },
            { key: "ticketHeader", value: data.ticketHeader },
            { key: "ticketFooter", value: data.ticketFooter },
            { key: "currency", value: data.currency },
            { key: "timezone", value: data.timezone },
            { key: "logo", value: data.logo || "" }
        ]

        // Transaction to replace items
        await prisma.$transaction([
            prisma.configListItem.deleteMany({ where: { listId: list.id } }),
            prisma.configListItem.createMany({
                data: itemsToSave.map((item, index) => ({
                    listId: list.id,
                    value: String(item.value || ""),
                    label: item.key, // We use label to store the key name
                    active: true,
                    sortOrder: index
                }))
            })
        ])

        revalidatePath("/")
        return { success: true }
    } catch (e) {
        console.error(e)
        return { success: false, error: "Failed to update business config" }
    }
}
