import React, { useState, useEffect, useRef } from 'react';
import { tmdbService, getImageUrl } from './services/tmdb';
import { geminiService } from './services/gemini';
import { getMyTickets } from './services/mockBooking';
import { Movie, TicketData } from './types';
import MovieCard from './components/MovieCard';
import MovieModal from './components/MovieModal';
import Ticket from './components/Ticket';
import { SearchIcon, InfoIcon, PlayIcon, CloseIcon, SparklesIcon, ListIcon, ChevronLeftIcon, ChevronRightIcon, TicketIcon } from './components/Icons';

type View = 'home' | 'tv' | 'movies' | 'new' | 'mylist' | 'tickets';

interface RowData {
  title: string;
  movies: Movie[];
}

const App: React.FC = () => {
  // Navigation State
  const [currentView, setCurrentView] = useState<View>('home');
  
  // Data State
  const [heroMovie, setHeroMovie] = useState<Movie | null>(null);
  const [rows, setRows] = useState<RowData[]>([]);
  const [myTickets, setMyTickets] = useState<TicketData[]>([]);
  
  // Search & Modal State
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  
  // AI State
  const [isAiMode, setIsAiMode] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Fetch Data based on View
  useEffect(() => {
    const loadViewData = async () => {
      setLoading(true);
      setRows([]); // Clear current rows
      
      try {
        let heroData: Movie[] = [];
        let newRows: RowData[] = [];

        if (currentView === 'tickets') {
           setMyTickets(getMyTickets());
           setHeroMovie(null);
        }
        else if (currentView === 'mylist') {
           const myList = JSON.parse(localStorage.getItem('myList') || '[]');
           heroData = myList;
           if (myList.length > 0) {
             newRows = [{ title: "הרשימה שלי", movies: myList }];
           }
        } 
        else if (currentView === 'home') {
          const [trending, popular, topRated] = await Promise.all([
            tmdbService.getTrending(),
            tmdbService.getPopular(),
            tmdbService.getTopRated(),
          ]);
          heroData = trending.results;
          newRows = [
            { title: "פופולרי ב-TMDB", movies: popular.results },
            { title: "הכי מדורגים", movies: topRated.results },
            { title: "טרנדי השבוע", movies: trending.results },
          ];
        } 
        else if (currentView === 'tv') {
          const [trendingTV, popularTV, topRatedTV] = await Promise.all([
            tmdbService.getTrendingTV(),
            tmdbService.getPopularTV(),
            tmdbService.getTopRatedTV(),
          ]);
          heroData = trendingTV.results;
          newRows = [
            { title: "סדרות טרנדיות", movies: trendingTV.results },
            { title: "סדרות פופולריות", movies: popularTV.results },
            { title: "סדרות בדירוג גבוה", movies: topRatedTV.results },
          ];
        }
        else if (currentView === 'movies') {
          const [action, comedy, drama, horror] = await Promise.all([
            tmdbService.getActionMovies(),
            tmdbService.getComedyMovies(),
            tmdbService.getDramaMovies(),
            tmdbService.getHorrorMovies(),
          ]);
          // For Movies hero, we can reuse the popular movie list or fetch trending
          const trending = await tmdbService.getTrending(); 
          heroData = trending.results;
          
          newRows = [
            { title: "סרטי פעולה", movies: action.results },
            { title: "קומדיות", movies: comedy.results },
            { title: "דרמות מרגשות", movies: drama.results },
            { title: "סרטי אימה", movies: horror.results },
          ];
        }
        else if (currentView === 'new') {
          const [upcomingMovies, onTheAirTV] = await Promise.all([
            tmdbService.getUpcoming(),
            tmdbService.getOnTheAirTV(),
          ]);
          heroData = upcomingMovies.results;
          newRows = [
            { title: "בקרוב בקולנוע", movies: upcomingMovies.results },
            { title: "משודר כעת בטלוויזיה", movies: onTheAirTV.results },
          ];
        }

        setRows(newRows);
        
        // Set Hero Movie (Random from the first batch of results)
        if (heroData.length > 0 && currentView !== 'tickets' && currentView !== 'mylist') {
          const randomHero = heroData[Math.floor(Math.random() * heroData.length)];
          setHeroMovie(randomHero);
        } else if (currentView === 'mylist' && heroData.length > 0) {
          setHeroMovie(heroData[0]);
        }

      } catch (error) {
        console.error("Failed to load data", error);
      } finally {
        setLoading(false);
      }
    };

    loadViewData();
  }, [currentView]);

  // Scroll listener for Navbar transparency
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Search Logic
  useEffect(() => {
    if (isAiMode) return;

    if (searchQuery.trim().length > 1) {
      const timer = setTimeout(() => {
        tmdbService.searchMovies(searchQuery).then(res => {
          if (res && res.results) {
            // Filter out people, only show movies/tv
            const validResults = res.results.filter(item => item.media_type !== 'person' && item.poster_path);
            setSearchResults(validResults);
          }
        }).catch(console.error);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, isAiMode]);

  const handleAiSearch = async () => {
    if (!searchQuery.trim() || isAiLoading) return;
    
    setIsAiLoading(true);
    setSearchResults([]);
    
    try {
      const recommendations = await geminiService.getRecommendations(searchQuery);
      
      if (recommendations.length > 0) {
        const moviePromises = recommendations.map(async (rec) => {
          try {
            const tmdbRes = await tmdbService.searchMovies(rec.title);
            // Try to find exact match or first result
            const movie = tmdbRes.results.find(m => m.media_type !== 'person' && m.poster_path) || tmdbRes.results[0];
            
            if (movie) {
              return {
                ...movie,
                overview: rec.synopsis || movie.overview
              };
            }
            return null;
          } catch (e) {
            return null;
          }
        });

        const responses = await Promise.all(moviePromises);
        const aiMovies = responses.filter((m): m is Movie => m !== null);
        setSearchResults(aiMovies);
      }
    } catch (error) {
      console.error("AI Search failed", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isAiMode) {
      handleAiSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const toggleAiMode = () => {
    setIsAiMode(!isAiMode);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
  };

  const handleNavClick = (view: View) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const refreshList = () => {
    // If currently viewing list, force re-render
    if (currentView === 'mylist') {
       const myList = JSON.parse(localStorage.getItem('myList') || '[]');
       if (myList.length > 0) {
         setRows([{ title: "הרשימה שלי", movies: myList }]);
       } else {
         setRows([]);
       }
    }
  };

  if (loading && rows.length === 0 && currentView !== 'mylist' && currentView !== 'tickets') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0f172a] text-blue-600">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-current"></div>
      </div>
    );
  }

  const getHeroTitle = (m: Movie) => m.title || m.name;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white pb-20 overflow-x-hidden font-sans">
      
      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-40 transition-colors duration-500 ${isScrolled ? 'bg-[#0f172a]/90 backdrop-blur-md shadow-lg border-b border-white/5' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
        <div className="px-4 md:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <h1 onClick={() => handleNavClick('home')} className="text-2xl md:text-3xl font-black text-blue-500 cursor-pointer tracking-tighter font-poppins">CineGo</h1>
            <ul className="hidden md:flex gap-8 text-sm text-slate-300 font-medium">
              {[
                { id: 'home', label: 'ראשי' },
                { id: 'movies', label: 'סרטים' },
                { id: 'tv', label: 'סדרות' },
                { id: 'new', label: 'חדש' },
                { id: 'mylist', label: 'הרשימה שלי' },
              ].map((item) => (
                <li 
                  key={item.id}
                  onClick={() => handleNavClick(item.id as View)} 
                  className={`cursor-pointer hover:text-white transition relative py-1
                     ${currentView === item.id ? 'text-white' : ''}`}
                >
                  {item.label}
                  {currentView === item.id && (
                     <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"></span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-6">
             {/* My Tickets Button */}
            <button 
              onClick={() => handleNavClick('tickets')}
              className={`hidden md:flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full transition
                ${currentView === 'tickets' ? 'bg-blue-600 text-white' : 'hover:bg-white/10 text-slate-300'}`}
            >
               <TicketIcon className="w-5 h-5" />
               <span>הכרטיסים שלי</span>
            </button>

            {/* Search Bar */}
            <div className="relative group" dir="rtl">
              <div className={`flex items-center gap-2 border px-2 py-1.5 transition-all duration-300 rounded-full
                ${searchQuery || isAiMode ? (isAiMode ? 'border-purple-500 bg-slate-900' : 'border-blue-500/50 bg-slate-900') : 'border-transparent bg-transparent hover:bg-white/10'}`}>
                
                <button 
                  onClick={toggleAiMode}
                  className={`p-1.5 rounded-full transition-colors ${isAiMode ? 'text-purple-400 bg-purple-500/10' : 'text-slate-400 hover:text-white'}`}
                  title={isAiMode ? "חזרה לחיפוש רגיל" : "חיפוש חכם עם Gemini"}
                >
                  <SparklesIcon className="w-5 h-5" />
                </button>

                {!isAiMode && <SearchIcon className="w-5 h-5 text-slate-300 cursor-pointer" />}
                
                <input 
                  type="text" 
                  placeholder={isAiMode ? "נסה: סרטי אימה פסיכולוגיים..." : "חיפוש..."}
                  className={`bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none transition-all duration-300 
                    ${searchQuery || isAiMode ? 'w-48 sm:w-64 opacity-100 pl-2' : 'w-0 opacity-0 group-hover:w-48 group-hover:opacity-100'}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                
                {searchQuery && (
                  <button 
                    onClick={handleClearSearch}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                    aria-label="נקה חיפוש"
                  >
                    <CloseIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      {searchQuery ? (
        // Search Results View
        <div className="pt-32 px-4 md:px-12 min-h-screen" dir="rtl">
           <div className="flex items-center gap-4 mb-8">
             <h2 className="text-2xl text-slate-400">
               {isAiMode ? (
                 <span className="flex items-center gap-2">
                   המלצות Gemini עבור: <span className="text-purple-400 font-bold">{searchQuery}</span>
                   <SparklesIcon className="w-5 h-5 text-purple-400 animate-pulse" />
                 </span>
               ) : (
                 <>תוצאות חיפוש עבור: <span className="text-white font-bold">{searchQuery}</span></>
               )}
             </h2>
           </div>
           
           {isAiLoading ? (
             <div className="flex flex-col items-center justify-center py-20 gap-4">
               <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
               <p className="text-purple-400 animate-pulse">Gemini מחפש המלצות עבורך...</p>
             </div>
           ) : searchResults.length > 0 ? (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
               {searchResults.map(movie => (
                 movie.poster_path && <MovieCard key={movie.id} movie={movie} onClick={handleMovieClick} />
               ))}
             </div>
           ) : (
             <p className="text-slate-500 text-lg">
               {isAiMode ? 'לא נמצאו המלצות. נסה לתאר את הבקשה אחרת.' : 'לא נמצאו תוצאות.'}
             </p>
           )}
        </div>
      ) : (
        // Standard Views
        <>
          {/* Hero Section */}
          {heroMovie && currentView !== 'tickets' && (
            <div className="relative h-[60vh] md:h-[80vh] w-full overflow-hidden" dir="rtl">
              <div className="absolute inset-0">
                <img 
                  src={getImageUrl(heroMovie.backdrop_path, 'original')} 
                  alt={getHeroTitle(heroMovie)} 
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-black/30"></div>
                <div className="absolute inset-0 bg-gradient-to-l from-[#0f172a] via-[#0f172a]/40 to-transparent"></div>
              </div>

              <div className="absolute top-[30%] right-[5%] md:right-[8%] max-w-2xl space-y-6 z-10">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black drop-shadow-xl leading-tight text-white font-poppins">
                  {getHeroTitle(heroMovie)}
                </h1>
                
                <div className="flex items-center gap-3 text-sm font-medium text-slate-300">
                   <span className="text-green-400 font-bold">{Math.round(heroMovie.vote_average * 10)}% Match</span>
                   <span>{heroMovie.release_date?.split('-')[0] || heroMovie.first_air_date?.split('-')[0]}</span>
                </div>

                <p className="text-base md:text-xl text-shadow-md line-clamp-3 text-slate-200 font-light leading-relaxed max-w-xl">
                  {heroMovie.overview || "תקציר לא זמין."}
                </p>
                
                <div className="flex items-center gap-4 pt-4">
                  <button 
                    onClick={() => handleMovieClick(heroMovie)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-xl hover:bg-blue-500 transition text-base font-bold shadow-lg shadow-blue-900/40"
                  >
                    <PlayIcon className="w-6 h-6" />
                    <span>הזמן כרטיסים</span>
                  </button>
                  <button 
                    onClick={() => handleMovieClick(heroMovie)}
                    className="flex items-center gap-2 bg-slate-500/30 text-white px-8 py-3.5 rounded-xl hover:bg-slate-500/50 transition text-base font-bold backdrop-blur-md border border-white/10"
                  >
                    <InfoIcon className="w-6 h-6" />
                    <span>מידע נוסף</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MY TICKETS VIEW */}
          {currentView === 'tickets' ? (
             <div className="pt-32 px-4 md:px-12 min-h-screen" dir="rtl">
                <h2 className="text-3xl font-black mb-8 border-b border-slate-700 pb-4">הכרטיסים שלי</h2>
                {myTickets.length === 0 ? (
                   <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-700 border-dashed">
                      <TicketIcon className="w-16 h-16 mb-4 opacity-30" />
                      <p className="text-xl font-bold">אין לך כרטיסים עדיין</p>
                      <button onClick={() => handleNavClick('home')} className="mt-4 text-blue-500 hover:underline">חפש סרטים להזמנה</button>
                   </div>
                ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {myTickets.map(ticket => (
                         <Ticket key={ticket.id} data={ticket} />
                      ))}
                   </div>
                )}
             </div>
          ) : (
            // REGULAR ROWS
            <div className={`relative z-10 ${heroMovie ? '-mt-20 md:-mt-32' : 'pt-32'} space-y-12 pl-4 md:pl-12 pb-10`} dir="rtl">
              {currentView === 'mylist' && rows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 text-slate-500">
                    <ListIcon className="w-20 h-20 mb-6 opacity-30" />
                    <p className="text-2xl font-bold">הרשימה שלך ריקה</p>
                    <p className="text-base mt-2">הוסיפו סרטים וסדרות כדי לצפות בהם מאוחר יותר</p>
                  </div>
              ) : (
                  rows.map((row, index) => (
                      <Row key={index} title={row.title} movies={row.movies} onMovieClick={handleMovieClick} />
                  ))
              )}
            </div>
          )}
        </>
      )}

      {/* Details Modal */}
      <MovieModal 
        movie={selectedMovie} 
        onClose={() => setSelectedMovie(null)} 
        onUpdateList={refreshList}
      />
      
      {/* Footer */}
      <footer className="py-12 text-center text-slate-500 text-sm bg-[#0a0f1c] mt-20 border-t border-slate-800" dir="rtl">
        <div className="flex justify-center gap-4 mb-4">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
        </div>
        <p className="mb-2">Cinema Platform Demo © 2024</p>
        <p className="text-slate-600">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
        <p className="mt-4 text-blue-500/40 text-xs font-mono">Built with React, Tailwind & Gemini AI</p>
      </footer>
    </div>
  );
};

// Sub-component for Rows with Scroll Support
const Row: React.FC<{ title: string, movies: Movie[], onMovieClick: (m: Movie) => void }> = ({ title, movies, onMovieClick }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [isMoved, setIsMoved] = useState(false);

  const handleClick = (direction: 'left' | 'right') => {
    setIsMoved(true);
    if (rowRef.current) {
      const { clientWidth } = rowRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.7 : clientWidth * 0.7;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!movies || movies.length === 0) return null;
  
  return (
    <div className="space-y-4 px-4 md:px-0 group/row">
      <h2 className="text-xl md:text-2xl font-bold text-slate-100 flex items-center gap-2 cursor-pointer hover:text-blue-500 transition w-fit font-poppins">
        {title}
        <ChevronLeftIcon className="w-4 h-4 opacity-0 group-hover/row:opacity-100 transition-opacity -translate-x-2 group-hover/row:translate-x-0" />
      </h2>
      <div className="relative group">
        
        <div 
            className={`absolute top-0 bottom-0 right-0 z-40 m-auto h-full w-12 cursor-pointer bg-gradient-to-l from-transparent to-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 ${!isMoved ? 'hidden' : ''}`}
            onClick={() => handleClick('right')}
        >
            <ChevronRightIcon className="w-8 h-8 text-white hover:scale-110 transition" />
        </div>

        <div 
            ref={rowRef}
            className="flex gap-4 overflow-x-scroll no-scrollbar scroll-smooth py-4 px-2 -mx-2"
        >
          {movies.map(movie => (
            <div key={movie.id} className="min-w-[150px] md:min-w-[220px]">
               <MovieCard movie={movie} onClick={onMovieClick} />
            </div>
          ))}
        </div>

        <div 
            className="absolute top-0 bottom-0 left-0 z-40 m-auto h-full w-12 cursor-pointer bg-gradient-to-r from-transparent to-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300"
            onClick={() => handleClick('left')}
        >
            <ChevronLeftIcon className="w-8 h-8 text-white hover:scale-110 transition" />
        </div>

      </div>
    </div>
  );
};

export default App;