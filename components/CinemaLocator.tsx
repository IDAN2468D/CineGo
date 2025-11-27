import React, { useState, useEffect, useRef } from 'react';
import { geminiService } from '../services/gemini';
import { SearchIcon, MapIcon, LocationIcon, SparklesIcon, CheckIcon } from './Icons';

// Define available filters
const FILTERS = [
  { id: 'imax', label: 'IMAX', icon: '🎬' },
  { id: 'vip', label: 'VIP', icon: '👑' },
  { id: '3d', label: '3D', icon: '👓' },
  { id: 'parking', label: 'חניה', icon: '🅿️' },
  { id: 'accessible', label: 'נגישות', icon: '♿' },
  { id: 'snacks', label: 'מזנון עשיר', icon: '🍿' }
];

// High quality cinema fallback images (Verified URLs)
const CINEMA_IMAGES = [
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80', // Movie Projector
  'https://images.unsplash.com/photo-1517604931442-710c8ef5ad25?auto=format&fit=crop&w=800&q=80', // Audience in theater
  'https://images.unsplash.com/photo-1595769816263-9b910be24d5f?auto=format&fit=crop&w=800&q=80', // Red seats
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80', // Empty theater
  'https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&w=800&q=80', // Cinema exterior
  'https://images.unsplash.com/photo-1586899028174-e7098604235b?auto=format&fit=crop&w=800&q=80', // Popcorn
  'https://images.unsplash.com/photo-1513106580091-1d82408b8638?auto=format&fit=crop&w=800&q=80', // Neon Cinema Sign
  'https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?auto=format&fit=crop&w=800&q=80', // Wide audience shot
];

