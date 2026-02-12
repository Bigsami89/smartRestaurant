"use client"

import React, { useState } from "react"
import { signIn } from "next-auth/react"
import { roleLabels, employees } from "@/lib/mock-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UtensilsCrossed, ShieldCheck, CreditCard, ConciergeBell, ChefHat } from "lucide-react"
import type { UserRole } from "@/lib/types"

const roleIcons: Record<UserRole, React.ReactNode> = {
  admin: <ShieldCheck className="h-4 w-4" />,
  cajero: <CreditCard className="h-4 w-4" />,
  mesero: <ConciergeBell className="h-4 w-4" />,
  cocina: <ChefHat className="h-4 w-4" />,
}

export function LoginView() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setLoading(true)

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      })

      if (result?.error) {
        setError("Credenciales incorrectas")
        setLoading(false)
      } else {
        // Success - NextAuth will update session. 
        // We can redirect or let the session update trigger a re-render/redirect in wrapper.
        // But since we used redirect: false, we must redirect manually or reload.
        window.location.href = "/"
      }
    } catch (err) {
      setError("Ocurrió un error inesperado")
      setLoading(false)
    }
  }

  function fill(em: string) {
    // Find in mock data just for auto-fill convenience
    const emp = employees.find(u => u.email === em)
    if (emp) {
      setEmail(em); setPassword("demo"); // Default demo password for all
      setError("")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
            <UtensilsCrossed className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">RestaurantOS</CardTitle>
          <p className="text-sm text-muted-foreground">Ingresa tus credenciales</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Contraseña</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">{loading ? "Ingresando..." : "Ingresar"}</Button>
          </form>
          <div className="mt-4 border-t pt-4">
            <p className="mb-2 text-center text-xs text-muted-foreground">Acceso rápido (Demo)</p>
            <div className="grid grid-cols-2 gap-2">
              {employees.slice(0, 4).map(emp => (
                <Button key={emp.id} variant="outline" size="sm" className="justify-start gap-2 bg-transparent" onClick={() => fill(emp.email)}>
                  {roleIcons[emp.role]}<span>{roleLabels[emp.role]}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
