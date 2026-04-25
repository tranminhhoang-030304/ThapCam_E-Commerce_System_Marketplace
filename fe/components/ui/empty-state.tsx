import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionClick?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref, actionClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px] bg-slate-50/50 rounded-2xl border border-dashed m-4">
      <div className="w-20 h-20 bg-slate-100 flex items-center justify-center rounded-full mb-6">
        <Icon className="w-10 h-10 text-slate-400" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-muted-foreground mb-8 max-w-sm">
        {description}
      </p>
      {actionLabel && (
        actionClick ? (
          <Button size="lg" className="rounded-full px-8" onClick={actionClick}>
            {actionLabel}
          </Button>
        ) : actionHref ? (
          <Link href={actionHref}>
            <Button size="lg" className="rounded-full px-8">
              {actionLabel}
            </Button>
          </Link>
        ) : null
      )}
    </div>
  );
}