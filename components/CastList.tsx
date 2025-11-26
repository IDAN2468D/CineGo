import React from 'react';
import { CastMember } from '../types';
import { getImageUrl } from '../services/tmdb';

interface CastListProps {
  cast: CastMember[];
  onActorClick?: (actorId: number) => void;
}

const CastList: React.FC<CastListProps> = ({ cast, onActorClick }) => {
  if (!cast || cast.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold mb-4 text-right">שחקנים ראשיים</h3>
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
        {cast.slice(0, 15).map(actor => (
          <div 
            key={actor.id} 
            className={`flex-shrink-0 w-24 text-center group ${onActorClick ? 'cursor-pointer' : ''}`}
            onClick={() => onActorClick && onActorClick(actor.id)}
          >
            <div className="w-24 h-24 rounded-full overflow-hidden mb-2 border-2 border-slate-700 group-hover:border-blue-500 transition-colors">
              <img 
                src={getImageUrl(actor.profile_path, 'w500')} 
                alt={actor.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <p className="text-xs font-bold text-gray-200 truncate group-hover:text-blue-400 transition-colors">{actor.name}</p>
            <p className="text-[10px] text-gray-400 truncate">{actor.character}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CastList;