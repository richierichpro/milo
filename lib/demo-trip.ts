import type { TripInput } from "./types";

export const DEMO_TRIP: TripInput = {
  squad: [
    { name: "Aarav", city: "Hyderabad" },
    { name: "Meera", city: "Bengaluru" },
    { name: "Kabir", city: "Delhi" },
    { name: "Ishita", city: "Pune" },
  ],
  destination: "Goa",
  startDate: "2026-11-20",
  endDate: "2026-11-23",
  interests: ["beaches", "food", "nightlife"],
  budgetPerPerson: 20000,
};
