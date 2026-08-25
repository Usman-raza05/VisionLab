# Vision Lab — Local Setup (100% Free)

Ye version **Google Gemini API** use karta hai (Anthropic ki jagah) kyunki Gemini free hai —
no credit card, no expiration.

## Step 1: Free Gemini API key lo
1. https://aistudio.google.com pe jao
2. Apne Google account se sign in karo (jo Gmail use karte ho wahi)
3. Left sidebar me "Get API key" pe click karo
4. "Create API key" click karo → key generate ho jaayegi
5. Copy kar lo (koi card/payment nahi maangega)

## Step 2: Dependencies install karo
Terminal me project folder ke andar jaake:

```bash
npm install
```

## Step 3: API key set karo
`.env.example` file ko `.env` naam se copy karo:

```bash
cp .env.example .env
```

Fir `.env` file kholke apni Gemini key daalo:

```
GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxx
```

## Step 4: Backend server start karo
Ek terminal window me:

```bash
npm run server
```

Ye chalega: `http://localhost:3001`

## Step 5: Frontend start karo
Dusre terminal window me (naya tab/window kholke):

```bash
npm run dev
```

Terminal me ek link milega, generally: `http://localhost:5173`

## Step 6: Browser me kholo
`http://localhost:5173` browser me kholo aur image upload karke try karo.

---

## Free tier limits (Gemini 2.5 Flash)
- 1,500 requests/day
- 15 requests/minute
- Koi expiry nahi, koi card nahi

Simple personal project ke liye ye kaafi zyada hai — din me 1,500 image scans free.

**Note:** Free tier pe Google tumhare prompts/images ko apne models improve karne ke liye
use kar sakta hai. Bahut sensitive/private images is project me test na karo.

---

### Common issues
- **"GEMINI_API_KEY .env me nahi mili"** → `.env` file sahi jagah (root folder) me hai ya nahi check karo, aur server restart karo
- **Analyze pe error aaye** → backend terminal (jahan `npm run server` chala) me error dekho, wahi asli reason dikhega
- **Port already in use** → `server.js` me `PORT` number badal do (jaise 3002), aur `App.jsx` me bhi wahi URL update karo
