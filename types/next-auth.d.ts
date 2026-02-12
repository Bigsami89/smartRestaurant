import NextAuth, { DefaultSession } from "next-auth"
import { UserRole } from "@/lib/types"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: UserRole
            tenantId: string
            branchId?: string | null
            branchName?: string | null
        } & DefaultSession["user"]
    }

    interface User {
        role: UserRole
        tenantId: string
        branchId?: string | null
        branchName?: string | null
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: UserRole
        tenantId: string
        branchId?: string | null
        branchName?: string | null
    }
}
