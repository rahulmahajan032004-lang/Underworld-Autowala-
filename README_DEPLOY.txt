UNDERWORLD AUTOWALA - HOSTED AI DEPLOYMENT (RENDER)

WHAT THIS DOES
- Hosts the game and its AI passenger backend together, including passenger reactions and tactical gameplay decisions.
- Interviewers only need a browser and internet connection. They do not need Node.js.
- The OpenAI API key stays in Render's server environment and is never placed in the HTML.
- If AI is unavailable, built-in passenger dialogue and deterministic companion behaviour remain active.
- Danger Bhai uses AI-selected enemy priorities for his existing passenger gun.
- Mobile Mangesh can use one AI-decided vehicle hack per ride to temporarily disable a pursuing gang car.
- Other passengers use context-aware AI reactions for nearby enemies and critical auto health.

DEPLOY
1. Create a GitHub repository and upload every file in this folder to its ROOT.
2. Create/sign in to a Render account: https://render.com
3. In Render, choose New -> Blueprint and connect the GitHub repository.
4. Render detects render.yaml and creates the web service.
5. In the service's Environment settings, add OPENAI_API_KEY with your own OpenAI API key.
6. Keep OPENAI_MODEL as gpt-5.5 unless you intentionally choose another model available to your API account.
7. Deploy. Render will provide a public https://...onrender.com URL.
8. Open that URL. The game should show PASSENGER AI: READY when the key is configured. Test Danger Bhai during a chase and Mobile Mangesh when at least two enemy cars are nearby.

IMPORTANT
- Never put the OpenAI API key in index.html, GitHub, or any public file.
- The hosted backend limits each IP to 30 AI requests per minute across dialogue and gameplay decisions. The game uses cooldowns so AI is not called every frame.
- AI reactions require internet access and API billing/credits. Fallback reactions work without AI.
- Render's free service may sleep after inactivity. The first load after sleeping can take longer, so open the game once before an interview and test it.
- This folder is a deployment-ready project, not yet a live deployment. A Render account connection and a GitHub repository are required to publish it.

LATEST DRIVING + AI UPDATE
- Restored driving-only gameplay: removed rescue mission, on-foot movement and indoor combat flow.
- Removed the temporary ram escape window; collisions and enemy attacks no longer grant an escape-invulnerability timer.
- Enemy cars use stronger catch-up speeds, closer pursuit positioning, regrouping and route interception.
- Added player driving-history tracking (crashes, high-speed driving, hard braking, sharp turns and recent road segments).
- Added live AI endpoints /api/enemy-brain and /api/enemy-reaction. AI selects from constrained enemy tactics and generates contextual enemy dialogue.
- Existing prewritten passenger/enemy dialogue remains the offline/API-failure fallback. Passenger AI reactions continue using /api/passenger-reaction.
- Dialogue bubbles now stay visible for 9 seconds and use larger text.
- Oil patches are pure black and larger.

Deploy all five project files together. Configure OPENAI_API_KEY in Render for live AI. Without it, local adaptive enemy behaviour and prepared dialogue fallbacks remain available.

LATEST PASSENGER / ENEMY / REPUTATION UPDATE
- Gang car roles are now fixed: two shooter cars follow and fire but never ram; two rammer cars do not fire and focus on hitting the auto. The Chikna shooter-only ride keeps its special no-gang-car setup.
- Ramming now slows the auto and physically knocks it away from the side of impact. Enemy car and street-shooter eliminations do not award cash; ride fares are the only source of cash income.
- Passenger fallback dialogue tracks recent lines to avoid repeating the same reaction. Live AI reactions avoid the recent dialogue history where possible; prepared lines remain available when AI or internet is unavailable.
- Picking up a passenger with G opens a wide bottom-screen ride briefing. It gives driving orders and enemy-role information, and the live AI can comment on the last ride with that same passenger. Per-passenger driving summaries are saved locally.
- Added a reputation progress meter beside the speed HUD. Reputation levels unlock at 2, 4, 7 and 8 total successful rides. Each new level unlocks a passenger and displays an unlock popup.
- Reputation and per-passenger ride memory persist in the browser's local storage and ride checkpoint save.

LATEST UPDATE (v4):
- Passenger pickup conversations now pause gameplay until SPACE (desktop) or TAP TO CONTINUE (mobile) is pressed.
- Auto base top speed is 150 km/h. The HUD intentionally displays the actual speed minus 30 km/h; passenger bonuses and temporary boosts remain supported.
- Enemy pressure has been reduced: first ambush delay increased, shooter volleys spaced farther apart, ram attempts have longer cooldowns, and replacement waves wait longer.
- Enemy chase speed was rebalanced to stay challenging without the previous extreme catch-up speeds.
- City districts now have distinct visual identities: market stalls and shop awnings, dockyard cargo warehouses, industrial factory/tank details, railway yards/platforms, and irregular chamfered building footprints.
- Pickup names and beacon labels now reflect the actual district where the passenger is waiting.


