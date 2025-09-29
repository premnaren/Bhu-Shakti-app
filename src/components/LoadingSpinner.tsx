import { Icons } from "@/components/icons";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
    className?: string;
    text?: string;
}

export default function LoadingSpinner({ className, text }: LoadingSpinnerProps) {
  const { t } = useLanguage();
  const loadingText = text || t('initializingBhuShakti');

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
      <div className="flex flex-col items-center gap-4">
        <Icons.spinner className={cn("h-16 w-16 animate-spin text-primary", className)} />
        <p className="text-muted-foreground">{loadingText}</p>
      </div>
    </div>
  );
}
