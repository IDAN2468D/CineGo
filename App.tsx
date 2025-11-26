import React, { useState, useEffect, useRef } from 'react';
import { tmdbService, getImageUrl } from './services/tmdb';
import { geminiService } from './services/gemini';
import { getMyTickets } from './services/mockBooking';
import { Movie, TicketData, GENRES } from './types';
import MovieCard from './components/MovieCard';
import MovieModal from './components/MovieModal';
import ActorModal from './components/ActorModal';
import Ticket from './components/Ticket';
import { SearchIcon, InfoIcon, PlayIcon, CloseIcon, SparklesIcon, ListIcon, ChevronLeftIcon, ChevronRightIcon, TicketIcon, HomeIcon, FilmIcon, TvIcon, FireIcon } from './components/Icons';

type View = 'home' | 'tv' | 'movies' | 'new' | 'mylist' | 'tickets';

interface RowData {
  title: string;
  movies: Movie[];
  variant?: 'ranked' | 'standard';
}

const App: React.FC = () => {
  // Navigation State
  const [currentView, setCurrentView] = useState<View>('home');
  
  // Data State
  const [heroMovies, setHeroMovies] = useState<Movie[]>([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [rows, setRows] = useState<RowData[]>([]);
  const [myTickets, setMyTickets] = useState<TicketData[]>([]);
  const [myListMovies, setMyListMovies] = useState<Movie[]>([]);
  
  // Search & Modal State
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedActorId, setSelectedActorId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  // My List Filtering & Sorting State
  const [sortOption, setSortOption] = useState<string>('dateDesc');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  
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
           setHeroMovies([]);
        }
        else if (currentView === 'mylist') {
           const myList = JSON.parse(localStorage.getItem('myList') || '[]');
           setMyListMovies(myList);
           // For My List, we might just show one static hero or none
           heroData = myList;
           newRows = [];
        } 
        else if (currentView === 'home') {
          const [trending, popular, topRated] = await Promise.all([
            tmdbService.getTrending(),
            tmdbService.getPopular(),
            tmdbService.getTopRated(),
          ]);
          heroData = trending.results;
          newRows = [
            { title: "פופולרי ב-TMDB", movies: popular.results, variant: 'ranked' },
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
        
        // Set Hero Movies (Top 5 items)
        if (heroData.length > 0 && currentView !== 'tickets' && currentView !== 'mylist') {
          setHeroMovies(heroData.slice(0, 5));
          setCurrentHeroIndex(0);
        } else if (currentView === 'mylist' && heroData.length > 0) {
          setHeroMovies([heroData[heroData.length - 1]]);
          setCurrentHeroIndex(0);
        } else {
          setHeroMovies([]);
        }

      } catch (error) {
        console.error("Failed to load data", error);
      } finally {
        setLoading(false);
      }
    };

    loadViewData();
  }, [currentView]);

  // Slideshow Effect
  useEffect(() => {
    if (heroMovies.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroMovies.length);
    }, 8000); // Change slide every 8 seconds

    return () => clearInterval(interval);
  }, [heroMovies]);

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

  const handleActorClick = (actorId: number) => {
    // Close movie modal if open and open actor modal
    setSelectedMovie(null);
    setSelectedActorId(actorId);
  };

  const handleMovieFromActorClick = (movie: Movie) => {
    // Close actor modal and open movie modal
    setSelectedActorId(null);
    setSelectedMovie(movie);
  };

  const handleNavClick = (view: View) => {
    setCurrentView(view);
    // Reset filters when entering My List
    if (view === 'mylist') {
        setSortOption('dateDesc');
        setSelectedGenre('all');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const refreshList = () => {
    // If currently viewing list, force re-render
    if (currentView === 'mylist') {
       const myList = JSON.parse(localStorage.getItem('myList') || '[]');
       setMyListMovies(myList);
       if (myList.length === 0) {
         setHeroMovies([]);
       } else {
         setHeroMovies([myList[myList.length - 1]]);
       }
    }
  };

  // Helper to get filtered and sorted list
  const getProcessedMyList = () => {
    let list = [...myListMovies];
    
    // Filter
    if (selectedGenre !== 'all') {
      const genreId = parseInt(selectedGenre);
      list = list.filter(m => m.genre_ids && m.genre_ids.includes(genreId));
    }

    // Sort
    switch (sortOption) {
      case 'dateDesc': 
        list.reverse(); 
        break;
      case 'dateAsc': 
        // Default order (assuming appended)
        break; 
      case 'title': 
        list.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || '')); 
        break;
      case 'rating': 
        list.sort((a, b) => b.vote_average - a.vote_average); 
        break;
      case 'year': 
        list.sort((a, b) => {
           const dA = a.release_date || a.first_air_date || '';
           const dB = b.release_date || b.first_air_date || '';
           return dB.localeCompare(dA);
        }); 
        break;
    }
    return list;
  };

  const processedMyList = currentView === 'mylist' ? getProcessedMyList() : [];
  const activeHeroMovie = heroMovies[currentHeroIndex];

  if (loading && rows.length === 0 && currentView !== 'mylist' && currentView !== 'tickets') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0f172a] text-blue-600">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-current"></div>
      </div>
    );
  }

  const getHeroTitle = (m: Movie) => m.title || m.name;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white pb-24 md:pb-20 overflow-x-hidden font-sans">
      
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

      {/* Main Content Wrapper with Animation */}
      <main key={currentView} className="animate-slideUp">
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
               <div className="flex flex-col items-center justify-center py-32 min-h-[50vh] animate-fadeIn">
                 <div className="relative w-24 h-24 mb-8">
                    {/* Pulsing Background */}
                    <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-xl animate-pulse"></div>
                    
                    {/* Rotating Rings */}
                    <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 border-r-purple-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-4 border-transparent border-t-blue-500 border-l-blue-500 rounded-full animate-spin [animation-duration:2s]"></div>
                    
                    {/* Center Icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                       <SparklesIcon className="w-8 h-8 text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                    </div>
                 </div>
                 
                 <div className="text-center space-y-2">
                    <h3 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 animate-pulse">
                      Gemini עובד על זה...
                    </h3>
                    <p className="text-slate-400 text-lg">מנתח את הבקשה שלך וסורק את מאגר הסרטים</p>
                 </div>
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
            {/* Dynamic Slideshow Hero Section */}
            {heroMovies.length > 0 && currentView !== 'tickets' && (
              <div className="relative h-[60vh] md:h-[80vh] w-full overflow-hidden" dir="rtl">
                
                {/* Background Images Layer */}
                {heroMovies.map((movie, index) => (
                  <div 
                    key={movie.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentHeroIndex ? 'opacity-100' : 'opacity-0'}`}
                  >
                    <img 
                      src={getImageUrl(movie.backdrop_path, 'original')} 
                      alt={getHeroTitle(movie)} 
                      className="h-full w-full object-cover"
                    />
                    {/* Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-black/30"></div>
                    <div className="absolute inset-0 bg-gradient-to-l from-[#0f172a] via-[#0f172a]/40 to-transparent"></div>
                  </div>
                ))}

                {/* Content Layer (Top-Right) */}
                {/* Use key to force re-animation when slide changes */}
                <div key={activeHeroMovie?.id} className="absolute top-[20%] md:top-[25%] right-[5%] md:right-[8%] max-w-2xl space-y-6 z-20 animate-fadeIn">
                   {activeHeroMovie && (
                     <>
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black drop-shadow-xl leading-tight text-white font-poppins">
                          {getHeroTitle(activeHeroMovie)}
                        </h1>
                        
                        <div className="flex items-center gap-3 text-sm font-medium text-slate-300">
                           <span className="text-green-400 font-bold">{Math.round(activeHeroMovie.vote_average * 10)}% Match</span>
                           <span>{activeHeroMovie.release_date?.split('-')[0] || activeHeroMovie.first_air_date?.split('-')[0]}</span>
                        </div>

                        <p className="text-base md:text-xl text-shadow-md line-clamp-3 text-slate-200 font-light leading-relaxed max-w-xl">
                          {activeHeroMovie.overview || "תקציר לא זמין."}
                        </p>
                        
                        <div className="flex items-center gap-4 pt-4">
                          <button 
                            onClick={() => handleMovieClick(activeHeroMovie)}
                            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-xl hover:bg-blue-500 transition text-base font-bold shadow-lg shadow-blue-900/40"
                          >
                            <PlayIcon className="w-6 h-6" />
                            <span>הזמן כרטיסים</span>
                          </button>
                          <button 
                            onClick={() => handleMovieClick(activeHeroMovie)}
                            className="flex items-center gap-2 bg-slate-500/30 text-white px-8 py-3.5 rounded-xl hover:bg-slate-500/50 transition text-base font-bold backdrop-blur-md border border-white/10"
                          >
                            <InfoIcon className="w-6 h-6" />
                            <span>מידע נוסף</span>
                          </button>
                        </div>
                     </>
                   )}
                </div>

                {/* Navigation Dots */}
                {heroMovies.length > 1 && (
                  <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex gap-3">
                    {heroMovies.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setCurrentHeroIndex(idx)}
                        className={`h-2 rounded-full transition-all duration-300 shadow-sm
                          ${idx === currentHeroIndex ? 'w-8 bg-blue-500' : 'w-2 bg-slate-400/50 hover:bg-white'}`}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MY TICKETS VIEW */}
            {currentView === 'tickets' ? (
               <div className="pt-32 px-4 md:px-12 min-h-screen" dir="rtl">
                  <h2 className="text-3xl font-black mb-8 border-b border-slate-700 pb-4">הכרטיסים שלי</h2>
                  {myTickets.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-700 border-dashed animate-fadeIn">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                            <TicketIcon className="w-10 h-10 opacity-50" />
                        </div>
                        <p className="text-2xl font-bold text-slate-300">האולם מחכה לך!</p>
                        <p className="mt-2 text-slate-500 max-w-md text-center">טרם הוזמנו כרטיסים. זה הזמן לבחור סרט, לתפוס את המושבים הטובים ביותר וליהנות מהחוויה.</p>
                        <button 
                          onClick={() => handleNavClick('home')} 
                          className="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-lg shadow-blue-900/20 transition-transform transform hover:-translate-y-1"
                        >
                          חפש סרטים להזמנה
                        </button>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {myTickets.map(ticket => (
                           <Ticket key={ticket.id} data={ticket} />
                        ))}
                     </div>
                  )}
               </div>
            ) : currentView === 'mylist' ? (
               // MY LIST VIEW WITH FILTERS
               <div className="relative z-10 -mt-12 md:-mt-20 px-4 md:px-12 pb-20 space-y-8" dir="rtl">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#0f172a]/95 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-xl">
                     <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                           <ListIcon className="w-8 h-8 text-blue-500" />
                           הרשימה שלי
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                           {processedMyList.length} כותרים נשמרו
                        </p>
                     </div>

                     <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                       {/* Sort Control */}
                       <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700 flex-1 md:flex-none">
                          <span className="text-xs text-slate-400 font-bold ml-1 whitespace-nowrap">מיון:</span>
                          <select 
                            value={sortOption} 
                            onChange={(e) => setSortOption(e.target.value)}
                            className="bg-transparent text-sm text-white font-medium focus:outline-none w-full md:w-auto"
                          >
                             <option value="dateDesc">נוסף לאחרונה</option>
                             <option value="dateAsc">הוותיק ביותר</option>
                             <option value="title">שם (א-ת)</option>
                             <option value="rating">דירוג</option>
                             <option value="year">שנת יציאה</option>
                          </select>
                       </div>

                       {/* Filter Control */}
                       <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700 flex-1 md:flex-none">
                          <span className="text-xs text-slate-400 font-bold ml-1 whitespace-nowrap">סינון:</span>
                          <select 
                            value={selectedGenre} 
                            onChange={(e) => setSelectedGenre(e.target.value)}
                            className="bg-transparent text-sm text-white font-medium focus:outline-none w-full md:w-auto max-w-[150px]"
                          >
                             <option value="all">כל הז'אנרים</option>
                             {Array.from(new Set(myListMovies.flatMap(m => m.genre_ids || []))).map((id: number) => (
                                GENRES[id] && <option key={id} value={id}>{GENRES[id]}</option>
                             ))}
                          </select>
                       </div>
                     </div>
                  </div>
                  
                  {processedMyList.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-800/20 rounded-xl border border-dashed border-slate-700">
                        {myListMovies.length === 0 ? (
                          <>
                             <ListIcon className="w-16 h-16 mb-4 opacity-30" />
                             <p className="text-xl font-bold">הרשימה שלך ריקה</p>
                             <p className="text-sm mt-1">הוסיפו סרטים וסדרות כדי לצפות בהם מאוחר יותר</p>
                          </>
                        ) : (
                          <>
                             <p className="text-xl font-bold">לא נמצאו תוצאות</p>
                             <p className="text-sm mt-1">נסו לשנות את הגדרות הסינון</p>
                          </>
                        )}
                     </div>
                  ) : (
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {processedMyList.map(movie => (
                           <MovieCard key={movie.id} movie={movie} onClick={handleMovieClick} />
                        ))}
                     </div>
                  )}
               </div>
            ) : (
              // REGULAR ROWS
              // Reduced negative margin to -mt-12 to prevent overlap
              <div className={`relative z-10 ${heroMovies.length > 0 ? '-mt-12 md:-mt-20' : 'pt-32'} space-y-12 px-4 md:px-12 pb-10`} dir="rtl">
                 {rows.map((row, index) => (
                    <Row key={index} title={row.title} movies={row.movies} variant={row.variant} onMovieClick={handleMovieClick} />
                 ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Details Modal */}
      <MovieModal 
        movie={selectedMovie} 
        onClose={() => setSelectedMovie(null)} 
        onUpdateList={refreshList}
        onActorClick={handleActorClick}
      />
      
      {/* Actor Modal */}
      {selectedActorId && (
        <ActorModal 
           actorId={selectedActorId}
           onClose={() => setSelectedActorId(null)}
           onMovieClick={handleMovieFromActorClick}
        />
      )}

      {/* Bottom Navigation for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0f172a]/95 backdrop-blur-lg border-t border-white/10 p-2 md:hidden z-50 flex justify-around items-center safe-area-pb">
        <NavButton icon={<HomeIcon className="w-6 h-6" />} label="ראשי" active={currentView === 'home'} onClick={() => handleNavClick('home')} />
        <NavButton icon={<FilmIcon className="w-6 h-6" />} label="סרטים" active={currentView === 'movies'} onClick={() => handleNavClick('movies')} />
        <NavButton icon={<TvIcon className="w-6 h-6" />} label="סדרות" active={currentView === 'tv'} onClick={() => handleNavClick('tv')} />
        <NavButton icon={<FireIcon className="w-6 h-6" />} label="חדש" active={currentView === 'new'} onClick={() => handleNavClick('new')} />
        <NavButton icon={<TicketIcon className="w-6 h-6" />} label="כרטיסים" active={currentView === 'tickets'} onClick={() => handleNavClick('tickets')} />
      </div>
      
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

// Sub-component for Mobile Nav Button
const NavButton: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 ${active ? 'text-blue-500 scale-110' : 'text-slate-500 hover:text-slate-300'}`}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

// Sub-component for Rows with Scroll Support
const Row: React.FC<{ title: string, movies: Movie[], variant?: 'ranked' | 'standard', onMovieClick: (m: Movie) => void }> = ({ title, movies, variant = 'standard', onMovieClick }) => {
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
            className={`hidden md:flex absolute top-0 bottom-0 right-0 z-40 m-auto h-full w-12 cursor-pointer bg-gradient-to-l from-transparent to-black/80 items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 ${!isMoved ? 'hidden' : ''}`}
            onClick={() => handleClick('right')}
        >
            <ChevronRightIcon className="w-8 h-8 text-white hover:scale-110 transition" />
        </div>

        <div 
            ref={rowRef}
            className="flex gap-4 overflow-x-scroll no-scrollbar scroll-smooth py-4 px-2 -mx-2 items-center"
        >
          {movies.map((movie, index) => (
            <div key={movie.id} className={`relative flex-shrink-0 ${variant === 'ranked' ? 'w-[300px] md:w-[360px]' : 'w-[120px] md:w-[150px]'}`}>
               {variant === 'ranked' ? (
                 <div className="flex items-center gap-4 group cursor-pointer" onClick={() => onMovieClick(movie)}>
                    <span className="text-[140px] font-black text-[#0f172a] opacity-80" style={{ WebkitTextStroke: '2px #475569', lineHeight: 0.8 }}>
                       {index + 1}
                    </span>
                    <div className="w-[180px] aspect-[2/3] rounded-md overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:z-10 bg-zinc-800">
                       <img
                         src={getImageUrl(movie.poster_path, 'w500')}
                         alt={movie.title}
                         className="h-full w-full object-cover"
                         loading="lazy"
                       />
                    </div>
                 </div>
               ) : (
                 <MovieCard movie={movie} onClick={onMovieClick} />
               )}
            </div>
          ))}
        </div>

        <div 
            className="hidden md:flex absolute top-0 bottom-0 left-0 z-40 m-auto h-full w-12 cursor-pointer bg-gradient-to-r from-transparent to-black/80 items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300"
            onClick={() => handleClick('left')}
        >
            <ChevronLeftIcon className="w-8 h-8 text-white hover:scale-110 transition" />
        </div>

      </div>
    </div>
  );
};

export default App;