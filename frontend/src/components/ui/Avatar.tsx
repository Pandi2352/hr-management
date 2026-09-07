import React, { useState } from 'react';
import defaultAvatarImg from '../../assets/default_avatar.jpg';
import { cn } from '../../utils/cn';

export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  shape?: 'circle' | 'rounded';
  forceDefaultMock?: boolean;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-16 w-16 text-lg',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = '',
  size = 'md',
  className,
  shape = 'circle',
  // Default to true for now so ALL employees display the unified corporate mock avatar
  forceDefaultMock = true,
}) => {
  const [hasError, setHasError] = useState(false);

  // If forceDefaultMock is true (or src is empty/errored), use the default mock image
  const imageSrc = forceDefaultMock || hasError || !src ? defaultAvatarImg : src;

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900',
        shape === 'circle' ? 'rounded-full' : 'rounded-md',
        sizeClasses[size],
        className
      )}
    >
      <img
        src={imageSrc}
        alt={name ? `${name}'s avatar` : 'Employee avatar'}
        onError={() => setHasError(true)}
        className="h-full w-full object-cover object-center"
      />
    </div>
  );
};
