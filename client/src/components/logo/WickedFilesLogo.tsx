import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const WickedFilesLogo: React.FC<LogoProps> = ({ size = 40, className = '' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Base Folder Shape */}
      <path 
        d="M10 20C10 15.5817 13.5817 12 18 12H40C42.2091 12 44 13.7909 44 16V24C44 26.2091 45.7909 28 48 28H82C86.4183 28 90 31.5817 90 36V80C90 84.4183 86.4183 88 82 88H18C13.5817 88 10 84.4183 10 80V20Z" 
        fill="url(#gradient)"
        stroke="url(#stroke-gradient)"
        strokeWidth="2"
      />
      
      {/* Lightning Bolt */}
      <path 
        d="M55 32L35 58H52L45 76L65 52H50L55 32Z" 
        fill="white"
        stroke="rgba(0,0,0,0.1)"
        strokeWidth="1"
      />

      {/* Gradients */}
      <defs>
        <linearGradient id="gradient" x1="10" y1="12" x2="90" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="stroke-gradient" x1="10" y1="12" x2="90" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
    </svg>
  );
};

// A smaller, simplified logo version for the favicon
export const WickedFilesIcon: React.FC<LogoProps> = ({ size = 32, className = '' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="32" height="32" rx="6" fill="url(#icon-gradient)" />
      <path 
        d="M16 6L10 16H15L13 26L19 16H15L16 6Z" 
        fill="white"
      />
      <defs>
        <linearGradient id="icon-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
    </svg>
  );
};