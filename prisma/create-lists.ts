import { PrismaClient } from "@prisma/client"
import "dotenv/config"

const prisma = new PrismaClient()

async function main() {
    const defaults = [
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
        const exists = await prisma.configList.findFirst({ where: { name: def.name } })
        if (!exists) {
            await prisma.configList.create({
                data: { name: def.name, items: { create: def.items } }
            })
            console.log("Created:", def.name)
        } else {
            console.log("Already exists:", def.name)
        }
    }
}

main()
    .then(() => prisma.$disconnect())
    .catch(e => { console.error(e); process.exit(1) })
