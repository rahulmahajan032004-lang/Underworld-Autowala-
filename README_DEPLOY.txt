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
- The hosted backend limits each IP to 12 AI requests per minute across dialogue and gameplay decisions. The game uses cooldowns so AI is not called every frame.
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
