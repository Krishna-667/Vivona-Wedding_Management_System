"use client";

import * as React from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  recordCheckinAction,
  logIncidentAction,
  resolveIncidentAction,
  shiftScheduleAction,
} from "@/app/actions/employee";
import type { ScheduleEntry, VendorCheckin, Incident, Vendor, IncidentSeverity } from "@/types/database";

interface LiveEventConsoleProps {
  wedding: {
    id: string;
    code: string;
    title: string;
    venue: string;
    city: string;
    start_date: string;
  };
  initialSchedule: ScheduleEntry[];
  initialCheckins: Array<VendorCheckin & { vendor?: Vendor }>;
  initialIncidents: Incident[];
  userRole: "admin" | "employee";
  userId: string;
}

export function LiveEventConsole({
  wedding,
  initialSchedule,
  initialCheckins,
  initialIncidents,
  userRole,
  userId,
}: LiveEventConsoleProps) {
  const [activeTab, setActiveTab] = React.useState<"timeline" | "checkins" | "incidents">("timeline");
  const [schedule, setSchedule] = React.useState<ScheduleEntry[]>(initialSchedule);
  const [checkins, setCheckins] = React.useState<Array<VendorCheckin & { vendor?: Vendor }>>(initialCheckins);
  const [incidents, setIncidents] = React.useState<Incident[]>(initialIncidents);

  // Incident Modal State
  const [incidentModalOpen, setIncidentModalOpen] = React.useState(false);
  const [incidentTitle, setIncidentTitle] = React.useState("");
  const [incidentSeverity, setIncidentSeverity] = React.useState<IncidentSeverity>("medium");
  const [incidentDescription, setIncidentDescription] = React.useState("");
  const [submittingIncident, setSubmittingIncident] = React.useState(false);

  // Resolution Modal State
  const [resolveModalId, setResolveModalId] = React.useState<string | null>(null);
  const [resolutionText, setResolutionText] = React.useState("");
  const [submittingResolution, setSubmittingResolution] = React.useState(false);

  // Shift Modal State
  const [shiftEntryId, setShiftEntryId] = React.useState<string | null>(null);
  const [shiftMinutes, setShiftMinutes] = React.useState(15);
  const [submittingShift, setSubmittingShift] = React.useState(false);

  // Supabase Realtime Subscription
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`live-wedding-${wedding.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vendor_checkins",
          filter: `wedding_id=eq.${wedding.id}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setCheckins((prev) =>
              prev.map((c) => (c.id === payload.new.id ? { ...c, ...payload.new } : c))
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "incidents",
          filter: `wedding_id=eq.${wedding.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setIncidents((prev) => [payload.new as Incident, ...prev]);
            toast.error(`[INCIDENT] ${payload.new.title}`);
          } else if (payload.eventType === "UPDATE") {
            setIncidents((prev) =>
              prev.map((inc) => (inc.id === payload.new.id ? (payload.new as Incident) : inc))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wedding.id]);

  // Handlers
  const handleCheckin = async (checkinId: string, status: "arrived" | "late" | "no_show") => {
    // Optimistic update
    setCheckins((prev) =>
      prev.map((c) => (c.id === checkinId ? { ...c, status, arrived_at: status === "arrived" ? new Date().toISOString() : c.arrived_at } : c))
    );

    const res = await recordCheckinAction(checkinId, status);
    if (!res.ok) {
      toast.error(res.error || "Failed to update vendor status.");
    } else {
      toast.success(`Vendor marked as ${status.replace("_", " ")}.`);
    }
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentTitle || !incidentDescription) {
      toast.error("Please fill in incident title and description.");
      return;
    }

    setSubmittingIncident(true);
    const res = await logIncidentAction(wedding.id, incidentTitle, incidentSeverity, incidentDescription);
    setSubmittingIncident(false);

    if (!res.ok) {
      toast.error(res.error || "Failed to log incident.");
    } else {
      toast.success("Incident logged successfully.");
      setIncidentTitle("");
      setIncidentDescription("");
      setIncidentModalOpen(false);
    }
  };

  const handleResolveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModalId || !resolutionText) return;

    setSubmittingResolution(true);
    const res = await resolveIncidentAction(resolveModalId, resolutionText);
    setSubmittingResolution(false);

    if (!res.ok) {
      toast.error(res.error || "Failed to resolve incident.");
    } else {
      toast.success("Incident resolved and recorded in audit log.");
      setResolveModalId(null);
      setResolutionText("");
    }
  };

  const handleShiftSchedule = async () => {
    if (!shiftEntryId) return;

    setSubmittingShift(true);
    const res = await shiftScheduleAction(wedding.id, shiftEntryId, shiftMinutes);
    setSubmittingShift(false);

    if (!res.ok) {
      toast.error(res.error || "Failed to shift schedule.");
    } else {
      toast.success(`Remaining timeline shifted by +${shiftMinutes} minutes.`);
      setShiftEntryId(null);
    }
  };

  // Metrics
  const arrivedCount = checkins.filter((c) => c.status === "arrived").length;
  const lateCount = checkins.filter((c) => c.status === "late").length;
  const openIncidentsCount = incidents.filter((i) => i.status !== "resolved").length;

  return (
    <div className="space-y-6">
      {/* Live Operational Banner */}
      <div className="rounded-2xl border border-gold-400/40 bg-card p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sage-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-sage-600">
              Live Day Console · Realtime Active
            </span>
            <span className="font-mono text-xs font-bold text-maroon bg-maroon/10 px-2 py-0.5 rounded">
              {wedding.code}
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal mt-1">
            {wedding.title}
          </h1>
          <p className="text-xs text-charcoal/70 mt-0.5">
            📍 {wedding.venue} · 📅 Ceremony Date: {wedding.start_date}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIncidentModalOpen(true)}
            className="rounded-xl bg-terracotta text-ivory px-4 py-2 text-xs font-semibold hover:bg-terracotta/90 transition-all shadow-xs flex items-center gap-1.5"
          >
            <span>⚠️</span>
            <span>Log Emergency Incident</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-3 text-xs">
        <button
          onClick={() => setActiveTab("timeline")}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            activeTab === "timeline"
              ? "bg-maroon text-ivory font-semibold shadow-xs"
              : "text-charcoal/70 hover:bg-ivory-200"
          }`}
        >
          ⏱️ Minute-by-Minute Timeline ({schedule.length})
        </button>

        <button
          onClick={() => setActiveTab("checkins")}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            activeTab === "checkins"
              ? "bg-maroon text-ivory font-semibold shadow-xs"
              : "text-charcoal/70 hover:bg-ivory-200"
          }`}
        >
          🚚 Vendor Check-in Board ({arrivedCount}/{checkins.length} Arrived)
        </button>

        <button
          onClick={() => setActiveTab("incidents")}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            activeTab === "incidents"
              ? "bg-maroon text-ivory font-semibold shadow-xs"
              : "text-charcoal/70 hover:bg-ivory-200"
          }`}
        >
          🚨 Incidents Log ({openIncidentsCount} Open)
        </button>
      </div>

      {/* 1. TIMELINE TAB */}
      {activeTab === "timeline" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs text-charcoal/60 px-1">
            <span>Ritual & Reception Schedule</span>
            <span>One-tap delay shift propagates to subsequent events</span>
          </div>

          <div className="divide-y divide-border/60 rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            {schedule.map((entry, idx) => (
              <div
                key={entry.id}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                  entry.status === "in_progress"
                    ? "bg-gold-50/50 border-l-4 border-l-gold-500"
                    : entry.status === "completed"
                    ? "opacity-60 bg-ivory-100/30"
                    : ""
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-maroon">
                      {entry.start_time} – {entry.end_time}
                    </span>
                    {entry.status === "in_progress" && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-gold-200 text-gold-800 animate-pulse">
                        NOW HAPPENING
                      </span>
                    )}
                    {entry.status === "completed" && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sage-100 text-sage-700">
                        ✓ COMPLETED
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-charcoal">
                    {entry.title}
                  </h3>
                  <p className="text-xs text-charcoal/60">
                    📍 {entry.location}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShiftEntryId(entry.id);
                    }}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-charcoal hover:border-gold-400 font-medium"
                  >
                    +15m Shift
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. VENDOR CHECK-IN BOARD */}
      {activeTab === "checkins" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-border bg-card p-3">
              <span className="text-charcoal/60">Total Vendors</span>
              <p className="font-serif text-xl font-bold text-charcoal">{checkins.length}</p>
            </div>
            <div className="rounded-xl border border-sage-200 bg-sage-50/50 p-3">
              <span className="text-sage-700 font-medium">On-Site & Arrived</span>
              <p className="font-serif text-xl font-bold text-sage-700">{arrivedCount}</p>
            </div>
            <div className="rounded-xl border border-terracotta/30 bg-terracotta/5 p-3">
              <span className="text-terracotta font-medium">Flagged Late</span>
              <p className="font-serif text-xl font-bold text-terracotta">{lateCount}</p>
            </div>
            <div className="rounded-xl border border-gold-300 bg-gold-50/50 p-3">
              <span className="text-gold-700 font-medium">Grace Window</span>
              <p className="font-serif text-xl font-bold text-gold-700">15 Mins</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {checkins.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600 bg-gold-100 px-2 py-0.5 rounded">
                      {item.vendor?.category || "Vendor"}
                    </span>
                    <h3 className="font-serif text-lg font-semibold text-charcoal mt-1">
                      {item.vendor?.name || "Service Partner"}
                    </h3>
                    <p className="text-xs text-charcoal/60">
                      Expected at: {new Date(item.expected_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} (Grace: {item.grace_minutes}m)
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      item.status === "arrived"
                        ? "bg-sage-100 text-sage-700 border border-sage-300"
                        : item.status === "late"
                        ? "bg-terracotta/10 text-terracotta border border-terracotta/30"
                        : "bg-gold-100 text-gold-800"
                    }`}
                  >
                    {item.status.toUpperCase()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
                  <button
                    onClick={() => handleCheckin(item.id, "arrived")}
                    className="flex-1 rounded-lg bg-sage-600 text-ivory py-1.5 text-xs font-semibold hover:bg-sage-700 transition-colors"
                  >
                    ✓ Mark Arrived
                  </button>
                  <button
                    onClick={() => handleCheckin(item.id, "late")}
                    className="rounded-lg border border-terracotta/40 text-terracotta px-3 py-1.5 text-xs font-medium hover:bg-terracotta/10 transition-colors"
                  >
                    Flag Late
                  </button>
                  <button
                    onClick={() => handleCheckin(item.id, "no_show")}
                    className="rounded-lg border border-border text-charcoal/60 px-3 py-1.5 text-xs font-medium hover:bg-ivory-200"
                  >
                    No-Show
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. INCIDENTS LOG */}
      {activeTab === "incidents" && (
        <div className="space-y-4">
          {incidents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-xs text-charcoal/60">
              No incidents reported for this celebration. Live operations proceeding normally.
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  className={`rounded-2xl border p-5 space-y-3 shadow-xs ${
                    inc.severity === "critical"
                      ? "border-maroon/40 bg-maroon/5 ring-1 ring-maroon/20"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            inc.severity === "critical"
                              ? "bg-maroon text-ivory"
                              : inc.severity === "high"
                              ? "bg-terracotta text-ivory"
                              : "bg-gold-100 text-gold-800"
                          }`}
                        >
                          {inc.severity} Severity
                        </span>
                        <span className="text-[11px] text-charcoal/50">
                          {new Date(inc.created_at).toLocaleTimeString("en-IN")}
                        </span>
                      </div>
                      <h3 className="font-serif text-lg font-semibold text-charcoal">
                        {inc.title}
                      </h3>
                      <p className="text-xs text-charcoal/70 leading-relaxed font-sans">
                        {inc.description}
                      </p>
                    </div>

                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        inc.status === "resolved"
                          ? "bg-sage-100 text-sage-700"
                          : "bg-gold-100 text-gold-800"
                      }`}
                    >
                      {inc.status.toUpperCase()}
                    </span>
                  </div>

                  {inc.resolution && (
                    <div className="p-3 rounded-xl bg-sage-50/60 border border-sage-200 text-xs space-y-1">
                      <span className="font-bold text-sage-800 block">✓ Resolution Note:</span>
                      <p className="text-charcoal/80">{inc.resolution}</p>
                    </div>
                  )}

                  {inc.status !== "resolved" && (
                    <div className="pt-2 border-t border-border/60 flex justify-end">
                      <button
                        onClick={() => {
                          setResolveModalId(inc.id);
                          setResolutionText("");
                        }}
                        className="rounded-lg bg-sage-600 text-ivory px-3 py-1.5 text-xs font-semibold hover:bg-sage-700"
                      >
                        Resolve Incident →
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Incident Modal */}
      {incidentModalOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-lg w-full space-y-4 shadow-xl">
            <h3 className="font-serif text-xl font-semibold text-charcoal">
              Log Emergency Live Incident
            </h3>
            <form onSubmit={handleCreateIncident} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">Incident Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Florist cold-storage truck breakdown"
                  value={incidentTitle}
                  onChange={(e) => setIncidentTitle(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">Severity</label>
                <select
                  value={incidentSeverity}
                  onChange={(e) => setIncidentSeverity(e.target.value as IncidentSeverity)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="low">Low (Minor cosmetic / vendor delay)</option>
                  <option value="medium">Medium (Requires coordinator action)</option>
                  <option value="high">High (Threatens ritual timing)</option>
                  <option value="critical">Critical (Power, safety, or legal stop)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">Description & Immediate Action</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail exact situation, impact on guests/schedule, and initial steps taken..."
                  value={incidentDescription}
                  onChange={(e) => setIncidentDescription(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIncidentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs text-charcoal"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIncident}
                  className="px-4 py-2 rounded-xl bg-terracotta text-ivory text-xs font-semibold"
                >
                  {submittingIncident ? "Recording..." : "Broadcast Incident"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift Modal */}
      {shiftEntryId && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-serif text-lg font-semibold text-charcoal">
              Shift Timeline by Delay
            </h3>
            <p className="text-xs text-charcoal/70">
              Shifting will advance this ceremony and all subsequent events on this day by the specified minutes.
            </p>
            <div>
              <label className="block text-xs font-semibold text-charcoal mb-1">Shift Duration (Minutes)</label>
              <select
                value={shiftMinutes}
                onChange={(e) => setShiftMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
              >
                <option value={10}>+10 Minutes</option>
                <option value={15}>+15 Minutes</option>
                <option value={30}>+30 Minutes</option>
                <option value={45}>+45 Minutes</option>
                <option value={60}>+60 Minutes (1 Hour)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShiftEntryId(null)}
                className="px-3 py-1.5 rounded-lg border text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleShiftSchedule}
                disabled={submittingShift}
                className="px-4 py-1.5 rounded-lg bg-maroon text-ivory text-xs font-semibold"
              >
                {submittingShift ? "Shifting..." : "Confirm Shift"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolution Modal */}
      {resolveModalId && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-serif text-lg font-semibold text-charcoal">
              Resolve Incident
            </h3>
            <form onSubmit={handleResolveIncident} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">Resolution Details</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain how the incident was mitigated, assets deployed, or vendor actions..."
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolveModalId(null)}
                  className="px-3 py-1.5 rounded-lg border text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResolution}
                  className="px-4 py-1.5 rounded-lg bg-sage-600 text-ivory text-xs font-semibold"
                >
                  {submittingResolution ? "Saving..." : "Mark Resolved"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
