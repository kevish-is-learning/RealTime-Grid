import { ConnectionPanel } from "./components/ConnectionPanel";
import { Grid } from "./components/Grid";
import { Leaderboard } from "./components/Leaderboard";

export default function App() {
  return (
    <main className="app">
      <div className="app-stack">
        <ConnectionPanel />
        <Leaderboard />
        <Grid />
      </div>
    </main>
  );
}
