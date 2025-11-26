import React from 'react';
import { Seat } from '../services/mockBooking';

interface SeatMapProps {
  seats: Seat[];
  onToggleSeat: (seatId: string) => void;
}

const SeatMap: React.FC<SeatMapProps> = ({ seats, onToggleSeat }) => {
  // Group seats by row for easier rendering
  const rows = Array.from(new Set(seats.map(s => s.row)));

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto p-4 overflow-x-auto no-scrollbar">
      {/* Screen Visual */}
      <div className="w-full min-w-[300px] mb-12 flex flex-col items-center">
         <div className="w-[80%] h-12 border-t-4 border-blue-500 rounded-t-[50%] shadow-[0_-10px_20px_rgba(59,130,246,0.2)] opacity-80"></div>
         <span className="text-xs text-blue-400/50 mt-2 uppercase tracking-[0.2em] font-poppins">SCREEN</span>
      </div>

      {/* Seats Grid */}
      <div className="space-y-3 min-w-[350px]">
        {rows.map(rowLabel => (
          <div key={rowLabel} className="flex items-center gap-4 justify-center">
            <span className="w-6 text-slate-500 text-xs font-mono font-bold">{rowLabel}</span>
            <div className="flex gap-2">
              {seats.filter(s => s.row === rowLabel).map(seat => (
                <button
                  key={seat.id}
                  disabled={seat.status === 'occupied'}
                  onClick={() => onToggleSeat(seat.id)}
                  title={`שורה ${seat.row} כסא ${seat.col} - ₪${seat.price}`}
                  className={`
                    w-7 h-7 sm:w-9 sm:h-9 rounded-t-lg text-[10px] flex items-center justify-center transition-all duration-200 shadow-sm
                    ${seat.status === 'occupied' 
                      ? 'bg-slate-700 cursor-not-allowed opacity-30 border border-slate-600' 
                      : seat.status === 'selected'
                        ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.6)] scale-110 -translate-y-1 z-10 border border-blue-400'
                        : seat.type === 'vip' 
                          ? 'bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-500 border border-yellow-600/50' 
                          : 'bg-slate-700/80 hover:bg-blue-600/50 hover:border-blue-500/50 text-slate-300 border border-slate-600'
                    }
                  `}
                >
                  {seat.status === 'selected' && '✓'}
                </button>
              ))}
            </div>
            <span className="w-6 text-slate-500 text-xs font-mono font-bold">{rowLabel}</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-6 mt-12 text-xs text-slate-400 bg-slate-800/50 p-4 rounded-full border border-slate-700 min-w-[300px]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-t-md bg-slate-700 border border-slate-600"></div>
          <span>רגיל (45₪)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-t-md bg-yellow-600/20 border border-yellow-600/50"></div>
          <span>VIP (75₪)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-t-md bg-blue-500 border border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
          <span>נבחר</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-t-md bg-slate-700 opacity-30"></div>
          <span>תפוס</span>
        </div>
      </div>
    </div>
  );
};

export default SeatMap;