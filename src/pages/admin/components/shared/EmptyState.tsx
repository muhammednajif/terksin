import { AlertTriangle } from 'lucide-react';

export function EmptyState({ message = 'No data available yet' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertTriangle className="w-6 h-6 text-gray-300 mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
