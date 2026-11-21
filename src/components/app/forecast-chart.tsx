import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { categorizeAqi, type HourlyPoint } from "@/lib/domain/aqi";
import { formatHour } from "@/lib/domain/recommendations";
import { AQI_FILL_VAR } from "@/lib/ui/constants";

export function ForecastChart({ points }: { points: HourlyPoint[] }) {
  const data = points
    .slice(0, 24)
    .filter((p) => p.aqi !== null)
    .map((p) => ({ hour: formatHour(p.time), aqi: Math.round(p.aqi as number), pm25: p.pm25 }));

  if (data.length === 0)
    return <p className="text-sm text-muted-foreground">No hourly forecast available.</p>;
  const max = Math.max(...data.map((d) => d.aqi));
  const min = Math.min(...data.map((d) => d.aqi));

  return (
    <figure>
      <figcaption className="sr-only">
        Hourly US AQI forecast for the next {data.length} hours, ranging from {min} to {max}. A data
        table follows.
      </figcaption>
      <div className="h-48 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              interval={3}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => [`${v} (${categorizeAqi(v).label})`, "AQI"]}
            />
            <Bar dataKey="aqi" radius={[3, 3, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={AQI_FILL_VAR[categorizeAqi(d.aqi).level]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Show forecast as a table
        </summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Hourly forecast</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-1 pr-4 font-medium">
                  Hour
                </th>
                <th scope="col" className="py-1 pr-4 font-medium">
                  US AQI
                </th>
                <th scope="col" className="py-1 font-medium">
                  PM2.5 (µg/m³)
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1 pr-4">{d.hour}</td>
                  <td className="py-1 pr-4 font-mono">
                    {d.aqi}{" "}
                    <span className="text-muted-foreground">({categorizeAqi(d.aqi).label})</span>
                  </td>
                  <td className="py-1 font-mono">{d.pm25 ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
