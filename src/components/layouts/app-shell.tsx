import { AppHeader } from "@/components/app-header";
import type { ReactNode } from "react";

export function AppShell({
  current,
  children,
}: {
  current: "dash" | "settings";
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-canvas">
      <AppHeader current={current} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:py-10">
        {children}
      </main>
    </div>
  );
}
