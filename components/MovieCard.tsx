import React from 'react';
import { Movie, GENRES } from '../types';
import { getImageUrl } from '../services/tmdb';
import { StarIcon } from './Icons';

interface MovieCardProps {
  movie: Movie;
  onClick: (movie: Movie) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onClick }) => {
  // Get first genre name if available
  const genre = movie.genre_ids.length > 0 ? GENRES[movie.genre_ids[0]] : 'כללי';
  
  // Handle differences between Movie and TV objects
  const title = movie.title || movie.name;
  const date = movie.release_date || movie.first_air_date;
  const year = date ? date.split('-')[0] : 'N/A';

  return (
    <div 
      className="group relative cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-10"
      onClick={() => onClick(movie)}
    >
      <div className="aspect-[2/3] w-full overflow-hidden rounded-md bg-zinc-800">
        <img
          src={getImageUrl(movie.poster_path, 'w500')}
          alt={title}
          className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
          loading="lazy"
        />
        
        {/* Rating Badge */}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1">
          <StarIcon className="w-3 h-3 text-yellow-500" />
          <span className="text-xs font-bold">{movie.vote_average.toFixed(1)}</span>
        </div>
      </div>

      <div className="mt-2">
        <h3 className="text-sm font-medium text-white truncate text-right" dir="rtl">{title}</h3>
        <div className="flex items-center justify-between text-xs text-gray-400 mt-1" dir="rtl">
          <span>{year}</span>
          <span>{genre}</span>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;