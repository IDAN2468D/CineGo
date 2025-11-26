export interface Movie {
  id: number;
  title?: string;     // Movies use title
  name?: string;      // TV shows use name
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  profile_path?: string | null; // For people/actors
  release_date?: string; // Movies
  first_air_date?: string; // TV
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  media_type?: 'movie' | 'tv' | 'person';
}

export interface MovieResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface CreditsResponse {
  id: number;
  cast: CastMember[];
}

export interface PersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
}

export interface PersonCredits {
  id: number;
  cast: Movie[];
}

export interface Video {
  key: string;
  site: string;
  type: string;
  name: string;
  official: boolean;
}

export interface VideoResponse {
  id: number;
  results: Video[];
}

export interface Review {
  id: string;
  author: string;
  content: string;
  created_at: string;
  url: string;
}

export interface ReviewResponse {
  id: number;
  page: number;
  results: Review[];
  total_pages: number;
  total_results: number;
}

export interface TicketData {
  id: string;
  movieId: number;
  movieTitle: string;
  posterPath: string | null;
  backdropPath: string | null;
  showtime: {
    date: string;
    time: string;
    hall: string;
    tech?: string;
  };
  seats: {
    row: string;
    col: number;
    price: number;
  }[];
  totalPrice: number;
  purchaseDate: string;
}

export const GENRES: Record<number, string> = {
  28: 'פעולה',
  12: 'הרפתקאות',
  16: 'אנימציה',
  35: 'קומדיה',
  80: 'פשע',
  99: 'דוקומנטרי',
  18: 'דרמה',
  10751: 'משפחה',
  14: 'פנטזיה',
  36: 'היסטוריה',
  27: 'אימה',
  10402: 'מוזיקה',
  9648: 'מסתורין',
  10749: 'רומנטיקה',
  878: 'מדע בדיוני',
  10770: 'סרט טלוויזיה',
  53: 'מתח',
  10752: 'מלחמה',
  37: 'מערבון',
  10759: 'פעולה והרפתקאות',
  10762: 'ילדים',
  10763: 'חדשות',
  10764: 'ריאליטי',
  10765: 'מדע בדיוני ופנטזיה',
  10766: 'אופרת סבון',
  10767: 'טוק שואו',
  10768: 'מלחמה ופוליטיקה',
};