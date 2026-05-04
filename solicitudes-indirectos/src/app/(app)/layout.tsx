import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import type { ReactNode } from "react";

// ─── Auth-protected route group layout ───────────────────────────────────────

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return <AppLayout>{children}</AppLayout>;
}
