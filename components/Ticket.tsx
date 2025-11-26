import React from 'react';
import { TicketData } from '../types';
import { formatPrice } from '../services/mockBooking';
import { getImageUrl } from '../services/tmdb';

interface TicketProps {
  data: TicketData;
}

const Ticket: React.FC<TicketProps> = ({ data }) => {
  return (
    <div className="animate-scaleIn w-full max-w-sm mx-auto rounded-3xl overflow-hidden shadow-2xl relative bg-white text-slate-900">
      
      {/* Top Section: Movie Image & Gradient */}
      <div className="relative h-48">
         <div className="absolute inset-0">
            <img 
               src={getImageUrl(data.backdropPath || data.posterPath, 'original')} 
               alt={data.movieTitle} 
               className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 to-transparent mix-blend-multiply"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
         </div>
         <div className="absolute bottom-4 right-4 left-4 text-right">
            <h2 className="text-2xl font-black text-white leading-none drop-shadow-md font-poppins mb-1">{data.movieTitle}</h2>
            <p className="text-blue-200 text-sm font-medium tracking-wide">{data.showtime.tech || 'CINEMA'}</p>
         </div>
      </div>

      {/* Ticket Body */}
      <div className="px-6 py-6 bg-white relative">
         {/* Tear Circles */}
         <div className="absolute -top-3 -left-3 w-6 h-6 bg-[#181818] rounded-full z-10" />
         <div className="absolute -top-3 -right-3 w-6 h-6 bg-[#181818] rounded-full z-10" />

         <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-6" dir="rtl">
            <div>
               <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">תאריך</p>
               <p className="font-poppins font-bold text-lg text-slate-800">{data.showtime.date}</p>
            </div>
            <div>
               <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">שעה</p>
               <p className="font-poppins font-bold text-lg text-slate-800">{data.showtime.time}</p>
            </div>
             <div>
               <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">אולם</p>
               <p className="font-poppins font-bold text-lg text-slate-800">{data.showtime.hall}</p>
            </div>
            <div>
               <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">מושבים</p>
               <p className="font-poppins font-bold text-lg text-blue-600">
                  {data.seats.map(s => `${s.row}${s.col}`).join(', ')}
               </p>
            </div>
         </div>

         {/* Barcode Area */}
         <div className="border-t-2 border-dashed border-slate-200 pt-6 flex flex-col items-center">
            <div className="h-10 flex gap-0.5 opacity-80 mb-2">
                {[...Array(40)].map((_, i) => (
                    <div key={i} className={`h-full bg-slate-900 ${Math.random() > 0.5 ? 'w-1' : 'w-0.5'}`} />
                ))}
            </div>
            <p className="font-mono text-xs text-slate-400 tracking-[0.2em]">{data.id}</p>
         </div>
      </div>

      {/* Footer / Punchout */}
      <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center px-6">
         <span className="text-xs font-bold text-slate-400">TOTAL PAID</span>
         <span className="font-poppins font-black text-xl text-slate-900">{formatPrice(data.totalPrice)}</span>
      </div>
    </div>
  );
};

export default Ticket;