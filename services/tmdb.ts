import { MovieResponse, Movie, CreditsResponse, VideoResponse, ReviewResponse, PersonDetails, PersonCredits } from '../types';

// Credentials provided by user or environment
const API_READ_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN || "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwMTQ5NTY1MGZkZjQyODVlMWRkODkwZmI2NzE3YTkzNSIsIm5iZiI6MTcwNjQzNjE2MS4zOTMsInN1YiI6IjY1YjYyNjQxYjExMzFmMDE0OTI5OWE2NyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.ONIiTtadCHzUtheCo7j4Xe6OKdhfsPs24FpFoash90U";

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

const headers = {
  accept: 'application/json',
  Authorization: `Bearer ${API_READ_ACCESS_TOKEN}`
};

export const getImageUrl = (path: string | null, size: 'original' | 'w500' = 'w500') => {
  if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

const fetchFromTMDB = async <T>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const query = new URLSearchParams({
    language: 'he-IL', // Hebrew support
    ...params
  }).toString();

  const response = await fetch(`${BASE_URL}${endpoint}?${query}`, { headers });
  
  if (!response.ok) {
    throw new Error(`Error fetching data: ${response.statusText}`);
  }
  
  return response.json();
};

export const tmdbService = {
  // Movies
  getTrending: () => fetchFromTMDB<MovieResponse>('/trending/movie/week'),
  getPopular: () => fetchFromTMDB<MovieResponse>('/movie/popular'),
  getTopRated: () => fetchFromTMDB<MovieResponse>('/movie/top_rated'),
  getUpcoming: () => fetchFromTMDB<MovieResponse>('/movie/upcoming'),
  
  // Specific Genres (for Movies tab)
  getActionMovies: () => fetchFromTMDB<MovieResponse>('/discover/movie', { with_genres: '28' }),
  getComedyMovies: () => fetchFromTMDB<MovieResponse>('/discover/movie', { with_genres: '35' }),
  getDramaMovies: () => fetchFromTMDB<MovieResponse>('/discover/movie', { with_genres: '18' }),
  getHorrorMovies: () => fetchFromTMDB<MovieResponse>('/discover/movie', { with_genres: '27' }),

  // TV Shows
  getTrendingTV: () => fetchFromTMDB<MovieResponse>('/trending/tv/week'),
  getPopularTV: () => fetchFromTMDB<MovieResponse>('/tv/popular'),
  getTopRatedTV: () => fetchFromTMDB<MovieResponse>('/tv/top_rated'),
  getOnTheAirTV: () => fetchFromTMDB<MovieResponse>('/tv/on_the_air'),

  // General
  searchMovies: (query: string, page: number = 1) => fetchFromTMDB<MovieResponse>('/search/multi', { query, page: page.toString() }), // Changed to multi search with pagination
  getSimilar: (id: number) => fetchFromTMDB<MovieResponse>(`/movie/${id}/similar`),

  // Details
  getCredits: (id: number, type: 'movie' | 'tv' = 'movie') => fetchFromTMDB<CreditsResponse>(`/${type}/${id}/credits`),
  getVideos: (id: number, type: 'movie' | 'tv' = 'movie') => fetchFromTMDB<VideoResponse>(`/${type}/${id}/videos`, { language: 'en-US' }), // Videos often default to English if Hebrew missing
  getReviews: (id: number, type: 'movie' | 'tv' = 'movie') => fetchFromTMDB<ReviewResponse>(`/${type}/${id}/reviews`),

  // People
  getPersonDetails: (id: number) => fetchFromTMDB<PersonDetails>(`/person/${id}`),
  getPersonCredits: (id: number) => fetchFromTMDB<PersonCredits>(`/person/${id}/combined_credits`),
};