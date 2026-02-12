import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    pages: {
        signIn: "/login",
    },
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(1) })
                    .safeParse(credentials)

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data
                    const user = await prisma.user.findUnique({
                        where: { email },
                        include: { branch: true }
                    })
                    if (!user || !user.password) return null

                    // Try bcrypt comparison
                    let passwordsMatch = false
                    try {
                        passwordsMatch = await bcrypt.compare(password, user.password)
                    } catch (e) {
                        // likely failing on plain text
                    }

                    const authUser = {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        image: user.image,
                        role: user.role as "admin" | "cajero" | "mesero" | "cocina",
                        tenantId: user.tenantId,
                        tenantName: user.tenantName,
                        branchId: user.branchId || null,
                        branchName: user.branch?.name || null
                    }

                    if (passwordsMatch) return authUser

                    // Fallback for seeded plain text passwords (DEV ONLY)
                    if (password === user.password) {
                        console.log("Logging in with plain text password (DEV)")
                        return authUser
                    }
                }
                return null
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                // @ts-ignore
                token.role = user.role
                // @ts-ignore
                token.id = user.id
                // @ts-ignore
                token.tenantId = user.tenantId
                // @ts-ignore
                token.tenantName = user.tenantName
                // @ts-ignore
                token.branchId = user.branchId
                // @ts-ignore
                token.branchName = user.branchName
            }
            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                // @ts-ignore
                session.user.role = token.role
                // @ts-ignore
                session.user.id = token.id
                // @ts-ignore
                session.user.tenantId = token.tenantId
                // @ts-ignore
                session.user.tenantName = token.tenantName

                // @ts-ignore
                session.user.branchId = token.branchId
                // @ts-ignore
                session.user.branchName = token.branchName
            }
            return session
        }
    }
})
