import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';

interface BackButtonProps {
  /**
   * Where to go when there is no history to go back to.
   *
   * Reached by opening a link directly, or after a redirect that replaced the
   * entry. Without it, `navigate(-1)` on a fresh tab either does nothing or
   * throws the person out of the application entirely.
   */
  fallbackTo: string;
  label?: string;
  className?: string;
}

/**
 * Back to wherever they actually came from.
 *
 * Every page that can be reached from more than one place needs this, and a
 * hard-coded link is wrong on at least one of those routes — somebody who
 * opened a quiz preview from the assignment desk should land back on the
 * assignment desk, not on the tab the link happened to name.
 *
 * Uses real history when there is any, and the fallback route when there is
 * not, so the control is never a dead button.
 */
export function BackButton({ fallbackTo, label = 'Back', className }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  /*
   * React Router stamps an index onto each history entry. Zero, or absent,
   * means this is the first page of the session and there is nothing behind it.
   */
  const hasHistory = (location.key && location.key !== 'default') || window.history.length > 2;

  return (
    <button
      type="button"
      onClick={() => (hasHistory ? navigate(-1) : navigate(fallbackTo))}
      title={label}
      aria-label={label}
      className={cn(
        'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-hairline text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink',
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}

export default BackButton;
