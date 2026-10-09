# Pakka build plan

## Progress
- [x] 0 Setup
- [x] 1 SerpApi client
- [x] 2 Types and normalizers
- [x] 3 Gather a trip
- [x] 4 Grounded planner
- [x] 5 Main screen  (STOP after this for my review)
- [x] 6 Squad Match (hero)
- [x] 7 Chat edits
- [x] 8 Demo mode
- [x] 9 Polish and README

## Step 0: Setup
- Next.js app in this folder: App Router, TypeScript, Tailwind CSS, ESLint, npm, no src/ folder, import alias "@/*". If create-next-app refuses because CLAUDE.md and PLAN.md exist, scaffold into a temp folder and move the files in.
- .env.example with: SERPAPI_API_KEY=, ANTHROPIC_API_KEY=, CLAUDE_MODEL=claude-sonnet-5-5, DEMO_MODE=false. Copy it to .env.local. Put .env.local and .cache/ in .gitignore.
- Install @anthropic-ai/sdk, leaflet, @types/leaflet, and tsx as a dev dependency.
- Home page: centered "Pakka" heading and "The Goa plan that actually happens."
- git init.
Verify: npm run build passes; git status doesn't list .env.local.

## Step 1: SerpApi client (lib/serpapi.ts)
- export async function serpSearch(params, opts?: { log?: CallLogEntry[] }): Promise<any>
- Adds api_key from SERPAPI_API_KEY and GETs https://serpapi.com/search.json. 30 second timeout.
- Disk cache: key = sha1 of the params sorted by name, without api_key. File: .cache/serpapi/<engine>/<key>.json. Read the cache first. No expiry.
- Demo mode: if DEMO_MODE=true or there's no SERPAPI_API_KEY, never call the network. Read from demo-data/serpapi/<engine>/<key>.json and throw "No demo data for this search: <engine> <q>" if missing.
- If the JSON has an `error` field, throw an Error with the engine and message.
- Call log: every call pushes { engine, summary (the q, or a route like "HYD → GOI"), source: "live" | "cache" | "demo", ms, at } into opts.log. The UI shows this later as "search receipts".
- Never log, cache or return the api_key.
Verify: scripts/try-serpapi.ts searches Google Maps for "best beaches in Goa" and prints the top 3 with rating and reviews; a second run comes from cache.

## Step 2: Types and normalizers (lib/types.ts, lib/normalize.ts)
Types, each with `id` and `source`:
- Source = { engine, url?, fetchedAt }
- Flight = { id, source, from, to, departTime, arriveTime ("YYYY-MM-DD HH:MM"), airline, airlineLogo, flightNumbers[], stops, durationMin, pricePerPerson }
- Hotel = { id, source, name, lat, lng, pricePerNight, rating, reviews, stars, thumbnail, amenities[], link }
- Place = { id, source, name, category, lat, lng, rating, reviews, priceLevel, address, hours, thumbnail, description, mapsUrl }
- Event = { id, source, title, dateText, venue, address, link, thumbnail }
- Destination = { id, name, country, lat, lng, airportCode, flightPrice, hotelPrice, startDate, endDate, thumbnail, airline, stops }
Rules:
- Stable ids from SerpApi data: "place:"+place_id, "hotel:"+property_token, "event:"+short hash of title+date, "flight:"+flight numbers+depart time, "dest:"+destination_id.
- mapsUrl = https://www.google.com/maps/place/?q=place_id:<place_id>
- Parse defensively; missing fields become undefined, never a crash. Skip places and hotels without coordinates.
- Events: `date` may be an object or a string; handle both.
- Flights: merge best_flights and other_flights; multi-segment results become one Flight with stops = segments − 1.
- Find out whether Travel Explore's hotel_price is per night or for the whole stay: compare one destination's hotel_price with google_hotels rate_per_night and total_rate for the same city and dates. Write the answer into CLAUDE.md next to the engine description.
Verify: scripts/try-normalize.ts prints 2 clean items of each type for Aarav's trip (HYD → GOI,GOX on 2026-11-20, back 2026-11-23, hotels/places/events in Goa, travel explore from HYD).

