import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  to?: string;
  onClick?: () => void;
  className?: string;
}

export const BackButton = ({ to, onClick, className = '' }: BackButtonProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) { onClick(); return; }
    if (to) { navigate(to); return; }
    navigate(-1);
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center w-9 h-9 rounded-full hover:bg-black/5 transition-colors ${className}`}
      aria-label="Go back"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
};
