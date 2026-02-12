import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"
import "dotenv/config"

const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
})

async function main() {
    console.log("Limpiando base de datos...")

    // Delete in order of dependencies
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
    await prisma.configListItem.deleteMany()
    await prisma.configList.deleteMany()

    // Delete users except superuser
    await prisma.user.deleteMany({
        where: { isSuperuser: false }
    })

    // Create superuser if not exists
    const superuser = await prisma.user.findFirst({ where: { isSuperuser: true } })
    if (!superuser) {
        const hashedPassword = await hash("SuperAdmin123!", 12)
        await prisma.user.create({
            data: {
                id: "superadmin",
                name: "Super Admin",
                email: "superadmin@sistema.com",
                role: "admin",
                password: hashedPassword,
                isSuperuser: true,
                isDeletable: false,
                tenantId: "default",
                tenantName: "Sistema"
            }
        })
        console.log("Superusuario creado: superadmin@sistema.com / SuperAdmin123!")
    } else {
        console.log("Superusuario existente conservado")
    }

    // Create default config lists
    const orderSourcesList = await prisma.configList.create({
        data: {
            name: "order_sources",
            items: {
                create: [
                    { value: "direct", label: "Directo", active: true, sortOrder: 0 },
                    { value: "uber_eats", label: "Uber Eats", active: true, sortOrder: 1 },
                    { value: "rappi", label: "Rappi", active: true, sortOrder: 2 },
                    { value: "didi", label: "Didi Food", active: true, sortOrder: 3 },
                ]
            }
        }
    })
    console.log("Lista de fuentes de orden creada")

    console.log("Base de datos limpia. Solo queda el superusuario.")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
