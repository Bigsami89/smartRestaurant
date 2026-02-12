import { PrismaClient } from "@prisma/client"
import "dotenv/config"

const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
})

async function main() {
    console.log("Seeding database...")

    // 1. Clean up (in correct order for foreign keys)
    await prisma.orderItemExtra.deleteMany()
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.cashShift.deleteMany()
    await prisma.productExtra.deleteMany()
    await prisma.productIngredient.deleteMany()
    await prisma.product.deleteMany()
    await prisma.table.deleteMany()
    await prisma.supplyMovement.deleteMany()
    await prisma.supply.deleteMany()
    await prisma.user.deleteMany()
    await prisma.branch.deleteMany()

    // 2. Create main branch (Sucursal Principal)
    const mainBranch = await prisma.branch.create({
        data: {
            id: "branch1",
            name: "Sucursal Principal",
            address: "Av. Principal #123, Centro",
            phone: "555-1234",
            tenantId: "t1",
            isActive: true,
            shareMenu: true
        }
    })
    console.log("Created main branch:", mainBranch.name)

    // 3. Users / Employees (associated with main branch)
    const employees = [
        { id: "superadmin", name: "Super Admin", email: "superadmin@sistema.com", role: "admin", branchId: mainBranch.id },
        { id: "emp1", name: "Carlos Admin", email: "admin@demo.com", role: "admin", branchId: mainBranch.id },
        { id: "emp2", name: "Ana Cajera", email: "cajero@demo.com", role: "cajero", branchId: mainBranch.id },
        { id: "emp3", name: "Luis Mesero", email: "mesero@demo.com", role: "mesero", branchId: mainBranch.id },
        { id: "emp4", name: "Maria Cocina", email: "cocina@demo.com", role: "cocina", branchId: mainBranch.id },
    ]

    for (const emp of employees) {
        await prisma.user.create({
            data: {
                id: emp.id,
                name: emp.name,
                email: emp.email,
                role: emp.role,
                password: emp.id === "superadmin" ? "SuperAdmin123!" : "demo",
                tenantId: "t1",
                tenantName: "La Trattoria",
                branchId: emp.branchId
            }
        })
    }
    console.log("Created", employees.length, "employees")

    // 4. Tables (associated with main branch)
    const tables = [
        { id: "t1", number: 1, seats: 4, zone: "Interior", status: "available", branchId: mainBranch.id },
        { id: "t2", number: 2, seats: 2, zone: "Interior", status: "available", branchId: mainBranch.id },
        { id: "t3", number: 3, seats: 6, zone: "Interior", status: "available", branchId: mainBranch.id },
        { id: "t4", number: 4, seats: 4, zone: "Terraza", status: "available", branchId: mainBranch.id },
        { id: "t5", number: 5, seats: 8, zone: "Terraza", status: "available", branchId: mainBranch.id },
        { id: "t6", number: 6, seats: 2, zone: "Terraza", status: "available", branchId: mainBranch.id },
    ]

    for (const t of tables) {
        await prisma.table.create({ data: t })
    }
    console.log("Created", tables.length, "tables")

    // 5. Products (menu items - associated with main branch)
    const products = [
        {
            id: "p1", name: "Tacos al Pastor", category: "Platos fuertes", price: 95, description: "3 tacos con piña",
            extras: [{ id: "e1", name: "Queso extra", price: 15 }, { id: "e2", name: "Guacamole", price: 25 }],
            ingredients: [{ id: "i1", name: "Cebolla" }, { id: "i2", name: "Cilantro" }, { id: "i3", name: "Piña" }]
        },
        {
            id: "p2", name: "Enchiladas Suizas", category: "Platos fuertes", price: 120, description: "3 enchiladas con salsa verde",
            extras: [{ id: "e3", name: "Crema extra", price: 10 }],
            ingredients: [{ id: "i4", name: "Crema" }, { id: "i5", name: "Queso" }]
        },
        {
            id: "p3", name: "Quesadillas", category: "Entradas", price: 65, description: "2 quesadillas de queso",
            extras: [{ id: "e4", name: "Champiñones", price: 20 }],
            ingredients: [{ id: "i6", name: "Queso Oaxaca" }]
        },
        { id: "p4", name: "Agua de Horchata", category: "Bebidas", price: 35, description: "Vaso grande", extras: [], ingredients: [] },
        { id: "p5", name: "Coca-Cola", category: "Bebidas", price: 30, description: "Lata 355ml", extras: [], ingredients: [] },
        { id: "p6", name: "Cerveza Corona", category: "Bebidas", price: 45, description: "Botella 355ml", extras: [], ingredients: [] },
        {
            id: "p7", name: "Flan Napolitano", category: "Postres", price: 55, description: "Flan casero",
            extras: [{ id: "e5", name: "Caramelo extra", price: 10 }], ingredients: []
        },
        {
            id: "p8", name: "Churros", category: "Postres", price: 40, description: "4 churros con chocolate",
            extras: [{ id: "e6", name: "Cajeta", price: 15 }], ingredients: []
        }
    ]

    for (const p of products) {
        await prisma.product.create({
            data: {
                id: p.id,
                name: p.name,
                category: p.category,
                price: p.price,
                description: p.description,
                branchId: mainBranch.id,
                extras: { create: p.extras.map(e => ({ id: e.id, name: e.name, price: e.price })) },
                ingredients: { create: p.ingredients.map(i => ({ id: i.id, name: i.name })) }
            }
        })
    }
    console.log("Created", products.length, "products")

    // 6. Supplies
    const supplies = [
        { id: "s1", name: "Carne de res", category: "Carnes", unit: "kg", stock: 25, minStock: 10, costPerUnit: 180 },
        { id: "s2", name: "Carne de cerdo", category: "Carnes", unit: "kg", stock: 20, minStock: 8, costPerUnit: 150 },
        { id: "s3", name: "Lechuga romana", category: "Verduras", unit: "pzas", stock: 30, minStock: 10, costPerUnit: 25 },
        { id: "s4", name: "Tomate", category: "Verduras", unit: "kg", stock: 15, minStock: 5, costPerUnit: 35 },
        { id: "s5", name: "Queso Oaxaca", category: "Lacteos", unit: "kg", stock: 10, minStock: 3, costPerUnit: 180 },
    ]

    for (const s of supplies) {
        await prisma.supply.create({ data: s })
    }
    console.log("Created", supplies.length, "supplies")

    console.log("\n✅ Seeding database... DONE")
    console.log("\nAccounts created:")
    console.log("  - superadmin@sistema.com / SuperAdmin123!")
    console.log("  - admin@demo.com / demo")
    console.log("  - cajero@demo.com / demo")
    console.log("  - mesero@demo.com / demo")
    console.log("  - cocina@demo.com / demo")
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
