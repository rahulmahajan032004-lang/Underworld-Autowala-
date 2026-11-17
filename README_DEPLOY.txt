UNDERWORLD AUTOWALA - HOSTED AI DEPLOYMENT (RENDER)

WHAT THIS DOES
- Hosts the game and its AI passenger-reaction backend together.
- Interviewers only need a browser and internet connection. They do not need Node.js.
- The OpenAI API key stays in Render's server environment and is never placed in the HTML.
- If AI is unavailable, the game's built-in fallback dialogue remains active.

DEPLOY
1. Create a GitHub repository and upload every file in this folder to its ROOT.
2. Create/sign in to a Render account: https://render.com
3. In Render, choose New -> Blueprint and connect the GitHub repository.
4. Render detects render.yaml and creates the web service.
5. In the service's Environment settings, add OPENAI_API_KEY with your own OpenAI API key.
6. Keep OPENAI_MODEL as gpt-5.5 unless you intentionally choose another model available to your API account.
7. Deploy. Render will provide a public https://...onrender.com URL.
8. Open that URL. The game should show PASSENGER AI: READY when the key is configured.

IMPORTANT
- Never put the OpenAI API key in index.html, GitHub, or any public file.
- The hosted backend limits each IP to 12 AI reaction requests per minute. The game also has an in-game reaction cooldown.
- AI reactions require internet access and API billing/credits. Fallback reactions work without AI.
- Render's free service may sleep after inactivity. The first load after sleeping can take longer, so open the game once before an interview and test it.
- This folder is a deployment-ready project, not yet a live deployment. A Render account connection and a GitHub repository are required to publish it.
