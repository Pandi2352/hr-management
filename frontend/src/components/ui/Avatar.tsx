import React, { useState } from 'react';
import defaultAvatarImg from '../../assets/default_avatar.jpg';
import { cn } from '../../utils/cn';

export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  shape?: 'square' | 'rounded' | 'circle';
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
  shape = 'rounded',
  forceDefaultMock = false,
}) => {
  const [hasError, setHasError] = useState(false);

  // If forceDefaultMock is false and src is provided and not errored, use uploaded src
  const imageSrc = !forceDefaultMock && !hasError && src ? src : defaultAvatarImg;

  const initials = name
    ? name
        .trim()
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  const shapeClass = shape === 'square' ? 'rounded-none' : 'rounded-md';

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900',
        shapeClass,
        sizeClasses[size],
        className
      )}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={name ? `${name}'s avatar` : 'Profile avatar'}
          onError={() => setHasError(true)}
          className={cn('h-full w-full object-cover object-center', shapeClass)}
        />
      ) : (
        <span className="font-semibold text-slate-700 dark:text-slate-300 select-none">
          {initials}
        </span>
      )}
    </div>
  );
};
