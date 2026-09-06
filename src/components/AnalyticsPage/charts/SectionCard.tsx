import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  description?: string;
  controls?: ReactNode;
  info?: ReactNode;
  children: ReactNode;
}

export function SectionCard({ title, description, controls, info, children }: SectionCardProps) {
  return (
    <section className="analytics-section">
      <div className="analytics-section__header">
        <div>
          <h2 className="analytics-section__title">{title}</h2>
          {description && <p className="analytics-section__description">{description}</p>}
        </div>
        <div className="analytics-section__header-right">
          {controls && <div className="analytics-section__controls">{controls}</div>}
          {info}
        </div>
      </div>
      <div className="analytics-section__body">{children}</div>
    </section>
  );
}