UPDATE v5 - REPUTATION-BASED DIFFICULTY
- Early rides are easier: one shooter and one rammer at reputation 0, with a longer ambush delay.
- Enemy attacks, bullet damage, ram cooldowns and chase speed scale up as reputation increases.
- Street shooters and oil-spill hazards are held back at reputation 0; street shooter count grows with reputation.
- Passenger patience drains more slowly at reputation 0.
- Removed no-cash reward notifications when enemy cars, street shooters or oil spillers are eliminated. Enemy takedown mission progress remains.


UNDERWORLD AUTOWALA V7 - REPUTATION LADDER & BOSS CONTRACT
- Reputation 0: Unknown Criminal. Only Lamboo Lala sends ride requests, no enemies spawn, and successful rides pay a small beginner fare (₹65).
- Passenger unlocks: Rep 1 Bunty Brakefail; Rep 2 Chikna Chintu; Rep 3 Battery Baban; Rep 4 Koita Kumar; Rep 5 Bhau Karkhanis; Rep 6 Pappan Batli; Rep 7 Mobile Mangesh; Rep 8 Danger Bhai.
- Locked passengers are excluded from the ride request pool and cannot send ride messages.
- Reputation 9 unlocks a one-time Danger Bhai boss contract. The boss ride uses double the standard gang car count (4 shooters + 4 rammers).
- Reputation progression requires 2, 4, 7, 8, 9, 10, 11, 12, and 13 successful rides respectively to advance from levels 0 through 8.
- Existing standard enemy roles/behaviour are retained from the previous build; the boss contract doubles the number of those enemies.
- The old 8-delivery prototype ending is removed so the full reputation ladder and boss contract can be reached.


LATEST GAMEPLAY FIXES (V8)
- Added Unknown Criminal as a real reputation-0 passenger. His ride has no pursuing enemies and pays only ₹35.
- Lamboo Lala remains available at reputation 0; his ride and other non-Unknown rides still use the normal four-enemy encounter.
- Restored the regular enemy setup on reputation-0 rides: two shooter cars and two rammer cars. Danger Bhai's boss contract still doubles the force.
- Moved enemy spawn positions closer and improved follower catch-up speed so the four cars stay in the chase instead of falling far behind.
- Removed Debug Mode and its developer-only menu/tools.
- Fixed frozen projectile visuals during paused dialogue/overlays and added stricter projectile cleanup for expired or invalid bullets.


LATEST UPDATE (V9) - WEAPON ECONOMY, ENEMY HEALTH & TUTORIALS
- Increased all paid weapon prices by 350 in their existing currency. The starter pistol remains free.
- Cash weapon prices: Revolver ₹600; Submachine Gun ₹800; Shotgun ₹1,050; Machine Gun ₹1,300; Assault Rifle ₹1,650; Heavy Rifle ₹2,150.
- Premium weapon prices: Grenade Launcher 850 gold bars; Plasma Cannon 1,350 gold bars; Laser 1,850 gold bars.
- Weapon reputation gates: Rep 2 Revolver; Rep 3 Submachine Gun and Shotgun; Rep 4 Machine Gun; Rep 5 Assault Rifle; Rep 6 Heavy Rifle; Rep 7 Grenade Launcher; Rep 8 Plasma Cannon and Laser. Guns remain purchasable after their reputation gate is reached, and reputation unlock popups list the newly available weapons.
- Increased gang vehicle health from 140 to 190 (+50). Hard Mode adds its existing 40-point bonus on top. Street shooter health increased from 24 to 74. Ram trucks retain double vehicle health.
- Added a first-ride guide covering drop-off navigation, driving controls, auto-targeting and passenger-specific enemy behaviour.
- Added first-visit tutorials for the garage and weapon shop. Each tutorial is remembered in localStorage and shown once per new game profile.
- Fixed saved reputation loading to preserve levels 0-9, so the late-game weapon unlock gates work after Continue Game.
- Passenger fare logic is unchanged.


LATEST UPDATE (V10) - CRIMINAL CONTACTS, FIRST-RIDE ONBOARDING & REPUTATION DIFFICULTY
- Removed AI Mission Director and all occasional special-job offers, bonus mission objectives and the Special Jobs phone screen.
- Replaced Special Jobs with a Criminal Contacts directory showing each criminal, their ride behaviour and the reputation level required to unlock them. Locked contacts cannot send ride requests.
- Kept the separate daily Missions app, passenger dialogue AI, player-history tracking and adaptive enemy tactics.
- First-session tutorial now appears before driving and explains W/A/S/D, SPACE, mobile steering/pedals and waiting for the first ride request.
- When the first ride request arrives, a second tutorial explains TAB -> Rides Request -> tap the incoming message card to activate the pickup timer -> follow the pickup arrow -> press G beside the passenger.
- After the first passenger briefing, a third tutorial explains the gold drop-off marker, automatic weapon targeting and earning the fare.
- Enemy vehicle health, street-shooter health and chase speed now increase with reputation. Hard Mode bonuses remain on top.
