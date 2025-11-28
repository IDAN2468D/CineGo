import React, { useState, useEffect } from 'react';
import { Movie, TicketData } from '../types';
import { CloseIcon, CheckIcon, CalendarIcon, ChevronRightIcon, ChevronLeftIcon } from './Icons';
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

  // Payment State
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    expiry: '',
    cvv: ''
  });
  const [formErrors, setFormErrors] = useState({
    cardNumber: '',
    expiry: '',
    cvv: ''
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

  // Payment Form Handlers
  const handlePaymentInput = (field: keyof typeof paymentForm, value: string) => {
    // Strip everything that is not a digit
    const digitsOnly = value.replace(/\D/g, '');
    
    let formatted = digitsOnly;
    
    if (field === 'cardNumber') {
      if (digitsOnly.length > 16) return; // Limit to 16 digits
      // Add space every 4 digits
      const parts = digitsOnly.match(/.{1,4}/g);
      formatted = parts ? parts.join(' ') : digitsOnly;
    } 
    else if (field === 'expiry') {
      if (digitsOnly.length > 4) return; // Limit MMYY
      if (digitsOnly.length >= 2) {
         formatted = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
      }
    }
    else if (field === 'cvv') {
      if (digitsOnly.length > 4) return;
    }

    setPaymentForm(prev => ({ ...prev, [field]: formatted }));
    
    // Clear error if exists
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validatePayment = () => {
    let isValid = true;
    const errors = { cardNumber: '', expiry: '', cvv: '' };

    // Card Number (Simple check for 16 digits)
    const cleanCard = paymentForm.cardNumber.replace(/\s/g, '');
    if (cleanCard.length !== 16) {
      errors.cardNumber = 'נא להזין מספר כרטיס תקין (16 ספרות)';
      isValid = false;
    }

    // Expiry Date (Format and Past Date check)
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(paymentForm.expiry)) {
      errors.expiry = 'תוקף לא תקין';
      isValid = false;
    } else {
      const [month, yearStr] = paymentForm.expiry.split('/');
      const year = 2000 + parseInt(yearStr);
      const expiry = new Date(year, parseInt(month) - 1);
      const now = new Date();
      // End of month check
      expiry.setMonth(expiry.getMonth() + 1);
      expiry.setDate(0);
      
      if (expiry < now) {
        errors.expiry = 'כרטיס פג תוקף';
        isValid = false;
      }
    }

    // CVV
    if (paymentForm.cvv.length < 3) {
      errors.cvv = '3-4 ספרות';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
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
    
    if (!validatePayment()) return;

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
        <div className="flex items-center justify-center gap-2 mb-6 md:mb-8" dir="rtl">
           {steps.map((s, idx) => (
              <div key={s.id} className="flex items-center">
                 <div className={`
                    flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full text-[10px] md:text-xs font-bold transition-all duration-300
                    ${idx < currentIndex ? 'bg-blue-500 text-white' : idx === currentIndex ? 'bg-white text-blue-600 shadow-lg scale-110' : 'bg-slate-700 text-slate-500'}
                 `}>
                    {idx < currentIndex ? <CheckIcon className="w-4 h-4" /> : idx + 1}
                 </div>
                 {idx < steps.length - 1 && (
                    <div className={`w-3 md:w-6 h-0.5 mx-0.5 md:mx-1 ${idx < currentIndex ? 'bg-blue-500' : 'bg-slate-700'}`}></div>
                 )}
              </div>
           ))}
        </div>
     );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4 bg-slate-900/90 backdrop-blur-md transition-all font-poppins" dir="rtl">
      <div className="relative w-full max-w-4xl bg-[#0f172a] md:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full md:h-[90vh] border-0 md:border border-slate-700 animate-scaleIn">
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center bg-[#1e293b]/50 pt-10 md:pt-6">
           <div>
               <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">רכישת כרטיסים</h2>
               <p className="text-xs md:text-sm text-blue-400 font-medium mt-1 truncate max-w-[200px]">{title}</p>
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
              <h3 className="text-xl md:text-2xl font-bold mb-6 text-center text-white">מתי תרצו לצפות?</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {showtimes.map(st => (
                  <button
                    key={st.id}
                    onClick={() => handleShowtimeSelect(st)}
                    className="flex flex-col items-center p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-blue-500 hover:bg-slate-800 transition group text-center relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition"></div>
                    <span className="font-black text-xl md:text-2xl text-white group-hover:text-blue-400 font-poppins">{st.time}</span>
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
                  className="px-6 md:px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
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
                  <div className="flex gap-4 md:gap-8">
                     <div>
                        <span className="text-slate-400 text-[10px] md:text-xs uppercase">כרטיסים</span>
                        <span className="block font-bold text-white">{formatPrice(seatsPrice)}</span>
                     </div>
                     <div>
                        <span className="text-slate-400 text-[10px] md:text-xs uppercase">מזנון</span>
                        <span className="block font-bold text-yellow-500">{formatPrice(snacksPrice)}</span>
                     </div>
                  </div>
                  <button 
                    onClick={() => setStep('payment')}
                    className="px-6 md:px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2"
                  >
                    לתשלום <ChevronLeftIcon className="w-4 h-4" />
                  </button>
              </div>
              <div className="h-24"></div>
            </div>
          )}

          {/* STEP 4: PAYMENT */}
          {step === 'payment' && (
            <div className="animate-fadeIn max-w-lg mx-auto pb-20">
              <h3 className="text-xl md:text-2xl font-bold mb-8 text-center text-white">סיכום ותשלום</h3>
              
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="relative">
                     <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                     <div className="absolute inset-0 flex items-center justify-center">
                        <CheckIcon className="w-6 h-6 text-blue-600" />
                     </div>
                  </div>
                  <p className="text-blue-400 animate-pulse mt-6 font-bold">מאשר עסקה...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Interactive Credit Card - Scaled down for mobile */}
                  <div className="perspective-1000 w-full max-w-[340px] h-[200px] mx-auto mb-8 relative group scale-90 sm:scale-100 origin-center">
                      <div className={`relative w-full h-full transition-all duration-700 ${focusedField === 'cvv' ? '[transform:rotateY(180deg)]' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
                          
                          {/* Front */}
                          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl shadow-2xl p-6 text-white border border-slate-600 overflow-hidden [backface-visibility:hidden]">
                              {/* Decoration */}
                              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                              <div className="absolute -left-10 bottom-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
                              
                              <div className="flex justify-between items-start mb-8">
                                  <div className="w-12 h-8 bg-yellow-500/80 rounded flex items-center justify-center">
                                      <div className="w-8 h-5 border border-yellow-700/50 opacity-50 rounded-sm"></div>
                                  </div>
                                  <div className="text-xl font-black italic opacity-50">VISA</div>
                              </div>

                              <div className="text-2xl font-mono tracking-widest mb-6 text-shadow-sm min-h-[32px] dir-ltr text-left">
                                  {paymentForm.cardNumber || '#### #### #### ####'}
                              </div>

                              <div className="flex justify-between items-end">
                                  <div>
                                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">בעל הכרטיס</p>
                                      <p className="font-bold tracking-wide text-sm">ISRAEL ISRAELI</p>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">תוקף</p>
                                      <p className="font-bold tracking-wide font-mono">{paymentForm.expiry || 'MM/YY'}</p>
                                  </div>
                              </div>
                          </div>

                          {/* Back */}
                          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-600 overflow-hidden [transform:rotateY(180deg)] [backface-visibility:hidden]">
                               <div className="w-full h-10 bg-black mt-6"></div>
                               <div className="px-6 mt-6">
                                   <div className="text-right text-xs text-slate-400 mb-1">CVV</div>
                                   <div className="w-full bg-white text-slate-900 h-8 flex items-center justify-end px-3 font-mono font-bold tracking-widest">
                                       {paymentForm.cvv || '***'}
                                   </div>
                               </div>
                               <div className="absolute bottom-6 left-6 opacity-50">
                                  <div className="text-xl font-black italic">VISA</div>
                               </div>
                          </div>
                      </div>
                  </div>

                  {/* Payment Form */}
                  <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-4">
                    <div className="flex justify-between items-center mb-4 text-sm text-slate-300 border-b border-slate-700 pb-2">
                         <span>סה"כ לתשלום</span>
                         <span className="text-xl font-bold text-white">{formatPrice(totalPrice)}</span>
                    </div>

                    <div className="relative">
                       <input 
                         type="text" 
                         inputMode="numeric"
                         value={paymentForm.cardNumber}
                         onFocus={() => setFocusedField('cardNumber')}
                         onBlur={() => setFocusedField(null)}
                         onChange={(e) => handlePaymentInput('cardNumber', e.target.value)}
                         placeholder="מספר כרטיס אשראי" 
                         maxLength={19}
                         dir="ltr"
                         className={`w-full bg-slate-900 border rounded-xl p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition
                           ${formErrors.cardNumber ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-700'}
                         `}
                       />
                       {formErrors.cardNumber && <p className="text-red-500 text-xs mt-1 mr-1">{formErrors.cardNumber}</p>}
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="w-1/2">
                        <input 
                          type="text" 
                          inputMode="numeric"
                          value={paymentForm.expiry}
                          onFocus={() => setFocusedField('expiry')}
                          onBlur={() => setFocusedField(null)}
                          onChange={(e) => handlePaymentInput('expiry', e.target.value)}
                          placeholder="תוקף (MM/YY)" 
                          maxLength={5}
                          dir="ltr"
                          className={`w-full bg-slate-900 border rounded-xl p-3 text-sm focus:border-blue-500 outline-none transition text-center
                             ${formErrors.expiry ? 'border-red-500 focus:border-red-500' : 'border-slate-700'}
                          `}
                        />
                        {formErrors.expiry && <p className="text-red-500 text-xs mt-1 text-center">{formErrors.expiry}</p>}
                      </div>
                      
                      <div className="w-1/2">
                        <input 
                          type="text" 
                          inputMode="numeric"
                          value={paymentForm.cvv}
                          onFocus={() => setFocusedField('cvv')}
                          onBlur={() => setFocusedField(null)}
                          onChange={(e) => handlePaymentInput('cvv', e.target.value)}
                          placeholder="CVV" 
                          maxLength={4}
                          dir="ltr"
                          className={`w-full bg-slate-900 border rounded-xl p-3 text-sm focus:border-blue-500 outline-none transition text-center
                             ${formErrors.cvv ? 'border-red-500 focus:border-red-500' : 'border-slate-700'}
                          `}
                        />
                        {formErrors.cvv && <p className="text-red-500 text-xs mt-1 text-center">{formErrors.cvv}</p>}
                      </div>
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
                      <div className="text-xl">🍿</div>
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