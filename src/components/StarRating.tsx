export function StarRating({ rating, total }: { rating: number; total?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex text-yellow-400" aria-label={`${rating} de 5 estrellas`}>
        {Array.from({ length: full }).map((_, i) => (
          <Star key={`f${i}`} type="full" />
        ))}
        {half && <Star type="half" />}
        {Array.from({ length: empty }).map((_, i) => (
          <Star key={`e${i}`} type="empty" />
        ))}
      </div>
      <span className="text-sm text-gray-500 font-medium">
        {rating.toFixed(1)}
        {total !== undefined && <span className="text-gray-400"> ({total} reseñas)</span>}
      </span>
    </div>
  );
}

function Star({ type }: { type: 'full' | 'half' | 'empty' }) {
  if (type === 'full') return <span className="text-lg">★</span>;
  if (type === 'half') return <span className="text-lg">⯨</span>;
  return <span className="text-lg text-gray-300">★</span>;
}
