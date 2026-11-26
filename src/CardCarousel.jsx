import { useState } from 'react';
import { Link } from 'react-router-dom';

function CardAction({ item, tabIndex }) {
  if (item.disabled) return <span className="inactive">{item.label}</span>;

  if (item.to) {
    return (
      <Link to={item.to} className="card-action tracker-action" tabIndex={tabIndex}>
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <rect x="7" y="7" width="10" height="13" rx="5" />
          <path d="M9 7V6a3 3 0 0 1 6 0v1M12 11v5M7 10 4 8M7 13H3m4 3-3 2m13-8 3-2m-3 5h4m-4 3 3 2" />
        </svg>
        {item.label}
      </Link>
    );
  }

  return (
    <a href={item.url} target="_blank" rel="noreferrer" className="card-action telegram-action"
      tabIndex={tabIndex} aria-label={item.name + ' on Telegram'}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
        strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
        <path d="m3 10 18-7-4 17-6-5-3 3v-5zM8 13l8-6-5 8" />
      </svg>
      {item.label}
    </a>
  );
}

export default function CardCarousel({ items, label }) {
  const [active, setActive] = useState(0);
  const move = step => setActive(index => (index + step + items.length) % items.length);

  return (
    <div className="carousel" role="region" aria-label={label + ' carousel'}>
      <div className="carousel-stage">
        {items.map((item, index) => {
          const offset = (index - active + items.length) % items.length;
          return (
            <article className="channel-card" key={item.name} data-offset={offset} aria-hidden={offset !== 0}
              onClick={offset ? () => setActive(index) : undefined}>
              <div className="card-art">
                {item.img ? <img src={item.img} alt="" loading="lazy" /> : (
                  <span className="card-art-icon" aria-hidden="true">{item.icon}</span>
                )}
              </div>
              <div className="card-copy">
                <h3>{item.name}</h3>
                <CardAction item={item} tabIndex={offset ? -1 : 0} />
              </div>
            </article>
          );
        })}
      </div>
      <div className="carousel-controls">
        <span className="position" aria-hidden="true">{active + 1} / {items.length}</span>
        <span className="sr-only" aria-live="polite">{items[active].name}</span>
        <button onClick={() => move(-1)} aria-label={'Previous ' + label.toLowerCase() + ' card'}>‹</button>
        <button onClick={() => move(1)} aria-label={'Next ' + label.toLowerCase() + ' card'}>›</button>
      </div>
    </div>
  );
}
