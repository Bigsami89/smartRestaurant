import { auth } from "@/auth"
import { StoreProvider } from "@/lib/spa-store"
import { ViewRouter } from "@/components/view-router"
import { redirect } from "next/navigation"
import { getInitialData } from "@/lib/data"

export default async function Page() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const initialData = await getInitialData()

  return (
    <StoreProvider initialUser={session.user} initialData={initialData}>
      <ViewRouter />
    </StoreProvider>
  )
}