## Step 3: Gather a trip (lib/airports.ts, lib/gather.ts)
- airports.ts: lookup from city name to IATA code(s) for about 40 Indian cities and popular destinations. No-airport places map to the nearest one with a note (Manali → KUU, Munnar → COK, Coorg → IXE, Rishikesh → DED, Ooty → CJB, Pondicherry → MAA). Goa → "GOI,GOX". Case-insensitive, trims spaces. resolveAirport(city) → { codes, note? } | null.
- gather.ts: gatherCandidates(input, onProgress?) where input = { squad: {name, city}[], destination, startDate, endDate, interests[] }. All searches in parallel:
  - Per home city: one-way flights home → destination on startDate and back on endDate (adults=1). Keep the 8 cheapest each way. Same city = shared search.
  - Hotels: "hotels in <dest>", adults 2, sorted by highest rating. Keep 12.
  - Google Maps: "top attractions in <dest>", "best restaurants in <dest>", "best cafes in <dest>", plus "<interest> in <dest>" for up to 3 interests. Keep 10 each, dedupe by id.
  - Events: google search "events in <dest> <Month YYYY>". Keep 8.
  - Returns CandidatePool { flightsOut: Record<personName, Flight[]>, flightsBack, hotels, places, events, receipts, errors }. A failed search is recorded in errors and doesn't stop the rest.
  - onProgress(text) before each search, e.g. "Searching Google Flights HYD → GOI…".
Verify: scripts/try-gather.ts for the demo squad prints counts per category and live vs cache; a second run makes 0 live searches.

## Step 4: Grounded planner (lib/claude.ts, lib/planner.ts, lib/money.ts)
- claude.ts: one Anthropic client, model from CLAUDE_MODEL. callTool<T>(system, messages, tool) forces that tool (tool_choice { type: "tool", name }) and returns its input.
- planner.ts planTrip(pool, trip):
  1. Flights: placeholder that picks each person's cheapest flight each way (Step 6 replaces it). Tell Claude when the last person lands and the first must leave.
  2. Send the pool as compact lines: id | name | category | rating (reviews) | price | address | hours. Never raw JSON.
  3. Forced tool submit_itinerary: { title, summary (2 sentences), hotelId, days: [{ date, title, stops: [{ id, time "HH:MM", why (max 15 words) }] }] }
  4. Rules for Claude: only ids from the list; never invent; 3–5 stops on full days, fewer on travel days; nothing before landing or after leaving for the airport; keep each day's stops close together; mix sights and food, include an event if one falls on the dates; respect the budget.
  5. Grounding check: look up every returned id; remove unknown ones and list them. If any were removed or a day is empty, ask Claude once more to fix only those days. Result includes verification { total, verified, removed[] }.
  6. Itinerary holds full candidate objects. Claude's text is only used for title, summary, day titles and "why".
- money.ts: per person = their flights + hotel share (pricePerNight × nights × rooms ÷ squad size, rooms = ceil(size ÷ 2)). formatINR(n) → "₹12,345".
Verify: scripts/try-plan.ts prints a 4-day Goa plan, "Verified N/N items against live search" and cost per person. A unit test that injects a fake id proves it gets removed. If the API says the model isn't found, stop and tell me.

## Step 5: Main screen + streaming API
- Layout like Layla.ai: chat column left (~30%), plan middle, map right; stacked below 1024px. Indian-travel feel: warm off-white, deep teal main colour, marigold highlights, a characterful heading font via next/font/google, rounded photo cards.
- app/api/plan/route.ts (POST) streams newline-delimited JSON: { type: "progress", text } from onProgress, then "Asking Claude to arrange the trip…" and "Checking every item against search results…"; then { type: "plan", itinerary, receipts }; or { type: "error", message }.
- Left: trip form (squad rows with name + home city, add/remove; destination; dates; interest chips beaches/food/nightlife/heritage/adventure/cafes; budget per person), pre-filled with the demo squad, button "Make it pakka". While planning, progress lines appear one by one with a spinner on the newest. After: a chat box, disabled until Step 7.
- Middle: header with title, dates, squad avatars, "₹X per person", green badge "✓ N/N verified with live Google data". Flights: one row per person (name, city → destination, airline logo, times, price). Hotel card (photo, name, stars, rating, ₹/night, link). Day timeline "Day 1 · Fri 20 Nov · <title>" with stop cards: time, photo, name, category, rating (reviews), the "why", and a proof line "Google Maps · checked 3 min ago ↗" linking to the source.
- Right: Leaflet + OpenStreetMap, client-only. Numbered markers coloured per day, hotel marker, map flies to a stop when its card is clicked.
- Components: TripForm, ProgressFeed, PlanHeader, FlightsSection, HotelCard, DayTimeline, StopCard, ProofLine, TripMap.
Verify: npm run build passes; start the dev server and run the demo squad through /api/plan successfully. Then STOP and ask me to check localhost:3000.

