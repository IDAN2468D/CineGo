import React, { useEffect, useState } from 'react';
import { Movie, GENRES, CastMember, Review } from '../types';
import { getImageUrl, tmdbService } from '../services/tmdb';
import { geminiService } from '../services/gemini';
import { CloseIcon, PlayIcon, TicketIcon, PlusIcon, CheckIcon, SparklesIcon, YouTubeIcon } from './Icons';
import BookingModal from './BookingModal';
import CastList from './CastList';

interface MovieModalProps {
  movie: Movie | null;
  onClose: () => void;
  onUpdateList?: () => void; // Callback to refresh list in parent if needed
}

const MovieModal: React.FC<MovieModalProps> = ({ movie, onClose, onUpdateList }) => {
  const [showBooking, setShowBooking] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isInList, setIsInList] = useState(false);
  const [aiSummary, setAiSummary] = useState<{ sentiment: string, summary: string } | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (movie) {
      document.body.style.overflow = 'hidden';
      checkListStatus();
      fetchDetails();
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [movie]);

  // Reset state when movie changes
  useEffect(() => {
    setShowBooking(false);
    setIsPlaying(false);
    setTrailerKey(null);
    setCast([]);
    setReviews([]);
    setAiSummary(null);
  }, [movie]);

  const checkListStatus = () => {
    if (!movie) return;
    const list = JSON.parse(localStorage.getItem('myList') || '[]');
    setIsInList(list.some((m: Movie) => m.id === movie.id));
  };

  const toggleList = () => {
    if (!movie) return;
    const list = JSON.parse(localStorage.getItem('myList') || '[]');
    
    let newList;
    if (isInList) {
      newList = list.filter((m: Movie) => m.id !== movie.id);
    } else {
      newList = [...list, movie];
    }
    
    localStorage.setItem('myList', JSON.stringify(newList));
    setIsInList(!isInList);
    if (onUpdateList) onUpdateList();
  };

  const fetchDetails = async () => {
    if (!movie) return;
    try {
      const type = movie.media_type === 'tv' || (!movie.title && movie.name) ? 'tv' : 'movie';
      
      const [creditsRes, videosRes, reviewsRes] = await Promise.all([
        tmdbService.getCredits(movie.id, type),
        tmdbService.getVideos(movie.id, type),
        tmdbService.getReviews(movie.id, type)
      ]);

      setCast(creditsRes.cast);
      setReviews(reviewsRes.results);
      
      const trailer = videosRes.results.find(
        v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
      );
      if (trailer) setTrailerKey(trailer.key);
      
    } catch (e) {
      console.error("Failed to fetch details", e);
    }
  };

  const handleAiSummary = async () => {
    if (reviews.length === 0 || isSummarizing) return;
    
    setIsSummarizing(true);
    try {
      // Take first 10 reviews max to save tokens
      const reviewsText = reviews.slice(0, 10).map(r => r.content).join("\n\n");
      const result = await geminiService.summarizeReviews(reviewsText, movie?.title || movie?.name || "");
      setAiSummary(result);
    } catch (e) {
      console.error("AI Summary failed", e);
    } finally {
      setIsSummarizing(false);
    }
  };

  if (!movie) return null;

  const title = movie.title || movie.name;
  const originalTitle = movie.original_title || movie.original_name;
  const date = movie.release_date || movie.first_air_date;
  const year = date ? date.split('-')[0] : '';
  const isMovie = movie.media_type === 'movie' || (!movie.media_type && !!movie.title);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" dir="rtl">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal Content */}
        <div className="relative w-full max-w-6xl bg-[#0f172a] rounded-2xl overflow-hidden shadow-2xl animate-fadeIn text-right flex flex-col max-h-[90vh] border border-slate-700">
          
          <button 
            onClick={onClose}
            className="absolute top-4 left-4 z-20 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <CloseIcon className="w-6 h-6" />
          </button>

          <div className="flex-1 overflow-y-auto no-scrollbar">
             {/* Trailer / Image Area */}
             <div className="relative aspect-video w-full bg-black group">
                {isPlaying && trailerKey ? (
                  <div className="relative w-full h-full">
                    <iframe 
                      src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&showinfo=0`}
                      title="Trailer"
                      className="w-full h-full"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    />
                     <a 
                      href={`https://www.youtube.com/watch?v=${trailerKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-4 right-14 z-20 flex items-center gap-2 bg-zinc-900/80 hover:bg-[#ff0000] text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg transition-all border border-white/10 backdrop-blur-sm"
                    >
                      <YouTubeIcon className="w-4 h-4" />
                      <span>לא מתנגן? צפייה ב-YouTube</span>
                    </a>
                  </div>
                ) : (
                  <>
                    <img 
                      src={getImageUrl(movie.backdrop_path || movie.poster_path, 'original')} 
                      alt={title} 
                      className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent" />
                    
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                       {trailerKey && (
                         <button 
                           onClick={() => setIsPlaying(true)}
                           className="group flex flex-col items-center gap-2"
                         >
                           <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-blue-600/90 flex items-center justify-center group-hover:scale-110 transition shadow-lg shadow-blue-900/50">
                             <PlayIcon className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" />
                           </div>
                           <span className="text-white font-bold drop-shadow-md font-poppins">Play Trailer</span>
                         </button>
                       )}
                    </div>
                  </>
                )}
             </div>

             <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-10">
                {/* Left Col (Main Info) */}
                <div>
                    <h2 className="text-3xl md:text-5xl font-black mb-2 leading-tight text-white font-poppins">{title}</h2>
                    <div className="flex items-center gap-4 text-sm text-slate-300 mb-8">
                      <span className="text-green-400 font-bold">{Math.round(movie.vote_average * 10)}% התאמה</span>
                      <span className="font-poppins">{year}</span>
                      <span className="border border-slate-600 px-1.5 py-0.5 rounded text-xs">HD</span>
                      <span>{movie.genre_ids.map(id => GENRES[id]).slice(0, 2).join(', ')}</span>
                    </div>

                    <div className="flex gap-4 mb-10">
                      {isMovie && (
                        <button 
                          onClick={() => setShowBooking(true)}
                          className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-900/20 transform hover:-translate-y-0.5"
                        >
                          <TicketIcon className="w-5 h-5" />
                          <span>רכישת כרטיסים</span>
                        </button>
                      )}
                      
                      <button 
                        onClick={toggleList}
                        className={`flex items-center gap-2 px-6 py-3.5 border-2 font-bold rounded-xl transition 
                          ${isInList ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-slate-600 text-slate-300 hover:border-white hover:text-white'}`}
                      >
                        {isInList ? <CheckIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
                        <span>{isInList ? 'ברשימה שלך' : 'הוסף לרשימה'}</span>
                      </button>
                    </div>

                    <p className="text-slate-300 leading-relaxed text-lg mb-10 font-light">
                      {movie.overview || "אין תקציר זמין עבור כותר זה."}
                    </p>

                     {/* AI Reviews Summary Section */}
                    {reviews.length > 0 && (
                      <div className="mb-10">
                        <div className="flex items-center justify-between mb-4">
                           <h3 className="text-xl font-bold text-white">מה הצופים חושבים?</h3>
                           <button 
                             onClick={handleAiSummary}
                             disabled={isSummarizing || !!aiSummary}
                             className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition
                               ${aiSummary ? 'bg-purple-900/30 text-purple-300 cursor-default border border-purple-500/20' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20'}
                               ${isSummarizing ? 'opacity-70 cursor-wait' : ''}
                             `}
                           >
                             <SparklesIcon className={`w-4 h-4 ${isSummarizing ? 'animate-spin' : ''}`} />
                             {isSummarizing ? 'מנתח ביקורות...' : aiSummary ? 'ניתוח AI הושלם' : 'סיכום ביקורות עם AI'}
                           </button>
                        </div>

                        {aiSummary && (
                          <div className="bg-gradient-to-br from-purple-900/20 to-black/50 border border-purple-500/30 rounded-2xl p-6 animate-fadeIn">
                             <div className="flex items-center gap-2 mb-3 text-purple-400 font-bold">
                               <SparklesIcon className="w-5 h-5" />
                               <span>סיכום Gemini</span>
                             </div>
                             <p className="text-slate-200 leading-relaxed mb-4">{aiSummary.summary}</p>
                             <div className="inline-block px-3 py-1 rounded bg-white/5 text-sm border border-white/10">
                               סנטימנט כללי: <span className="font-bold text-white">{aiSummary.sentiment}</span>
                             </div>
                          </div>
                        )}
                        
                        {!aiSummary && !isSummarizing && (
                           <p className="text-sm text-slate-500">
                             ישנן {reviews.length} ביקורות משתמשים. לחץ על הכפתור כדי לקבל סיכום חכם בעברית.
                           </p>
                        )}
                      </div>
                    )}

                    <CastList cast={cast} />
                </div>

                {/* Right Col (Side Details) */}
                <div className="text-sm space-y-6 text-slate-400">
                    <div>
                      <span className="block text-slate-500 mb-1 uppercase text-xs tracking-wider">כותרת מקורית</span>
                      <span className="text-white font-medium">{originalTitle}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 mb-1 uppercase text-xs tracking-wider">ז'אנרים</span>
                      <span className="text-white leading-relaxed">
                         {movie.genre_ids.map(id => GENRES[id]).join(', ')}
                      </span>
                    </div>
                     <div>
                      <span className="block text-slate-500 mb-1 uppercase text-xs tracking-wider">פופולריות</span>
                      <span className="text-white">{Math.floor(movie.popularity)} נקודות</span>
                    </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Booking Wizard Modal - Rendered on top */}
      {showBooking && (
        <BookingModal 
          movie={movie} 
          onClose={() => setShowBooking(false)} 
        />
      )}
    </>
  );
};

export default MovieModal;