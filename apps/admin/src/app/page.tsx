import { OverviewDashboard } from "./overview-dashboard";

export default function Page() {
  return (
    <main style={{padding: "32px 40px", fontFamily: "system-ui, sans-serif"}}>
      <h1 style={{margin: 0}}>Tami Command Center</h1>
      <p style={{color: "#5a6572", marginTop: 8}}>
        Central operations dashboard for the Sindh electric taxi fleet.
      </p>
      <OverviewDashboard />
    </main>
  );
}
