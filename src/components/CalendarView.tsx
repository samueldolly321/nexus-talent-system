import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Trash2, Plus, X, Loader2 } from "lucide-react";
import TopBar from "./TopBar";
import { Candidate, Interview, User } from "../types";
import { apiFetch } from "../lib/api";

interface CalendarViewProps {
  activeUser: User | null;
  candidates: Candidate[];
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function CalendarView({ activeUser, candidates }: CalendarViewProps) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past" | "all">("upcoming");

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [form, setForm] = useState({ candidateId: "", date: "", time: "", type: "RH", notes: "" });
  const [saving, setSaving] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/interviews");
      const data = res.ok ? await res.json() : [];
      setInterviews(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Erreur chargement des entretiens:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInterviews(); }, []);

  const filtered = useMemo(() => {
    const t = todayISO();
    return interviews.filter(iv => {
      if (tab === "upcoming") return iv.date >= t;
      if (tab === "past") return iv.date < t;
      return true;
    });
  }, [interviews, tab]);

  // Groupé par date, ordre chronologique.
  const grouped = useMemo(() => {
    const acc: Record<string, Interview[]> = {};
    for (const iv of filtered) {
      (acc[iv.date] ??= []).push(iv);
    }
    return Object.entries(acc).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Annuler cet entretien ?")) return;
    try {
      const res = await apiFetch(`/api/interviews/${id}`, { method: "DELETE" });
      if (res.ok) setInterviews(prev => prev.filter(iv => iv.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const openPlan = () => {
    setForm({ candidateId: candidates[0]?.id ?? "", date: "", time: "", type: "RH", notes: "" });
    setPlanError(null);
    setShowPlanModal(true);
  };

  const handlePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setPlanError(null);
    if (!form.candidateId || !form.date || !form.time) {
      setPlanError("Candidat, date et heure sont requis.");
      return;
    }
    setSaving(true);
    try {
      const cand = candidates.find(c => c.id === form.candidateId);
      const res = await apiFetch("/api/interviews", {
        method: "POST",
        body: JSON.stringify({
          candidateId: form.candidateId,
          jobId: cand?.jobId,
          date: form.date,
          time: form.time,
          type: form.type,
          notes: form.notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Échec de la planification.");
      }
      setShowPlanModal(false);
      await fetchInterviews();
    } catch (err: any) {
      setPlanError(err?.message || "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 bg-transparent min-h-screen flex flex-col">
      <TopBar activeUser={activeUser} />
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-on-surface font-sans flex items-center gap-2">
              <Calendar size={24} className="text-secondary" />
              Calendrier des entretiens
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">Planifiez et suivez les entretiens des candidats.</p>
          </div>
          <button
            onClick={openPlan}
            className="bg-accent hover:brightness-110 text-on-primary font-bold px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 shadow-sm transition-colors shrink-0"
          >
            <Plus size={16} className="stroke-[3]" />
            Planifier
          </button>
        </div>

        {/* Onglets */}
        <div className="flex gap-6 border-b border-outline-variant mb-6">
          {([["upcoming", "À venir"], ["past", "Passés"], ["all", "Tous"]] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`pb-3 text-sm font-medium border-b-2 transition-all ${
                tab === value ? "border-secondary text-secondary font-bold" : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-secondary mx-auto" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="mx-auto text-on-surface-variant mb-4" size={44} />
            <p className="text-on-surface-variant">Aucun entretien planifié</p>
            <button onClick={openPlan} className="mt-4 px-4 py-2 bg-secondary text-white rounded-lg text-sm font-bold">
              Planifier le premier entretien
            </button>
          </div>
        ) : (
          grouped.map(([date, ivs]) => (
            <div key={date} className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 rounded-full bg-secondary" />
                <h3 className="font-mono text-xs uppercase tracking-wider text-on-surface-variant">
                  {new Date(date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                </h3>
              </div>
              {ivs.map(iv => (
                <div key={iv.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 mb-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="text-center bg-secondary-container rounded-lg p-3 w-16 shrink-0">
                      <p className="font-bold text-on-secondary-container text-lg leading-none">{iv.time}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-on-surface truncate">{iv.candidate?.name ?? "—"}</p>
                      <p className="text-sm text-on-surface-variant truncate">{iv.candidate?.jobTitle ?? "—"}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-surface-container text-on-surface-variant">{iv.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {iv.notes && <p className="hidden sm:block text-xs text-on-surface-variant max-w-[200px] truncate">{iv.notes}</p>}
                    <button
                      onClick={() => handleDelete(iv.id)}
                      className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
                      title="Annuler l'entretien"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Modal : planifier un entretien */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setShowPlanModal(false)}>
          <div className="w-full max-w-md bg-surface-container-lowest rounded-xl p-6 shadow-[0px_10px_25px_rgba(15,23,42,0.08)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-sans text-lg font-semibold text-on-surface">Planifier un entretien</h3>
              <button type="button" onClick={() => setShowPlanModal(false)} disabled={saving} className="text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-40"><X size={20} /></button>
            </div>
            <form onSubmit={handlePlan} className="space-y-4">
              <div>
                <label htmlFor="plan-cand" className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">Candidat <span className="text-error">*</span></label>
                <select id="plan-cand" required value={form.candidateId} onChange={e => setForm(f => ({ ...f, candidateId: e.target.value }))} className="w-full bg-surface-container-lowest border border-outline-variant rounded-[8px] px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all">
                  <option value="">— Sélectionner —</option>
                  {candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="plan-date" className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">Date <span className="text-error">*</span></label>
                  <input id="plan-date" type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-surface-container-lowest border border-outline-variant rounded-[8px] px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all" />
                </div>
                <div>
                  <label htmlFor="plan-time" className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">Heure <span className="text-error">*</span></label>
                  <input id="plan-time" type="time" required value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="w-full bg-surface-container-lowest border border-outline-variant rounded-[8px] px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all" />
                </div>
              </div>
              <div>
                <label htmlFor="plan-type" className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">Type</label>
                <select id="plan-type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full bg-surface-container-lowest border border-outline-variant rounded-[8px] px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all">
                  <option value="RH">RH</option>
                  <option value="Technique">Technique</option>
                  <option value="Final">Final</option>
                </select>
              </div>
              <div>
                <label htmlFor="plan-notes" className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">Notes</label>
                <textarea id="plan-notes" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-surface-container-lowest border border-outline-variant rounded-[8px] px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all resize-y" placeholder="Sujets à aborder, participants…" />
              </div>
              {planError && <p className="text-error text-sm">{planError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowPlanModal(false)} disabled={saving} className="h-10 px-4 rounded-[8px] text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-all disabled:opacity-40">Annuler</button>
                <button type="submit" disabled={saving} className="h-10 px-4 bg-accent hover:bg-accent-dark text-white rounded-[8px] text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50">
                  {saving && <Loader2 size={16} className="animate-spin" />}{saving ? "Planification…" : "Planifier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
