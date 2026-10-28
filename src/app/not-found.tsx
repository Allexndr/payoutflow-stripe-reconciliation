import { Button } from "@/components/ui/button";
import { getMessages } from "@/i18n";

export default async function NotFound() {
  const t = await getMessages();
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4">
      <p className="text-sm font-medium text-muted">{t.notFound.code}</p>
      <h1 className="mt-2 text-xl font-semibold text-text">
        {t.notFound.title}
      </h1>
      <Button href="/" variant="secondary" className="mt-8">
        {t.common.home}
      </Button>
    </div>
  );
}
