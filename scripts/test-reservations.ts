
import { createReservation, cancelReservation } from "@/lib/actions"
import { prisma } from "@/lib/prisma"

// Mock auth
jest.mock("@/auth", () => ({
    auth: () => Promise.resolve({ user: { role: "admin", branchId: "default" } })
}))

async function testReservations() {
    console.log("Testing Reservations...")

    // 1. Create
    console.log("Creating reservation...")
    const res = await createReservation({
        date: new Date().toISOString(),
        customerName: "Test User",
        customerPhone: "555-0000",
        partySize: 4,
        notes: "Test reservation",
        branchId: "default", // Assuming default branch exists from seed
        tableId: null
    })

    if (!res.success) {
        console.error("Failed to create reservation:", res.error)
        return
    }
    console.log("Reservation created!")

    // 2. Verify in DB
    const reservations = await prisma.reservation.findMany({ where: { customerName: "Test User" } })
    if (reservations.length === 0) {
        console.error("Reservation not found in DB")
        return
    }
    console.log("Reservation found:", reservations[0].id)

    // 3. Cancel
    console.log("Cancelling reservation...")
    const cancelRes = await cancelReservation(reservations[0].id)
    if (!cancelRes.success) {
        console.error("Failed to cancel reservation")
        return
    }

    const cancelled = await prisma.reservation.findUnique({ where: { id: reservations[0].id } })
    if (cancelled?.status !== "cancelled") {
        console.error("Reservation status not updated")
        return
    }
    console.log("Reservation cancelled successfully!")
}

testReservations()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
