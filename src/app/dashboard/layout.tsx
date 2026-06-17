import { AppShell } from "@/components/layouts/app-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell current="dash">{children}</AppShell>;
}
