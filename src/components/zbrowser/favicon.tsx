'use client';

import { useState } from 'react';
import { Globe } from 'lucide-react';
import { faviconFor } from '@/lib/zbrowser-utils';

interface FaviconProps {
  url: string | null | undefined;
  className?: string;
}

/** Renders a site favicon fetched through the proxy, with a Globe fallback. */
export function Favicon({ url, className }: FaviconProps) {
  const src = faviconFor(url);
  const [failed, setFailed] = useState(false);
  const [lastSrc, setLastSrc] = useState<string | null>(src);

  // React-approved state adjustment during render (resets when src changes).
  if (src !== lastSrc) {
    setLastSrc(src);
    setFailed(false);
  }

  if (!src || failed) {
    return <Globe className={className} aria-hidden="true" />;
  }
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={className}
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
    />
  );
}
