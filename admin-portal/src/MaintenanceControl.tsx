"use client";

import { useEffect, useState } from "react";
import { api } from "../../app/client";

type Settings = { enabled: boolean; startAt: string | null; endAt: string | null; active: boolean };
type Health = { status: "live" | "maintenance" | "offline" };
const localDateTime = (value: string | null) => value ? value.slice(0, 16) : "";
const iso = (value: string) => value ? new Date(value).toISOString() : null;

export function MaintenanceControl() {
  const [settings, setSettings] = useState<Settings | null>(null), [health, setHealth] = useState<Health>({ status: "offline" }), [enabled, setEnabled] = useState(false), [startAt, setStartAt] = useState(""), [endAt, setEndAt] = useState(""), [message, setMessage] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => { void Promise.all([api<Settings>("/api/maintenance"), api<Health>("/api/health")]).then(([result, service]) => { setSettings(result); setHealth(service); setEnabled(result.enabled); setStartAt(localDateTime(result.startAt)); setEndAt(localDateTime(result.endAt)); }).catch(error => setMessage(error instanceof Error ? error.message : "Unable to load maintenance controls.")); }, 0); return () => window.clearTimeout(timer); }, []);
  async function save() { setMessage(""); try { const result = await api<Settings>("/api/maintenance", { method: "POST", body: JSON.stringify({ enabled, startAt: iso(startAt), endAt: iso(endAt) }) }); setSettings(result); setMessage(result.active ? "Maintenance mode is active." : result.enabled ? "Maintenance schedule saved." : "Website is live."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save maintenance setting."); } }
  const status = health.status === "offline" ? "offline" : settings?.active ? "maintenance" : "live";
  return <section className={"card settings-form maintenance-card " + status}><header><div><p className="eyebrow">PUBLIC WEBSITE</p><h3>Maintenance mode</h3><p className="muted">Turn the public website off now, or set a Riyadh-local start and end time. The staff and admin portals stay available.</p></div><div className="maintenance-status"><i /><span>{status === "live" ? "Live" : status === "maintenance" ? "Under maintenance" : "Offline"}</span><small>{status === "live" ? "Healthy connection" : status === "maintenance" ? "Public page is paused" : "Health check unavailable"}</small></div></header><label className="checkbox-label"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} /> Enable maintenance mode</label><div className="compact-fields"><label>Start time<input type="datetime-local" value={startAt} onChange={event => setStartAt(event.target.value)} /></label><label>End time<input type="datetime-local" value={endAt} onChange={event => setEndAt(event.target.value)} /></label></div><button type="button" className="primary-button" onClick={() => void save()}>Save maintenance setting</button>{settings && <small>{settings.active ? "Currently showing maintenance page." : settings.enabled ? "Scheduled; waiting for its start time." : "Website is currently live."}</small>}{message && <div className={"alert " + (message.includes("Unable") || message.includes("Could not") ? "error" : "success")}>{message}</div>}</section>;
}
