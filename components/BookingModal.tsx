import React, { useState, useEffect } from 'react';
import { Movie, TicketData } from '../types';
import { CloseIcon, TicketIcon, PopcornIcon, ChevronRightIcon, ChevronLeftIcon, CreditCardIcon, CheckIcon, CalendarIcon } from './Icons';
import { generateShowtimes, generateSeatMap, formatPrice, saveTicket, Showtime, Seat, SNACKS } from '../services/mockBooking';
import SeatMap from './SeatMap';
import Ticket from './Ticket';
import SnackBar from './SnackBar';

interface BookingModalProps {
  movie: Movie;
  onClose: () => void;
}

type Step = 'showtime' | 'seats' | 'snacks' | 'payment' | 'ticket';

const BookingModal: React.FC<BookingModalProps> = ({ movie, onClose }) => {
  const [step, setStep] = useState<Step>('showtime');
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [snackQuantities, setSnackQuantities] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);

  // Initial Load
  useEffect(() => {
    setShowtimes(generateShowtimes(movie.id));
  }, [movie]);

  // Generate seats when a time is picked
  useEffect(() => {
    if (selectedShowtime) {
      setSeats(generateSeatMap(selectedShowtime.id));
    }
  }, [selectedShowtime]);

  const handleShowtimeSelect = (st: Showtime) => {
    setSelectedShowtime(st);
    setStep('seats');
  };

  const handleSeatToggle = (seatId: string) => {
    setSeats(prev => prev.map(s => {
      if (s.id === seatId) {
        return { ...s, status: s.status === 'selected' ? 'available' : 'selected' };
      }
      return s;
    }));
  };

  const handleSnackUpdate = (snackId: string, delta: number) => {
    setSnackQuantities(prev => {
      const current = prev[snackId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [snackId]: next };
    });
  };

  const selectedSeats = seats.filter(s => s.status === 'selected');
  const seatsPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);
  
  const snacksPrice = Object.entries(snackQuantities).reduce((sum, [id, qty]) => {
     const snack = SNACKS.find(s => s.id === id);
     return sum + (snack ? snack.price * Number(qty) : 0);
  }, 0);

  const totalPrice = seatsPrice + snacksPrice;
  const title = movie.title || movie.name || 'Movie';

  const handlePayment = () => {
    if (!selectedShowtime) return;
    setIsProcessing(true);
    
    // Simulate API call
    setTimeout(() => {
      const newTicket: TicketData = {
        id: Math.random().toString(36).substr(2, 9).toUpperCase(),
        movieId: movie.id,
        movieTitle: title,
        posterPath: movie.poster_path,
        backdropPath: movie.backdrop_path,
        showtime: {
           date: selectedShowtime.date,
           time: selectedShowtime.time,
           hall: selectedShowtime.hallName,
           tech: selectedShowtime.technology
        },
        seats: selectedSeats.map(s => ({ row: s.row, col: s.col, price: s.price })),
        totalPrice: totalPrice,
        purchaseDate: new Date().toISOString()
      };
      
      saveTicket(newTicket);
      setTicketData(newTicket);
      setIsProcessing(false);
      setStep('ticket');
    }, 2000);
  };

  const renderStepIndicator = () => {
     const steps = [
        { id: 'showtime', label: 'זמן' },
        { id: 'seats', label: 'מושבים' },
        { id: 'snacks', label: 'מזנון' },
        { id: 'payment', label: 'תשלום' },
        { id: 'ticket', label: 'כרטיס' },
     ];
     const currentIndex = steps.findIndex(s => s.id === step);

     return (
        <div className="flex items-center justify-center gap-2 mb-8" dir="rtl">
           {steps.map((s, idx) => (
              <div key={s.id} className="flex items-center">
                 <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300
                    ${idx < currentIndex ? 'bg-blue-500 text-white' : idx === currentIndex ? 'bg-white text-blue-600 shadow-lg scale-110' : 'bg-slate-700 text-slate-500'}
                 `}>
                    {idx < currentIndex ? <CheckIcon className="w-4 h-4" /> : idx + 1}
                 </div>
                 {idx < steps.length - 1 && (
                    <div className={`w-6 h-0.5 mx-1 ${idx < currentIndex ? 'bg-blue-500' : 'bg-slate-700'}`}></div>
                 )}
              </div>
           ))}
        </div>
     );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md transition-all font-poppins" dir="rtl">
      <div className="relative w-full max-w-4xl bg-[#0f172a] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] border border-slate-700">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#1e293b]/50">
           <div>
               <h2 className="text-xl font-bold text-white tracking-wide">רכישת כרטיסים</h2>
               <p className="text-sm text-blue-400 font-medium mt-1">{title}</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition text-slate-400 hover:text-white">
             <CloseIcon className="w-6 h-6" />
           </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative">
          
          {renderStepIndicator()}
          
          {/* STEP 1: SELECT SHOWTIME */}
          {step === 'showtime' && (
            <div className="animate-fadeIn max-w-3xl mx-auto">
              <h3 className="text-2xl font-bold mb-6 text-center text-white">מתי תרצו לצפות?</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {showtimes.map(st => (
                  <button
                    key={st.id}
                    onClick={() => handleShowtimeSelect(st)}
                    className="flex flex-col items-center p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-blue-500 hover:bg-slate-800 transition group text-center relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition"></div>
                    <span className="font-black text-2xl text-white group-hover:text-blue-400 font-poppins">{st.time}</span>
                    <span className="text-xs text-slate-400 mt-2 font-medium">{st.date}</span>
                    <div className="mt-3 flex items-center gap-2">
                       <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 font-bold">{st.hallName}</span>
                       {st.technology && <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900/30 text-blue-300 font-bold border border-blue-500/20">{st.technology}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: SELECT SEATS */}
          {step === 'seats' && selectedShowtime && (
            <div className="animate-fadeIn w-full">
               <div className="flex justify-between items-center mb-6 px-4">
                 <button onClick={() => setStep('showtime')} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition">
                   <ChevronRightIcon className="w-4 h-4" /> חזרה לזמנים
                 </button>
                 <div className="text-center">
                   <span className="flex items-center gap-2 font-bold text-white text-lg justify-center">
                      <CalendarIcon className="w-5 h-5 text-blue-500" />
                      {selectedShowtime.time}
                   </span>
                   <span className="text-xs text-slate-500 uppercase tracking-widest">{selectedShowtime.date}</span>
                 </div>
              </div>
              
              <SeatMap seats={seats} onToggleSeat={handleSeatToggle} />

              <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#1e293b] border-t border-slate-700 flex justify-between items-center max-w-4xl mx-auto rounded-t-2xl z-50">
                 <div className="flex flex-col">
                    <span className="text-slate-400 text-xs uppercase tracking-wider">סה"כ לתשלום</span>
                    <span className="text-2xl font-black text-white">{formatPrice(seatsPrice)}</span>
                 </div>
                 <button 
                  disabled={selectedSeats.length === 0}
                  onClick={() => setStep('snacks')}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  המשך <ChevronLeftIcon className="w-4 h-4" />
                </button>
              </div>
              {/* Spacer for fixed bottom bar */}
              <div className="h-24"></div>
            </div>
          )}

          {/* STEP 3: SNACKS */}
          {step === 'snacks' && (
            <div className="animate-fadeIn">
               <button onClick={() => setStep('seats')} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-6">
                   <ChevronRightIcon className="w-4 h-4" /> חזרה למושבים
               </button>
               
               <SnackBar quantities={snackQuantities} onUpdate={handleSnackUpdate} />

               <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#1e293b] border-t border-slate-700 flex justify-between items-center max-w-4xl mx-auto rounded-t-2xl z-50">
                  <div className="flex gap-8">
                     <div>
                        <span className="text-slate-400 text-xs uppercase">כרטיסים</span>
                        <span className="block font-bold text-white">{formatPrice(seatsPrice)}</span>
                     </div>
                     <div>
                        <span className="text-slate-400 text-xs uppercase">מזנון</span>
                        <span className="block font-bold text-yellow-500">{formatPrice(snacksPrice)}</span>
                     </div>
                  </div>
                  <button 
                    onClick={() => setStep('payment')}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2"
                  >
                    לתשלום <ChevronLeftIcon className="w-4 h-4" />
                  </button>
              </div>
              <div className="h-24"></div>
            </div>
          )}

          {/* STEP 4: PAYMENT */}
          {step === 'payment' && (
            <div className="animate-fadeIn max-w-md mx-auto">
              <h3 className="text-2xl font-bold mb-8 text-center text-white">סיכום ותשלום</h3>
              
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="relative">
                     <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                     <div className="absolute inset-0 flex items-center justify-center">
                        <CreditCardIcon className="w-6 h-6 text-blue-600" />
                     </div>
                  </div>
                  <p className="text-blue-400 animate-pulse mt-6 font-bold">מאשר עסקה...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Order Summary Card */}
                  <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-700">
                       <div>
                          <h4 className="font-bold text-white text-lg">{title}</h4>
                          <p className="text-slate-400 text-sm">{selectedShowtime?.date} • {selectedShowtime?.time}</p>
                       </div>
                       <div className="text-right">
                          <span className="block font-black text-2xl text-white">{formatPrice(totalPrice)}</span>
                       </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-slate-300">
                         <span>{selectedSeats.length} x מושבים</span>
                         <span>{formatPrice(seatsPrice)}</span>
                      </div>
                      <div className="text-xs text-slate-500 pr-4">
                         {selectedSeats.map(s => `שורה ${s.row} כסא ${s.col}`).join(', ')}
                      </div>
                      
                      {snacksPrice > 0 && (
                        <div className="flex justify-between text-yellow-500 pt-2">
                           <span>תוספות מזנון</span>
                           <span>{formatPrice(snacksPrice)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Form */}
                  <div className="space-y-4">
                    <div className="relative">
                       <CreditCardIcon className="absolute right-4 top-3.5 w-5 h-5 text-slate-400" />
                       <input type="text" placeholder="מספר כרטיס אשראי" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 pr-12 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" />
                    </div>
                    <div className="flex gap-4">
                      <input type="text" placeholder="תוקף (MM/YY)" className="w-1/2 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm focus:border-blue-500 outline-none transition text-center" />
                      <input type="text" placeholder="CVV" className="w-1/2 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm focus:border-blue-500 outline-none transition text-center" />
                    </div>
                  </div>

                  <button 
                     onClick={handlePayment} 
                     className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl shadow-lg shadow-blue-900/30 transition transform hover:scale-[1.02] flex items-center justify-center gap-2 mt-4"
                  >
                     <CheckIcon className="w-5 h-5" />
                     בצע תשלום מאובטח
                  </button>
                  
                  <button onClick={() => setStep('snacks')} className="w-full py-3 text-slate-400 hover:text-white text-sm">
                      ביטול וחזרה
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: TICKET */}
          {step === 'ticket' && ticketData && (
            <div className="flex flex-col items-center animate-fadeIn pb-10">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-900/20">
                 <CheckIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-black text-white mb-2 font-poppins">איזה כיף!</h3>
              <p className="text-slate-400 text-sm mb-8">הכרטיסים שלך נשמרו באזור האישי.</p>
              
              <Ticket data={ticketData} />
              
              {snacksPrice > 0 && (
                <div className="mt-8 p-4 bg-yellow-900/10 border border-yellow-600/30 rounded-xl flex items-center gap-3 text-yellow-500 max-w-sm">
                   <div className="p-2 bg-yellow-600/20 rounded-full">
                      <PopcornIcon className="w-5 h-5" />
                   </div>
                   <span className="text-sm font-medium">יש לאסוף את המזנון מהקופה עם מספר ההזמנה.</span>
                </div>
              )}

              <button 
                onClick={onClose}
                className="mt-10 px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition"
              >
                סגור חלון
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default BookingModal;