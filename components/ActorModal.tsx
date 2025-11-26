import React, { useEffect, useState } from 'react';
import { PersonDetails, PersonCredits, Movie, GENRES } from '../types';
import { tmdbService, getImageUrl } from '../services/tmdb';
import { CloseIcon, StarIcon } from './Icons';

interface ActorModalProps {
  actorId: number;
  onClose: () => void;
  onMovieClick: (movie: Movie) => void;
}

const ActorModal: React.FC<ActorModalProps> = ({ actorId, onClose, onMovieClick }) => {
  const [details, setDetails] = useState<PersonDetails | null>(null);
  const [credits, setCredits] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullBio, setShowFullBio] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [detailsRes, creditsRes] = await Promise.all([
          tmdbService.getPersonDetails(actorId),
          tmdbService.getPersonCredits(actorId)
        ]);
        
        setDetails(detailsRes);
        // Sort credits by popularity and filter out items without posters
        const sortedCredits = creditsRes.cast
          .filter(m => m.poster_path && (m.media_type === 'movie' || m.media_type === 'tv'))
          .sort((a, b) => b.popularity - a.popularity)
          .slice(0, 20); // Top 20 items
          
        setCredits(sortedCredits);
      } catch (error) {
        console.error("Failed to load actor data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [actorId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!details) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl bg-[#0f172a] rounded-2xl overflow-hidden shadow-2xl animate-scaleIn flex flex-col max-h-[90vh] border border-slate-700">
        <button 
            onClick={onClose}
            className="absolute top-4 left-4 z-20 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
        >
            <CloseIcon className="w-6 h-6" />
        </button>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
          <div className="flex flex-col md:flex-row gap-8">
            
            {/* Left Column - Image & Stats */}
            <div className="w-full md:w-1/3 flex-shrink-0 text-center md:text-right">
              <div className="aspect-[2/3] w-64 md:w-full mx-auto rounded-xl overflow-hidden shadow-2xl border border-slate-700 mb-6">
                <img 
                  src={getImageUrl(details.profile_path, 'w500')} 
                  alt={details.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="space-y-4 text-sm text-slate-300">
                <div>
                  <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">תאריך לידה</h3>
                  <p className="text-white font-medium">{details.birthday || 'לא ידוע'}</p>
                </div>
                <div>
                  <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">מקום לידה</h3>
                  <p className="text-white font-medium">{details.place_of_birth || 'לא ידוע'}</p>
                </div>
                <div>
                  <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">ידוע/ה בתור</h3>
                  <p className="text-white font-medium">{details.known_for_department}</p>
                </div>
              </div>
            </div>

            {/* Right Column - Info & Filmography */}
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-black text-white mb-6 font-poppins">{details.name}</h1>
              
              <div className="mb-10">
                <h3 className="text-lg font-bold text-white mb-2">ביוגרפיה</h3>
                <div className={`text-slate-300 leading-relaxed font-light ${!showFullBio && details.biography.length > 300 ? 'line-clamp-4' : ''}`}>
                   {details.biography || "אין ביוגרפיה זמינה לשחקן זה."}
                </div>
                {details.biography.length > 300 && (
                  <button 
                    onClick={() => setShowFullBio(!showFullBio)}
                    className="text-blue-500 hover:text-blue-400 text-sm font-bold mt-2"
                  >
                    {showFullBio ? 'קרא פחות' : 'קרא עוד'}
                  </button>
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <StarIcon className="w-5 h-5 text-yellow-500" />
                  פילמוגרפיה נבחרת
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {credits.map(item => (
                    <div 
                      key={item.id} 
                      className="group cursor-pointer"
                      onClick={() => onMovieClick(item)}
                    >
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-slate-800 relative mb-2">
                        <img 
                          src={getImageUrl(item.poster_path, 'w500')} 
                          alt={item.title || item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      </div>
                      <h4 className="text-xs font-bold text-white group-hover:text-blue-400 truncate text-right">
                        {item.title || item.name}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActorModal;