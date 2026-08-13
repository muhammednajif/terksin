import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  backTo?: string;
  onBack?: () => void;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, backTo, onBack, actions, className = '', children }: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) { onBack(); return; }
    if (backTo) { navigate(backTo); return; }
    navigate(-1);
  };

  return (
    <div className={`flex items-center justify-between gap-3 mb-6 ${className}`}>
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={handleBack}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-black/5 transition-colors flex-shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        {title || children ? (
          <div className="min-w-0">
            {children || (
              <>
                <h1 className="text-xl md:text-2xl font-bold font-heading truncate">{title}</h1>
                {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
              </>
            )}
          </div>
        ) : null}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
