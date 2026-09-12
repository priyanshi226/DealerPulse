import { useEffect, useRef, useState } from 'react';
import './SectionNav.css';

export interface SectionNavItem {
  id: string;
  label: string;
}

interface SectionNavProps {
  items: SectionNavItem[];
}

/** A sticky "jump to section" bar so a long page (Analytics has a dozen
 * charts, Actionable has several distinct blocks) can be reached in one
 * click instead of a long scroll. Highlights whichever section is currently
 * in view via IntersectionObserver. */
export function SectionNav({ items }: SectionNavProps) {
  const [active, setActive] = useState(items[0]?.id ?? '');
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-88px 0px -65% 0px', threshold: 0 },
    );
    for (const item of itemsRef.current) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  function handleClick(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (items.length === 0) return null;

  return (
    <nav className="section-nav" aria-label="Jump to section">
      <div className="section-nav__inner">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`section-nav__item${active === item.id ? ' section-nav__item--active' : ''}`}
            onClick={() => handleClick(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
