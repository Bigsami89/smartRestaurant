import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("Creating default branch...")

    // Create default branch
    const defaultBranch = await prisma.branch.upsert({
        where: { id: "default-branch" },
        update: {},
        create: {
            id: "default-branch",
            name: "Sucursal Principal",
            address: "",
            tenantId: "default",
            isActive: true,
            shareMenu: true,
        },
    })

    console.log("Default branch created:", defaultBranch.name)

    // Assign all existing users to default branch
    const usersUpdated = await prisma.user.updateMany({
        where: { branchId: null },
        data: { branchId: defaultBranch.id },
    })
    console.log(`Updated ${usersUpdated.count} users to default branch`)

    // Assign all existing tables to default branch
    const tablesUpdated = await prisma.table.updateMany({
        where: { branchId: null },
        data: { branchId: defaultBranch.id },
    })
    console.log(`Updated ${tablesUpdated.count} tables to default branch`)

    // Assign all existing orders to default branch
    const ordersUpdated = await prisma.order.updateMany({
        where: { branchId: null },
        data: { branchId: defaultBranch.id },
    })
    console.log(`Updated ${ordersUpdated.count} orders to default branch`)

    // Assign all existing cash shifts to default branch
    const shiftsUpdated = await prisma.cashShift.updateMany({
        where: { branchId: null },
        data: { branchId: defaultBranch.id },
    })
    console.log(`Updated ${shiftsUpdated.count} cash shifts to default branch`)

    // Products and supplies stay null (global) unless shareMenu is false
    console.log("Products and supplies kept as global (branchId=null)")

    console.log("Done!")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
