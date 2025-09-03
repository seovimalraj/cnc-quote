'use client';

import { useEffect, useState } from 'react';

interface SafeDateProps {
  dateString: string;
  className?: string;
}

const SafeDate = ({ dateString, className = '' }: SafeDateProps) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    
    if (!isClient) {
      // Return simple format during SSR to avoid hydration issues
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    
    // Return full format on client
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <span className={className} suppressHydrationWarning>
      {formatDate(dateString)}
    </span>
  );
};

export default SafeDate;
