const colors = ['#E8826B', '#D4AF7A', '#E8B4B8', '#3E2A3E', '#FAF6F0'];

export function Confetti({ count = 60 }: { count?: number }) {
  return (
    <div className="pointer-events-none">
      {Array.from({ length: count }).map((_, i) => {
        const left = Math.random() * 100;
        const color = colors[i % colors.length];
        const delay = Math.random() * 1200;
        const duration = 2200 + Math.random() * 1400;
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${left}%`,
              background: color,
              animationDelay: `${delay}ms`,
              animationDuration: `${duration}ms`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}