const CinemaLocator: React.FC = () => {
  const [query, setQuery] = useState('בתי קולנוע מומלצים בישראל');
  const [results, setResults] = useState<{ text: string; chunks: any[] } | null>(null);
  const [processedChunks, setProcessedChunks] = useState<any[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  useEffect(() => {
    handleSearch();
  }, []);

  // 1. Initialize Map Instance (Run once)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current || !(window as any).L) return;

    try {
        const L = (window as any).L;
        
        // Initialize map
        const map = L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: false
        }).setView([31.5, 34.75], 8);
        
        mapInstanceRef.current = map;

        // Add zoom control
        L.control.zoom({ position: 'topleft' }).addTo(map);
        
        // Dark Matter Tile Layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        // Create a LayerGroup for markers to easily clear them later
        const markersLayer = L.layerGroup().addTo(map);
        markersLayerRef.current = markersLayer;

        // Force a resize calculation after a short delay to ensure correct rendering
        setTimeout(() => {
           map.invalidateSize();
        }, 100);

    } catch (error) {
        console.error("Error initializing map:", error);
    }

    // Cleanup on unmount
    return () => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
            markersLayerRef.current = null;
        }
    };
  }, []); // Empty dependency array - run once

  // 2. Enrich Results with Mock Features
  useEffect(() => {
    if (results?.chunks) {
      // Since real API doesn't return these specific tags, we mock them for the demo
      // to make the filtering feature functional and demonstrable.
      const enriched = results.chunks.map(chunk => {
         // Determine features based on some randomness + simple heuristics
         const features = FILTERS.filter(f => {
            // Give 40% chance for each feature to be present
            return Math.random() > 0.6; 
         }).map(f => f.id);
         
         // Ensure at least one feature
         if (features.length === 0) features.push(FILTERS[0].id);

         return {
            ...chunk,
            features
         };
      });
      setProcessedChunks(enriched);
    } else {
      setProcessedChunks([]);
    }
  }, [results]);

  // Derived filtered state
  const filteredChunks = processedChunks.filter(chunk => {
      if (activeFilters.length === 0) return true;
      return activeFilters.every(filter => chunk.features.includes(filter));
  });

  // Helper to get consistent random image
  const getCinemaImage = (title: string, apiPhotoUri?: string) => {
    if (apiPhotoUri) return apiPhotoUri;
    
    // Deterministic hash based on title
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % CINEMA_IMAGES.length;
    return CINEMA_IMAGES[index];
  };

  // 3. Update Markers when Filtered Results Change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !(window as any).L) return;

    const L = (window as any).L;
    const markersLayer = markersLayerRef.current;
    
    // Clear existing markers
    markersLayer.clearLayers();

    const bounds: any[] = [];

    // Use filteredChunks instead of raw results
    filteredChunks.forEach((chunk) => {
        const mapData = chunk.maps || chunk.web;
        if (!mapData) return;

        // Robust coordinate extraction
        const lat = mapData.center?.latitude || mapData.location?.latitude;
        const lng = mapData.center?.longitude || mapData.location?.longitude;

        if (lat && lng) {
            const title = mapData.title || "קולנוע";
            const address = mapData.address || "כתובת לא זמינה";
            const rating = mapData.rating;
            
            const imgUrl = getCinemaImage(title, mapData.photos?.[0]?.image?.uri);
            const fallbackImg = CINEMA_IMAGES[0];

            const uri = mapData.uri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}`;

            // Custom Pulsing Icon
            const customIcon = L.divIcon({
                className: 'custom-div-icon', // Empty class
                html: `
                  <div class="relative flex items-center justify-center w-10 h-10 group cursor-pointer -translate-x-1/2 -translate-y-1/2">
                    <div class="absolute w-full h-full bg-blue-500/30 rounded-full animate-ping"></div>
                    <div class="relative w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-[0_0_15px_rgba(59,130,246,1)] transition-transform duration-300 group-hover:scale-125 z-10"></div>
                  </div>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                popupAnchor: [0, -20]
            });

            // Feature badges HTML for popup
            const featureBadges = chunk.features.slice(0, 4).map((fid: string) => {
                const f = FILTERS.find(filter => filter.id === fid);
                return f ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-700/80 border border-slate-600 text-[9px] text-slate-200"><span>${f.icon}</span> ${f.label}</span>` : '';
            }).join('');

            // Rich Popup Content
            const popupContent = `
                <div class="font-heebo text-right w-full" dir="rtl">
                    <!-- Image Header -->
                    <div class="relative h-32 w-full overflow-hidden">
                         <img src="${imgUrl}" class="w-full h-full object-cover" alt="${title}" onerror="this.onerror=null;this.src='${fallbackImg}'" />
                         <div class="absolute inset-0 bg-gradient-to-t from-[#1e293b] to-transparent opacity-90"></div>
                         <div class="absolute bottom-3 right-3 text-white">
                            <h3 class="font-bold text-base leading-tight drop-shadow-md">${title}</h3>
                         </div>
                    </div>
                    
                    <!-- Content -->
                    <div class="p-4 pt-3">
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex items-start gap-1.5 text-xs text-slate-300 w-3/4">
                               <span class="mt-0.5">📍</span>
                               <span class="leading-tight">${address}</span>
                            </div>
                            ${rating ? `
                              <div class="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1.5 py-0.5 rounded text-xs font-bold whitespace-nowrap">
                                ★ ${rating}
                              </div>
                            ` : ''}
                        </div>

                        <!-- Amenities -->
                        <div class="mb-4">
                            <p class="text-[9px] text-slate-500 uppercase font-bold mb-1.5 tracking-wider">שירותים זמינים</p>
                            <div class="flex flex-wrap gap-1.5">
                                 ${featureBadges}
                            </div>
                        </div>

                        <!-- Action Button -->
                        <a href="${uri}" target="_blank" class="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-lg transition shadow-lg shadow-blue-500/20 no-underline">
                            <span>🚗</span>
                            נווט לקולנוע
                        </a>
                    </div>
                </div>
            `;

            const marker = L.marker([lat, lng], { icon: customIcon })
                .bindPopup(popupContent);
            
            markersLayer.addLayer(marker);
            bounds.push([lat, lng]);
        }
    });

    // Adjust map view to fit markers
    if (bounds.length > 0) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

  }, [filteredChunks]); 

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults(null);
    try {
      const data = await geminiService.findPlaces(query);
      setResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const toggleFilter = (filterId: string) => {
    setActiveFilters(prev => 
        prev.includes(filterId) 
            ? prev.filter(id => id !== filterId)
            : [...prev, filterId]
    );
  };

  const flyToLocation = (chunk: any) => {
      const mapData = chunk.maps || chunk.web;
      const lat = mapData?.center?.latitude || mapData?.location?.latitude;
      const lng = mapData?.center?.longitude || mapData?.location?.longitude;
      
      if (lat && lng && mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 15, {
              duration: 1.5
          });
      }
  };

  return (
    <div className="pt-32 px-4 md:px-12 min-h-screen text-right font-poppins pb-20" dir="rtl">
      
      {/* Header & Search */}
      <div className="max-w-3xl mx-auto text-center mb-8">
        <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
          מצא את הקולנוע הקרוב <span className="text-blue-500">אליך</span>
        </h2>
        
        <div className="relative group max-w-xl mx-auto mb-6">
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition duration-700"></div>
            <div className="relative flex items-center bg-slate-800 border border-slate-700 rounded-full px-4 py-3 shadow-2xl focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/50 transition">
                <input 
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="חפש מיקום (למשל: סינמה סיטי גלילות)"
                    className="flex-1 bg-transparent border-none focus:outline-none text-white placeholder-slate-500 px-2"
                />
                <button 
                    onClick={handleSearch}
                    disabled={loading}
                    className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition disabled:opacity-50"
                >
                    {loading ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div> : <SearchIcon className="w-5 h-5" />}
                </button>
            </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            {FILTERS.map(filter => {
                const isActive = activeFilters.includes(filter.id);
                return (
                    <button
                        key={filter.id}
                        onClick={() => toggleFilter(filter.id)}
                        className={`
                            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border
                            ${isActive 
                                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/25' 
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white'}
                        `}
                    >
                        <span>{filter.icon}</span>
                        <span>{filter.label}</span>
                        {isActive && <CheckIcon className="w-3 h-3" />}
                    </button>
                );
            })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto h-full">
        <div className="flex flex-col lg:flex-row gap-8 h-full">
            
            {/* Left Side: Results List & AI Text */}
            <div className="lg:w-1/3 flex flex-col gap-6 order-2 lg:order-1 h-[600px] overflow-y-auto custom-scrollbar pr-2">
                
                {/* AI Response or Loading State */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-4 bg-slate-800/30 rounded-3xl border border-dashed border-slate-700">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-blue-400 font-bold animate-pulse text-sm">סורק מיקומים...</p>
                    </div>
                ) : results ? (
                    <>
                        <div className="bg-slate-800/50 rounded-3xl p-6 border border-slate-700 shrink-0">
                            <div className="flex items-center gap-2 mb-3 text-purple-400 font-bold">
                                <SparklesIcon className="w-5 h-5" />
                                <span>המלצות Gemini</span>
                            </div>
                            <div className="text-slate-200 leading-relaxed whitespace-pre-wrap text-sm">
                                {results.text}
                            </div>
                        </div>

                        {/* Filter Summary */}
                        {activeFilters.length > 0 && (
                            <div className="text-xs text-slate-400 px-2">
                                נמצאו {filteredChunks.length} תוצאות התואמות את הסינון
                            </div>
                        )}

                        {/* Cards */}
                        <div className="space-y-4">
                             {filteredChunks.length === 0 && !loading && results && (
                                <div className="text-center py-8 text-slate-500 bg-slate-800/20 rounded-xl border border-slate-700/50 border-dashed">
                                    <p>לא נמצאו בתי קולנוע עם הסינון שנבחר.</p>
                                    <button onClick={() => setActiveFilters([])} className="text-blue-500 text-sm font-bold mt-2 hover:underline">נקה סינון</button>
                                </div>
                             )}

                             {filteredChunks.map((chunk, idx) => {
                                 const mapData = chunk.maps || chunk.web;
                                 if (!mapData) return null;
                                 
                                 const title = mapData.title || "מיקום ללא שם";
                                 const address = mapData.address || "כתובת לא זמינה";
                                 const uri = mapData.uri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}`;
                                 const hasCoords = (mapData?.center?.latitude || mapData?.location?.latitude) ? true : false;
                                 
                                 const imgUrl = getCinemaImage(title, mapData.photos?.[0]?.image?.uri);
                                 const fallbackImg = CINEMA_IMAGES[0];
                                 
                                 return (
                                    <div 
                                      key={idx} 
                                      onClick={() => hasCoords && flyToLocation(chunk)}
                                      className={`bg-slate-800 rounded-xl overflow-hidden border border-slate-700 transition-all group flex flex-col
                                        ${hasCoords ? 'cursor-pointer hover:bg-slate-750 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'opacity-80'}`}
                                    >
                                        <div className="h-32 w-full overflow-hidden relative">
                                            <img 
                                            src={imgUrl} 
                                            alt={title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = fallbackImg;
                                            }} 
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                                            
                                            {/* Features Overlay */}
                                            <div className="absolute bottom-2 right-2 flex gap-1">
                                                {chunk.features.slice(0, 3).map((fid: string) => {
                                                    const f = FILTERS.find(x => x.id === fid);
                                                    return f ? <span key={fid} className="text-[10px] bg-black/60 backdrop-blur text-white px-1.5 py-0.5 rounded border border-white/10">{f.label}</span> : null;
                                                })}
                                            </div>
                                        </div>
                                        
                                        <div className="p-4">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-white mb-1">{title}</h4>
                                                {hasCoords && <MapIcon className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition" />}
                                            </div>
                                            <p className="text-xs text-slate-400 mb-3 line-clamp-1">{address}</p>
                                            <div className="flex items-center justify-between">
                                                {mapData.rating && (
                                                    <div className="text-xs text-yellow-500 flex items-center gap-1">
                                                        ★ <span className="font-bold">{mapData.rating}</span>
                                                    </div>
                                                )}
                                                <a 
                                                    href={uri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-1 rounded-lg"
                                                >
                                                    <LocationIcon className="w-3 h-3" />
                                                    פתח במפות
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                 );
                             })}
                        </div>
                    </>
                ) : null}
            </div>

            {/* Right Side: Map */}
            <div className="lg:w-2/3 h-[400px] lg:h-[600px] rounded-3xl overflow-hidden border border-slate-700 shadow-2xl relative order-1 lg:order-2 group/map">
                {/* Always render map container */}
                <div ref={mapContainerRef} className="w-full h-full bg-slate-900 z-0" />
                
                <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur text-xs px-3 py-1 rounded-full border border-slate-700 z-[400] text-slate-400 shadow-lg pointer-events-none">
                    Map View
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default CinemaLocator;