# Pakka: the group trip planner that can't make things up

## The project
Hackathon entry for the SerpApi India Hackathon 2026, track "Travel & Local Discovery". Deadline Oct 10, 2026, 23:59 IST. Judged on idea strength, originality, technical complexity, usefulness and meaningful SerpApi usage. The demo video shows it running locally, so it only needs to run on localhost.

Pakka is an AI trip planner laid out like Layla.ai (chat on the left, trip plan in the middle, map on the right), with two things that set it apart:
1. Squad Trip (the hero feature). Friends live in different Indian cities. Pakka finds where the squad should go (or uses the destination they already picked), picks flights so everyone lands within about an hour of each other, picks a hotel for the group, builds the day-by-day plan and splits the cost per person.
2. Grounded, never invented. Every flight, hotel, place and event in a plan is a real SerpApi search result. Claude chooses and arranges items from search results. It never writes its own places, prices, ratings or times.

## Rules that always apply
- Grounding: every itinerary item points to a candidate `id` that came from a SerpApi result. The server checks every id after Claude answers and removes anything it can't find. Text Claude writes (titles, summaries, the short "why") is never shown as a fact.
- Every card in the UI shows proof: which search it came from, rating or price, "checked N min ago", and a link to the source.
- Money is INR. Always send currency=INR, gl=in, hl=en. Format as ₹12,345 with en-IN grouping.
- Flights are always searched with adults=1, one leg at a time (type=2, one way). We multiply by the number of people ourselves.
- Hotels are searched with adults=2. Rooms = ceil(squad size / 2).
- All SerpApi calls go through lib/serpapi.ts (disk cache, demo mode, call log). All Claude calls go through lib/claude.ts, and the model comes from CLAUDE_MODEL. Default is claude-haiku-5-5 (chosen for cost; the grounding check makes a smaller model safe). lib/claude.ts caches every response in .cache/claude/ by request hash. Current models reject forced tool_choice, so callTool uses auto + strict tools.
- API keys stay on the server. Route handlers use runtime = "nodejs".
- No database, no login, no payments. Plan state lives in the browser.
- Small, focused files. TypeScript strict. `any` only where raw SerpApi JSON is parsed.

## SerpApi engines (GET https://serpapi.com/search.json)
- google_travel_explore: destinations reachable from an origin. Params: departure_id (IATA), arrival_area_id (/m/03rk0 = India), outbound_date, return_date, adults, currency, gl, hl. Response destinations[]: destination_id, name, country, gps_coordinates{latitude,longitude}, thumbnail, destination_airport.code, flight_price, hotel_price, flight_duration, number_of_stops, airline, start_date, end_date.
  - Measured 2026-10-09 (HYD, 20–23 Nov 2026): `hotel_price` is NOT returned for India searches (0 of 78 destinations had it), so it is neither per night nor per stay; we can't use it. Hotel cost must come from a google_hotels search. `flight_price` is the ROUND TRIP per person (Goa ₹11,497 ≈ cheapest one-way out ₹5,616 + back ₹5,816).
- google_flights: params departure_id, arrival_id (IATA; comma-separated allowed, e.g. "GOI,GOX"), outbound_date, type=2, adults=1, stops (1 = nonstop), sort_by (2 = price), outbound_times (e.g. "18,23" = departs 6pm to midnight). Response best_flights[] and other_flights[]; each has flights[] segments (departure_airport{name,id,time}, arrival_airport{name,id,time}, airline, airline_logo, flight_number, duration), layovers[], total_duration, price. Times look like "2026-11-20 07:45". Also price_insights{lowest_price, price_level, typical_price_range}.
- google_hotels: params q, check_in_date, check_out_date, adults, sort_by (3 = lowest price, 8 = highest rating), min_price, max_price, rating (8 = 4.0+). Response properties[]: name, link, gps_coordinates, rate_per_night.extracted_lowest, total_rate.extracted_lowest, overall_rating, reviews, hotel_class, extracted_hotel_class, images[].thumbnail, amenities[], property_token.
- google_maps: params type=search, q, optional ll=@lat,lng,13z. Response local_results[]: title, place_id, gps_coordinates, rating, reviews, price, type, address, hours, operating_hours, thumbnail, description.
- google (normal web search), used for events: q="events in Goa November 2026". Read events_results[]: title, date (either an object {start_date, when} or a plain string), address[], link, ticket_info[], venue, thumbnail. Do not use the google_events engine; it's deprecated.
  - Measured 2026-10-09: "events in Goa November 2026" returns no events_results at all; "events in Goa" does (dates like "21 Nov", no year, mostly the next few weeks). We search plainly and only offer Claude events dated inside the trip.
- Flights note: google_flights often returns nonstop options without a `price`; we skip unpriced options.

## Tech
Next.js App Router, TypeScript, Tailwind. Leaflet with OpenStreetMap tiles, loaded client-side only. @anthropic-ai/sdk with tool use; structured answers come from a forced tool call. Long operations stream progress to the browser as newline-delimited JSON.

## Folders
- app/ pages and app/api/*/route.ts
- lib/ serpapi, normalize, types, airports, gather, squad, planner, agent, claude, money
- components/ UI pieces
- scripts/ terminal test scripts, run with: npx tsx --env-file=.env.local scripts/<name>.ts
- demo-data/ recorded real responses for demo mode (committed to git)

## Demo squad (use this everywhere for testing)
Aarav (Hyderabad), Meera (Bengaluru), Kabir (Delhi), Ishita (Pune). Goa, 2026-11-20 to 2026-11-23. Interests: beaches, food, nightlife. Budget ₹20,000 per person.

## How to work
- Follow PLAN.md in order and keep its Progress list up to date.
- Verify each step yourself before moving on.
- Ask me only when blocked or before something hard to undo.
