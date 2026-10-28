import { AppShell } from "@/components/layouts/app-shell";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell current="settings">{children}</AppShell>;
}
