'use client';

import React from 'react';
import { User } from '@/types';
import { getAvatarUrl } from '@/lib/avatar-options';

interface AvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export function Avatar({ user, size = 'md', showName = false }: AvatarProps) {
  const getInitials = () => {
    const first = user.firstName?.[0]?.toUpperCase() || '';
    const last = user.lastName?.[0]?.toUpperCase() || '';
    return first + last || 'U';
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const nameSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const getBackgroundColor = () => {
    const name = `${user.firstName}${user.lastName}`;
    const colors = [
      'bg-primary-600',
      'bg-blue-600',
      'bg-green-600',
      'bg-purple-600',
      'bg-pink-600',
      'bg-indigo-600',
      'bg-teal-600',
      'bg-orange-600',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  // Preset avatars from /avatar/, legacy from /assets/avatar/, or fallback
  const avatarUrl = getAvatarUrl(user.avatar);
  const [imageError, setImageError] = React.useState(false);

  return (
    <div className="flex items-center space-x-3">
      <div className="relative">
        <div
          className={`${sizeClasses[size]} rounded-full overflow-hidden shadow-md ring-2 ring-white ${
            imageError ? getBackgroundColor() : ''
          } flex items-center justify-center ${imageError ? 'text-white font-semibold' : ''}`}
        >
          {!imageError ? (
            <img
              src={avatarUrl}
              alt={`${user.firstName} ${user.lastName}`}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <span>{getInitials()}</span>
          )}
        </div>
      </div>
      {showName && (
        <div className="flex flex-col">
          <span className={`font-semibold text-text ${nameSizeClasses[size]}`}>
            {user.firstName} {user.lastName}
          </span>
          <span className="text-xs text-secondary-500 capitalize">
            {user.role.replace('_', ' ').toLowerCase()}
          </span>
        </div>
      )}
    </div>
  );
}
