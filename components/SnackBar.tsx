import React from 'react';
import { SNACKS, Snack, formatPrice } from '../services/mockBooking';
import { PlusIcon, MinusIcon, PopcornIcon } from './Icons';

interface SnackBarProps {
  quantities: Record<string, number>;
  onUpdate: (snackId: string, delta: number) => void;
}

const SnackBar: React.FC<SnackBarProps> = ({ quantities, onUpdate }) => {
  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-6">
         <PopcornIcon className="w-12 h-12 mx-auto text-yellow-500 mb-2" />
         <h3 className="text-xl font-bold">מזנון הקולנוע</h3>
         <p className="text-sm text-gray-400">שדרגו את הצפייה עם נשנושים (איסוף בקופה)</p>
      </div>

      <div className="space-y-4">
        {SNACKS.map(snack => {
          const qty = quantities[snack.id] || 0;
          return (
            <div key={snack.id} className="flex items-center justify-between bg-[#252525] p-3 rounded-lg border border-gray-700">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-xl">
                    {snack.icon === 'popcorn' ? '🍿' : snack.icon === 'drink' ? '🥤' : '🧀'}
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{snack.name}</p>
                    <p className="text-xs text-yellow-500">{formatPrice(snack.price)}</p>
                  </div>
               </div>

               <div className="flex items-center gap-3 bg-black/40 rounded-full px-2 py-1">
                 <button 
                   onClick={() => onUpdate(snack.id, -1)}
                   disabled={qty === 0}
                   className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                 >
                   <MinusIcon className="w-4 h-4" />
                 </button>
                 <span className="w-4 text-center text-sm font-bold">{qty}</span>
                 <button 
                   onClick={() => onUpdate(snack.id, 1)}
                   className="p-1 text-gray-400 hover:text-white"
                 >
                   <PlusIcon className="w-4 h-4" />
                 </button>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SnackBar;