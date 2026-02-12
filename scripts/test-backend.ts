
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
    console.log("🚀 Starting Backend Tests...")

    try {
        // 1. Clean up relevant tables
        console.log("\nCleaning up previous test data...")
        await prisma.orderItemExtra.deleteMany()
        await prisma.orderItem.deleteMany()
        await prisma.order.deleteMany()
        await prisma.table.deleteMany()
        await prisma.product.deleteMany()
        await prisma.user.deleteMany({ where: { email: "testadmin@example.com" } })
        await prisma.supplyMovement.deleteMany()
        await prisma.supply.deleteMany()

        // 2. Create Admin User
        console.log("\n1. Testing User Creation (Admin)...")
        const hashedPassword = await bcrypt.hash("password123", 10)
        const user = await prisma.user.create({
            data: {
                name: "Test Admin",
                email: "testadmin@example.com",
                role: "admin",
                password: hashedPassword,
            }
        })
        console.log("✅ User created:", user.email, "Role:", user.role)

        // 3. Create Product
        console.log("\n2. Testing Product Creation...")
        const product = await prisma.product.create({
            data: {
                name: "Test Burger",
                category: "Food",
                price: 15.0,
                stock: 100,
                available: true
            }
        })
        console.log("✅ Product created:", product.name, "Price:", product.price)

        // 4. Create Table
        console.log("\n3. Testing Table Creation...")
        const table = await prisma.table.create({
            data: {
                number: 99,
                seats: 4,
                zone: "Patio",
                status: "available"
            }
        })
        console.log("✅ Table created:", table.number, "Status:", table.status)

        // 5. Create Order
        console.log("\n4. Testing Order Creation...")
        const order = await prisma.order.create({
            data: {
                tableId: table.id,
                tableNumber: table.number,
                status: "open",
                items: {
                    create: {
                        productId: product.id,
                        productName: product.name,
                        quantity: 2,
                        unitPrice: product.price,
                        totalPrice: product.price * 2,
                        status: "pending"
                    }
                }
            },
            include: { items: true }
        })
        console.log("✅ Order created:", order.id, "Items:", order.items.length)

        // 6. Update Order Logic (Simulate logic from actions)
        console.log("\n5. Testing Supply Creation...")
        const supply = await prisma.supply.create({
            data: {
                name: "Beef Patty",
                category: "Meat",
                unit: "kg",
                stock: 10.0,
                minStock: 2.0,
                costPerUnit: 5.0
            }
        })
        console.log("✅ Supply created:", supply.name, "Stock:", supply.stock)

        // 7. Supply Movement
        console.log("\n6. Testing Supply Movement...")
        const movement = await prisma.supplyMovement.create({
            data: {
                supplyId: supply.id,
                type: "entry",
                quantity: 5.0,
                reason: "Restock",
                userId: user.id
            }
        })

        const updatedSupply = await prisma.supply.update({
            where: { id: supply.id },
            data: { stock: { increment: 5.0 } }
        })
        console.log("✅ Movement added. New Stock:", updatedSupply.stock)

        console.log("\n🎉 All Backend Tests Passed Successfully!")

    } catch (error) {
        console.error("\n❌ Test Failed:", error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
