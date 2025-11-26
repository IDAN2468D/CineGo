import { TicketData } from "../types";

// Mock data and logic for the booking system
// This simulates a backend for: Showtimes, Halls, Seats, and Pricing

export interface Showtime {
  id: string;
  date: string;
  time: string;
  hallName: string;
  technology?: '2D' | '3D' | 'IMAX';
}

export interface Seat {
  id: string;
  row: string;
  col: number;
  type: 'standard' | 'vip' | 'accessible';
  status: 'available' | 'occupied' | 'selected';
  price: number;
}

export interface Snack {
  id: string;
  name: string;
  price: number;
  icon: 'popcorn' | 'drink' | 'nachos';
}

export const SNACKS: Snack[] = [
  { id: 'pop-s', name: 'פופקורן קטן', price: 22, icon: 'popcorn' },
  { id: 'pop-l', name: 'פופקורן ענק', price: 34, icon: 'popcorn' },
  { id: 'drink-s', name: 'שתייה קלה', price: 16, icon: 'drink' },
  { id: 'drink-l', name: 'שתייה גדולה', price: 22, icon: 'drink' },
  { id: 'nachos', name: 'נאצ׳וס וגבינה', price: 28, icon: 'nachos' },
];

export const generateShowtimes = (movieId: number): Showtime[] => {
  const showtimes: Showtime[] = [];
  const today = new Date();
  
  // Generate for next 3 days
  for (let i = 0; i < 3; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' });
    
    // Generate 3-4 random times per day
    const times = ['14:30', '17:00', '20:15', '22:45'];
    
    times.forEach((time, idx) => {
      if (Math.random() > 0.3) { // 70% chance a slot exists
        showtimes.push({
          id: `${movieId}-${i}-${idx}`,
          date: dateStr,
          time: time,
          hallName: `אולם ${Math.floor(Math.random() * 12) + 1}`,
          technology: Math.random() > 0.8 ? 'IMAX' : (Math.random() > 0.6 ? '3D' : '2D')
        });
      }
    });
  }
  return showtimes;
};

export const generateSeatMap = (showtimeId: string): Seat[] => {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const seatsPerRow = 12;
  const seats: Seat[] = [];

  rows.forEach((row, rIdx) => {
    for (let col = 1; col <= seatsPerRow; col++) {
      // Determine seat type
      let type: Seat['type'] = 'standard';
      let price = 45; // Base price

      if (row === 'G' || row === 'H') {
        type = 'vip';
        price = 75;
      }

      // Determine availability (simulated)
      // Middle rows are more likely to be taken
      const occupancyChance = (rIdx > 2 && rIdx < 6) ? 0.6 : 0.2;
      const status = Math.random() < occupancyChance ? 'occupied' : 'available';

      seats.push({
        id: `${showtimeId}-${row}${col}`,
        row,
        col,
        type,
        status: status as 'available' | 'occupied', // Cast to allow 'available' | 'occupied'
        price
      });
    }
  });

  return seats;
};

export const formatPrice = (amount: number) => {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);
};

// Persistence Logic
const STORAGE_KEY = 'cinema_tickets';

export const saveTicket = (ticket: TicketData) => {
  const existing = getMyTickets();
  const updated = [ticket, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const getMyTickets = (): TicketData[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};