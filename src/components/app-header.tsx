import { auth, signOut } from "@/auth";
import { cn } from "@/lib/cn";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getLocale, getMessages } from "@/i18n";
import { LayoutDashboard, LogOut, Settings } from "lucide-react";
import Link from "next/link";

export async function AppHeader({ current }: { current?: "dash" | "settings" }) {
  const session = await auth();
  const t = await getMessages();
  const locale = await getLocale();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur-md backdrop-saturate-150",
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href={session ? "/dashboard" : "/"}
          className="font-semibold tracking-tight text-text"
        >
          {t.common.appName}
        </Link>
        <div className="flex items-center gap-2">
          {session?.user ? (
            <nav className="flex items-center gap-1">
              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  current === "dash"
                    ? "bg-primary-muted text-primary"
                    : "text-muted hover:bg-black/[0.04] hover:text-text",
                )}
                aria-current={current === "dash" ? "page" : undefined}
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t.nav.dashboard}</span>
              </Link>
              <Link
                href="/settings"
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  current === "settings"
                    ? "bg-primary-muted text-primary"
                    : "text-muted hover:bg-black/[0.04] hover:text-text",
                )}
                aria-current={current === "settings" ? "page" : undefined}
              >
                <Settings className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t.nav.settings}</span>
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-black/[0.04] hover:text-text"
                  title={t.common.signOut}
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">{t.common.signOut}</span>
                </button>
              </form>
            </nav>
          ) : null}
          <LanguageSwitcher current={locale} />
        </div>
      </div>
    </header>
  );
}
