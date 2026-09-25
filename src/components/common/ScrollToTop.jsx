import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Floating "scroll to top" button.
 * Appears after the user scrolls past `threshold` pixels in the scroll container.
 *
 * Props:
 *   scrollContainer — React ref object whose `.current` is the scrollable element.
 *   threshold       — px scrollTop before button appears (default: 400)
 */
export default function ScrollToTop({ scrollContainer, threshold = 400 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = scrollContainer?.current;
    if (!el) return;

    const onScroll = () => setVisible(el.scrollTop > threshold);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollContainer, threshold]);

  const scrollUp = () => {
    const el = scrollContainer?.current;
    if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollUp}
      title="Back to top"
      style={{
        position:     'fixed',
        bottom:       28,
        right:        28,
        width:        44,
        height:       44,
        borderRadius: '50%',
        background:   '#000048',
        border:       'none',
        cursor:       'pointer',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        boxShadow:    '0 4px 12px rgba(0,0,72,0.35)',
        zIndex:       1050,
        transition:   'opacity 0.2s, transform 0.2s',
        opacity:      1,
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1';    e.currentTarget.style.transform = 'translateY(0)';    }}
    >
      <ArrowUp size={18} color="white" strokeWidth={2.5} />
    </button>
  );
}
