# BFHL 

REST API + Frontend for hierarchical tree analysis.

## Project Structure
```
bfhl/
├── backend/       → Express API (POST /bfhl)
│   ├── index.js
│   ├── package.json
│   └── vercel.json
└── frontend/
    └── index.html → Single-page UI
```

## Backend Setup

```bash
cd backend
npm install
npm start          # runs on port 3000
```

### Deploy to Vercel (Backend)
```bash
cd backend
npx vercel --prod
```

### Deploy to Render
- New Web Service → connect repo → Root Directory: `backend`
- Build: `npm install` | Start: `node index.js`

---

## Frontend Setup

The frontend is a single `index.html` file — no build step needed.

### Deploy to Vercel (Frontend)
```bash
cd frontend
npx vercel --prod
```

### Deploy to Netlify
Drag-and-drop the `frontend/` folder at app.netlify.com.

---

## Update Your Credentials

In `backend/index.js`, update lines 7–9:
```js
const USER_ID        = "yourname_ddmmyyyy";
const EMAIL_ID       = "your@srm.edu.in";
const ROLL_NUMBER    = "RAXXXXXXXXXX";
```

---

## API

**POST** `/bfhl`

```json
{ "data": ["A->B", "A->C", "B->D"] }
```

Returns hierarchies, invalid entries, duplicate edges, and summary.
