# RealTime-Grid

A real-time shared grid app where users can claim blocks on a shared board. All changes are instantly visible to everyone online.

## Features

- 🟩 **Interactive Grid:** Hundreds of blocks, each can be claimed by a user.
- ⚡ **Real-Time Updates:** All users see changes instantly via WebSockets.
- 👥 **Multi-User:** Multiple users can play at the same time without conflicts.
- 🖱️ **Simple UI:** Clean, modern, and smooth interactions.

## How It Works

- The app displays a grid/map with hundreds of blocks.
- Blocks can be unclaimed or owned by a user.
- When a user clicks a block, it is assigned to them and everyone else sees the update immediately.
- The backend manages users, block ownership, and resolves conflicts.

## Tech Stack & Choices

- **Frontend:** React + Vite
  - Clean, interactive UI with smooth updates.
  - Connects to backend via WebSockets for real-time updates.
- **Backend:** Node.js + Express + Socket.IO
  - Handles user sessions, block ownership, and real-time communication.
  - Uses Redis for fast state management and pub/sub for scaling real-time events.
- **Database:** Redis (in-memory, fast, perfect for real-time state)
- **Deployment:**
  - Frontend: Vercel (static hosting, fast global CDN)
  - Backend: Render (Node.js server with WebSocket support)
  - Redis: Managed Redis on Render

## Running Locally

1. **Clone the repo:**
   ```sh
   git clone https://github.com/your-username/RealTime-Grid.git
   cd RealTime-Grid
   ```
2. **Set up environment variables:**
   - Copy `.env.example` to `.env.production` and fill in real values for frontend.
   - In `server/`, copy `.env.example` to `.env.production` and fill in real values for backend.
3. **Start Redis:**
   - Make sure you have Redis running locally or use a cloud Redis URL.
4. **Start the backend:**
   ```sh
   cd server
   npm install
   npm start
   ```
5. **Start the frontend:**
   ```sh
   cd ..
   npm install
   npm run dev
   ```
6. **Open the app:**
   - Visit `http://localhost:5173` in your browser.

## Deployment

- **Frontend:** Deploy to Vercel. Set `VITE_BACKEND_URL` to your backend’s Render URL.
- **Backend:** Deploy to Render as a Web Service. Set `CLIENT_ORIGIN` to your Vercel frontend URL and `REDIS_URL` to your managed Redis instance.
- **Redis:** Use Render’s managed Redis or any cloud Redis provider.

## Bonus Features (Optional)

- User names/colors
- Leaderboard and stats
- Zoom/pan for large maps
- Animations and micro-interactions

## What We’re Evaluating

- System design and real-time handling
- UI/UX quality and clarity
- Code quality and structure
- Thoughtful handling of real-time conflicts

A smaller, well-built solution is better than a huge, half-done one. Enjoy building!