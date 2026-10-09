export type CallLogEntry = {
  engine: string;
  summary: string;
  source: "live" | "cache" | "demo";
  ms: number;
  at: string;
};

export type Source = { engine: string; url?: string; fetchedAt: string };

export type Flight = {
  id: string;
  source: Source;
  from: string;
  to: string;
  departTime: string; // "YYYY-MM-DD HH:MM"
  arriveTime: string;
  airline: string;
  airlineLogo?: string;
  flightNumbers: string[];
  stops: number;
  durationMin: number;
  pricePerPerson: number;
};

export type Hotel = {
  id: string;
  source: Source;
  name: string;
  lat: number;
  lng: number;
  pricePerNight?: number;
  rating?: number;
  reviews?: number;
  stars?: number;
  thumbnail?: string;
  amenities: string[];
  link?: string;
};

export type Place = {
  id: string;
  source: Source;
  name: string;
  category?: string;
  lat: number;
  lng: number;
  rating?: number;
  reviews?: number;
  priceLevel?: string;
  address?: string;
  hours?: string;
  thumbnail?: string;
  description?: string;
  mapsUrl: string;
};

export type Event = {
  id: string;
  source: Source;
  title: string;
  dateText?: string;
  /** "YYYY-MM-DD" when the date could be parsed */
  date?: string;
  venue?: string;
  address?: string;
  link?: string;
  thumbnail?: string;
};

export type Destination = {
  id: string;
  name: string;
  country?: string;
  lat?: number;
  lng?: number;
  airportCode?: string;
  /** Round trip, per person (Travel Explore prices both legs together). */
  flightPrice?: number;
  /** Travel Explore omits this for India searches; see CLAUDE.md. */
  hotelPrice?: number;
  startDate?: string;
  endDate?: string;
  thumbnail?: string;
  airline?: string;
  stops?: number;
  source: Source;
};

export type Person = { name: string; city: string };

export type TripInput = {
  squad: Person[];
  destination: string;
  startDate: string;
  endDate: string;
  interests: string[];
  budgetPerPerson?: number;
};

export type FlightPick = { person: string; city: string; out?: Flight; back?: Flight };

export type Stop =
  | { kind: "place"; time: string; why: string; item: Place }
  | { kind: "event"; time: string; why: string; item: Event };

export type Day = { date: string; title: string; stops: Stop[] };

export type Verification = { total: number; verified: number; removed: string[] };

export type CostLine = { person: string; flights: number; hotelShare: number; total: number };

export type Itinerary = {
  title: string;
  summary: string;
  trip: TripInput;
  flights: FlightPick[];
  /** Set by the squad flight optimiser (Step 6). */
  arrivalWindow?: { first: string; last: string; extraVsCheapest: number };
  hotel?: Hotel;
  rooms: number;
  nights: number;
  days: Day[];
  verification: Verification;
  costs: CostLine[];
  createdAt: string;
};