## Step 6: Squad Match (the hero feature)
Part A, "Where should we go?" (when the destination is empty), in lib/squad.ts findDestinations(squad, startDate, endDate, budgetPerPerson):
- One google_travel_explore search per unique home city (arrival_area_id /m/03rk0, adults 1, INR).
- Join destinations across cities by id; keep ones every city has a price for; skip each person's own home city.
- Per destination: per-person estimate = their flight_price + hotel share (use the per-night/whole-stay answer from Step 2, room shared by 2); groupTotal; fairnessGap = max − min per-person; withinBudget count.
- Rank everyone-within-budget first, then by groupTotal + 0.5 × fairnessGap. Top 6. Label as "estimate from Google Travel Explore".
- Fewer than 3 shared destinations → friendly message and let them type a destination.
- UI: Squad Match screen. The map draws lines from each friend's city to each candidate; ranked cards show photo, name, "≈ ₹14,200 each", "gap ₹1,100", "4/4 within budget", per-person chips. Picking one fills the destination and runs the normal plan.
Part B, "Land together", pickSquadFlights(flightsOut, flightsBack, squad):
- Try every combination of each person's up to 8 options (trim to stay under 50,000 combos).
- Score = total price + ₹300 per 10 minutes between first and last arrival, plus the same for return departures. Constants in one place.
- Return best combo, cheapest combo, and arrival window. Replace the Step 4 placeholder and tell Claude when the squad is together.
- UI: arrival timeline with one dot per person inside a highlighted window and a line like "Everyone lands between 10:05 and 10:50 · ₹1,240 more than the cheapest scattered flights"; a Cost split card (flights + hotel share = total per person); a "Copy for WhatsApp" button that copies destination, dates, everyone's flights, hotel, cost per person and the top stop of each day.
Verify: a script prints the top destinations for the demo squad; a unit test shows pickSquadFlights prefers aligned arrivals when the price difference is small; npm run build passes.

## Step 7: Chat edits (lib/agent.ts, app/api/chat/route.ts)
- Tool-use loop, max 6 rounds. Tools: search_places(query) → google_maps; search_hotels(maxPricePerNight?, minRating?, sortBy?) → google_hotels; search_flights(traveller, direction "out"|"back", departAfter?, departBefore?, nonstopOnly?) → google_flights with outbound_times/stops; search_events(query) → google events_results; submit_itinerary (same schema as Step 4, ends the loop).
- Every search result is normalized and added to the pool, so the grounding check covers all edits. Tools return compact lines, not raw JSON. When a traveller's flights change, re-run pickSquadFlights.
- System prompt: edit the existing plan; change only what was asked; search for anything not in the pool; never invent; end with 1–2 sentences on what changed and how cost per person moved.
- Stream { type: "progress", text: "🔎 Google Hotels · under ₹4,000/night" } per tool call, then { type: "plan", itinerary, receipts } and { type: "message", text }.
- UI: enable chat; tool calls as small grey lines under the reply; changed cards highlighted for 3 seconds; a "−₹2,150 per person" / "+₹800 per person" pill; suggestion chips "Make it cheaper", "Kabir can't leave Delhi before 6pm Friday", "Add a sunset cruise", "Make day 2 more adventurous".
Verify: a script sends "Kabir can't leave Delhi before 6pm Friday" and confirms Kabir's new flight departs after 18:00 and verification is still N/N.

## Step 8: Demo mode
- scripts/record-demo.ts: with real keys, run the full demo once (Squad Match with empty destination, pick Goa, plan, the four suggestion chips) and copy every SerpApi response used from .cache/ into demo-data/serpapi/.
- lib/claude.ts records Claude responses into demo-data/claude/, keyed by a hash of the request with time-based values removed. In demo mode it answers from there; with no recording it says "This edit isn't in the demo recording. Add an ANTHROPIC_API_KEY to try your own."
- Slim banner when DEMO_MODE=true: "Demo mode · real search data recorded on <date>".
- Search demo-data/ for "api_key" and the actual key values; strip anything found. Commit demo-data/.
Verify: run the demo flow with DEMO_MODE=true and the keys overridden to empty on the command line (don't edit my .env.local); everything works.

## Step 9: Polish and README
1. "Search receipts" drawer in the plan header: every SerpApi call with engine, query, live/cache/demo and time; header summary like "23 searches · 5 Google engines".
2. Verified badge tooltip: "Every flight, hotel, place and event comes from a live SerpApi result. Claude arranges them and can't add its own." plus "N suggestions were removed because search didn't return them" when relevant.
3. Loading, empty and error states; a failed search leaves the plan working and the card says "couldn't check this".
4. README.md: one-line pitch; the problem (the "Goa trip" WhatsApp group that never happens; AI planners that invent things or go stale, e.g. Layla's sample trip showing an expired flight price); screenshot placeholders; a mermaid diagram (Travel Explore per city → Flights per leg → land-together optimiser → Hotels + Maps + Events → Claude arranges → grounding check); table of SerpApi engines and what each does; setup (clone, npm install, .env.local, npm run dev, demo mode); tech stack; what's next.
5. npm run build with zero errors and warnings.
Verify: clone the repo into a temp folder, follow only the README in demo mode, and confirm it runs.
