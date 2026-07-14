"use client";

import { useEffect, useState } from "react";

type AdminRideSummary = {
  id: string;
  state: string;
  cityName: string;
  riderPhone: string;
  driverName: string | null;
  pickupAddress: string;
  destinationAddress: string;
  estimatedFareMinor: number | null;
  finalFareMinor: number | null;
  currency: string;
  requestedAt: string;
};

type AdminOverview = {
  generatedAt: string;
  drivers: {online: number; total: number};
  rides: {
    active: number;
    completedToday: number;
    byState: Record<string, number>;
  };
  recentRides: AdminRideSummary[];
};

const pollIntervalMs = 5000;

export function OverviewDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/overview", {cache: "no-store"});
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(payload?.error ?? "Overview request failed");
        }
        const payload = (await response.json()) as AdminOverview;
        if (!cancelled) {
          setOverview(payload);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Overview request failed",
          );
        }
      }
    }

    void load();
    const timer = setInterval(load, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (error != null) {
    return <p role="alert" style={styles.error}>{error}</p>;
  }
  if (overview == null) {
    return <p style={styles.muted}>Loading live operations…</p>;
  }

  return (
    <section>
      <div style={styles.tiles}>
        <Tile label="Active rides" value={overview.rides.active} />
        <Tile label="Completed today" value={overview.rides.completedToday} />
        <Tile
          label="Drivers online"
          value={`${overview.drivers.online} / ${overview.drivers.total}`}
        />
        <Tile
          label="Waiting for driver"
          value={
            (overview.rides.byState.requested ?? 0) +
            (overview.rides.byState.matching ?? 0) +
            (overview.rides.byState.offered_to_driver ?? 0)
          }
        />
      </div>

      <h2 style={styles.heading}>Recent rides</h2>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {["State", "City", "Rider", "Driver", "Pickup", "Destination", "Fare", "Requested"].map(
                (column) => (
                  <th key={column} style={styles.th}>
                    {column}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {overview.recentRides.length === 0 ? (
              <tr>
                <td colSpan={8} style={styles.td}>
                  No rides yet.
                </td>
              </tr>
            ) : (
              overview.recentRides.map((ride) => (
                <tr key={ride.id}>
                  <td style={styles.td}>
                    <span style={styles.state}>{ride.state.replaceAll("_", " ")}</span>
                  </td>
                  <td style={styles.td}>{ride.cityName}</td>
                  <td style={styles.td}>{ride.riderPhone}</td>
                  <td style={styles.td}>{ride.driverName ?? "—"}</td>
                  <td style={styles.td}>{ride.pickupAddress}</td>
                  <td style={styles.td}>{ride.destinationAddress}</td>
                  <td style={styles.td}>{formatFare(ride)}</td>
                  <td style={styles.td}>
                    {new Date(ride.requestedAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p style={styles.muted}>
        Updated {new Date(overview.generatedAt).toLocaleTimeString()} · refreshes
        every {pollIntervalMs / 1000}s
      </p>
    </section>
  );
}

function Tile({label, value}: {label: string; value: number | string}) {
  return (
    <div style={styles.tile}>
      <p style={styles.tileValue}>{value}</p>
      <p style={styles.tileLabel}>{label}</p>
    </div>
  );
}

function formatFare(ride: AdminRideSummary): string {
  const amount = ride.finalFareMinor ?? ride.estimatedFareMinor;
  if (amount == null) {
    return "—";
  }
  return `${ride.currency} ${(amount / 100).toFixed(0)}`;
}

const styles: Record<string, React.CSSProperties> = {
  tiles: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
    margin: "24px 0",
  },
  tile: {
    border: "1px solid #d5dbe3",
    borderRadius: 12,
    padding: "16px 20px",
    background: "#f7f9fb",
  },
  tileValue: {fontSize: 32, fontWeight: 700, margin: 0},
  tileLabel: {margin: "4px 0 0", color: "#5a6572", fontSize: 14},
  heading: {margin: "24px 0 8px"},
  tableWrap: {overflowX: "auto"},
  table: {borderCollapse: "collapse", width: "100%", fontSize: 14},
  th: {
    textAlign: "left",
    borderBottom: "2px solid #d5dbe3",
    padding: "8px 12px",
    whiteSpace: "nowrap",
  },
  td: {
    borderBottom: "1px solid #e6eaef",
    padding: "8px 12px",
    verticalAlign: "top",
  },
  state: {textTransform: "capitalize", fontWeight: 600},
  muted: {color: "#5a6572"},
  error: {color: "#b3261e"},
};
