import { getShellUser } from "@/lib/get-shell-user";
import AppShell from "@/components/layouts/AppShell";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getShellUser();
  if (!user) redirect("/login");
  return <AppShell user={user}>{children}</AppShell>;
}
