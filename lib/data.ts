import { prisma } from "@/lib/prisma"
import { defaultConfig } from "@/lib/mock-data"
import type { RestaurantState, Table, Product, Order, Employee, Supply, SupplyMovement, CashShift, ConfigList, Branch } from "@/lib/types"

export async function getInitialData(): Promise<RestaurantState> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [tables, products, orders, employees, supplies, supplyMovements, shift, cashShifts, configLists, branches, reservations, rawDinerNames] = await Promise.all([
        prisma.table.findMany({ orderBy: { number: 'asc' } }),
        prisma.product.findMany({ include: { extras: true, ingredients: true }, orderBy: { name: 'asc' } }),
        prisma.order.findMany({
            where: {
                OR: [
                    { status: 'open' },
                    { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } // Today's orders
                ]
            },
            include: { items: { include: { extras: true, product: true } } },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.user.findMany({ include: { branch: true } }), // Employees are Users with branch
        prisma.supply.findMany(),
        prisma.supplyMovement.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
        prisma.cashShift.findFirst({ where: { status: "open" } }),
        prisma.cashShift.findMany({
            where: {
                OR: [
                    { status: "open" },
                    { openedAt: { gte: thirtyDaysAgo } }
                ]
            },
            include: { user: true },
            orderBy: { openedAt: 'desc' }
        }),
        prisma.configList.findMany({ include: { items: { orderBy: { sortOrder: 'asc' } } } }),
        prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
        prisma.reservation.findMany({ orderBy: { date: 'asc' } }),
        prisma.$queryRaw`SELECT id, "dinerNames" FROM "orders"` as Promise<{ id: string, dinerNames: string[] }[]>
    ])

    const serializeDate = (d: Date | null) => d ? d.toISOString() : null

    const serializedTables = tables.map((t: any) => ({
        ...t,
        branchId: t.branchId || null
    })) as unknown as Table[]

    const serializedProducts = products.map((p: any) => ({
        ...p,
        createdAt: serializeDate(p.createdAt),
        updatedAt: serializeDate(p.updatedAt),
        unit: p.unit, // Prisma enum vs string
        branchId: p.branchId || null,
        image: p.image || null,
        requiresKitchen: p.requiresKitchen
    })) as unknown as Product[]

    const serializedOrders = orders.map((o: any) => {
        const raw = rawDinerNames.find((r) => r.id === o.id)
        const realDinerNames = raw?.dinerNames || o.dinerNames || []

        const createdByEmployee = employees.find((e: any) => e.id === o.createdById)
        const closedByEmployee = employees.find((e: any) => e.id === o.closedById)
        return {
            ...o,
            dinerNames: realDinerNames, // Force correct names
            createdAt: serializeDate(o.createdAt),
            closedAt: serializeDate(o.closedAt),
            createdByName: createdByEmployee?.name || null,
            closedByName: closedByEmployee?.name || null,
            items: o.items.map((i: any) => ({
                ...i,
                removedIngredients: i.removedIngredients as unknown as string[],
                product: i.product ? {
                    ...i.product,
                    createdAt: serializeDate(i.product.createdAt),
                    updatedAt: serializeDate(i.product.updatedAt),
                    unit: i.product.unit,
                    branchId: i.product.branchId || null,
                    extras: i.product.extras || [],
                    ingredients: i.product.ingredients || []
                } : undefined,
            })),
            branchId: o.branchId || null
        }
    }) as unknown as Order[]


    const serializedEmployees = employees.map((e: any) => ({
        ...e,
        password: "", // Don't expose password hash
        createdAt: serializeDate(e.createdAt),
        active: e.active,
        role: e.role as "admin" | "cajero" | "mesero" | "cocina",
        branchId: e.branchId,
        branchName: e.branch?.name || null
    })) as unknown as Employee[]

    const serializedSupplies = supplies.map((s: any) => ({
        ...s,
        branchId: s.branchId || null
    })) as unknown as Supply[]

    const serializedMovements = supplyMovements.map((m: any) => {
        const s = supplies.find((sup: any) => sup.id === m.supplyId)
        return {
            ...m,
            createdAt: serializeDate(m.createdAt),
            supplyName: s?.name || "Desconocido",
            branchId: s?.branchId || null
        }
    }) as unknown as SupplyMovement[]

    const dbConfigList = configLists.find(l => l.name === "business_config")
    const mergedConfig = { ...defaultConfig }

    if (dbConfigList) {
        dbConfigList.items.forEach(item => {
            if (item.label in mergedConfig || item.label === "logo") {
                (mergedConfig as any)[item.label] = item.value
            }
        })
    }

    return {
        tables: serializedTables,
        products: serializedProducts,
        orders: serializedOrders,
        employees: serializedEmployees,
        supplies: serializedSupplies,
        supplyMovements: serializedMovements,
        config: mergedConfig,
        shift: shift ? {
            ...shift,
            openedAt: shift.openedAt.toISOString(),
            closedAt: shift.closedAt?.toISOString() || null,
            status: shift.status as "open" | "closed"
        } : null,
        cashShifts: cashShifts.map((s: any) => ({
            ...s,
            openedAt: s.openedAt.toISOString(),
            closedAt: s.closedAt?.toISOString() || null,
            status: s.status as "open" | "closed",
            userName: s.user?.name || "Desconocido",
            branchId: s.branchId || null
        })) as CashShift[],
        configLists: configLists as unknown as ConfigList[],
        branches: branches.map((b: any) => ({
            id: b.id,
            name: b.name,
            address: b.address,
            phone: b.phone,
            tenantId: b.tenantId,
            isActive: b.isActive,
            shareMenu: b.shareMenu
        })) as Branch[],
        currentBranchId: branches.length > 0 ? branches[0].id : null,
        reservations: reservations.map((r: any) => ({
            ...r,
            date: r.date.toISOString(),
            createdAt: r.createdAt.toISOString(),
            branchId: r.branchId || "default"
        })),
        draftOrders: {}
    }
}
