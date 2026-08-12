import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-16 text-center bg-void2 hairline border-dashed rounded-2xl">
      <Icon className="w-9 h-9 mx-auto text-muted mb-3" />
      <p className="font-semibold">{title}</p>
      <p className="text-muted text-[13.5px] mt-1 max-w-sm mx-auto">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
