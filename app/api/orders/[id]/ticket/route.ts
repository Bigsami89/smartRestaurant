import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Assuming prisma client is here or similar path
import { EscPos } from "@/lib/escpos";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: orderId } = await params;

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        product: true
                    }
                },
                branch: true,
            },
        });

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const builder = new EscPos();

        // Header
        builder.init()
            .align('CENTER')
            .size(2, 2).text(order.branch?.name || "RESTAURANTE").feed()
            .size(1, 1).text(order.branch?.address || "").feed()
            .text(order.branch?.phone || "").feed()
            .feed();

        // Order Info
        builder.align('LEFT')
            .text(`Folio: ${order.id.slice(-6).toUpperCase()}`).feed()
            .text(`Fecha: ${new Date(order.createdAt).toLocaleString()}`).feed()
            .text(order.tableNumber ? `Mesa: ${order.tableNumber}` : "Venta Directa").feed()
            .text("-".repeat(32)).feed();

        // Items
        order.items.forEach(item => {
            const qty = item.quantity.toString().padEnd(3);
            const name = item.productName.substring(0, 20).padEnd(20);
            const price = `$${item.totalPrice.toFixed(2)}`.padStart(9);
            builder.text(`${qty}${name}${price}`).feed();
        });

        // Totals
        builder.text("-".repeat(32)).feed()
            .align('RIGHT')
            .size(2, 2).text(`TOTAL: $${order.total.toFixed(2)}`).feed()
            .init() // Reset size
            .align('CENTER')
            .feed()
            .text("¡Gracias por su visita!").feed()
            .feed(3)
            .cut();

        return NextResponse.json({
            ticket_id: order.id,
            raw_data_base64: builder.getBase64(),
        });

    } catch (error) {
        console.error("Error generating ticket:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
