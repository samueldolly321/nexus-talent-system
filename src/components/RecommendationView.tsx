import React, { useState } from "react";
import { ChevronRight, Star, TrendingUp, AlertTriangle, CalendarCheck, Share2, BadgeCheck, X, Loader2 } from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import TopBar from "./TopBar";
import { Candidate, Job, User } from "../types";

interface RecommendationViewProps {
  candidate: Candidate;
  job: Job | undefined;
  activeUser: User | null;
  onBack: () => void;
}

// Classes partagées des modals (cohérentes avec le reste de l'app).
const LABEL_CLS = "block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5";
const INPUT_CLS = "w-full bg-white border border-outline-variant rounded-[8px] px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all";
const CANCEL_CLS = "h-10 px-4 rounded-[8px] text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-all disabled:opacity-40";
const SUBMIT_CLS = "h-10 px-4 bg-primary text-white rounded-[8px] text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

export default function RecommendationView({ candidate, job, activeUser, onBack }: RecommendationViewProps) {
  const scores = candidate.scores;
  const rec = candidate.recommendation;
  const successRate = scores?.globalScore ?? 0;

  // Un seul modal ouvert à la fois : planifier un entretien ou partager le profil.
  const [modal, setModal] = useState<null | "interview" | "share">(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null); // message de confirmation

  const [interview, setInterview] = useState({ date: "", time: "", type: "RH", notes: "" });
  const [share, setShare] = useState({ email: "", message: "" });

  const closeModal = () => { if (!saving) { setModal(null); setFormError(null); } };

  const openInterview = () => { setInterview({ date: "", time: "", type: "RH", notes: "" }); setFormError(null); setModal("interview"); };
  const openShare = () => { setShare({ email: "", message: "" }); setFormError(null); setModal("share"); };

  // POST /api/audit-logs — trace l'action côté serveur.
  const postAuditLog = async (action: string, details: string) => {
    const res = await apiFetch("/api/audit-logs", { method: "POST", body: JSON.stringify({ action, details }) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Échec de l'enregistrement.");
    }
  };

  const submit = (build: () => { action: string; details: string; confirm: string }) => async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const { action, details, confirm } = build();
      await postAuditLog(action, details);
      setModal(null);
      setDone(confirm);
    } catch (err: any) {
      setFormError(err?.message || "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  const donutData = [
    { name: "score", value: successRate },
    { name: "rest", value: 100 - successRate }
  ];

  const compatData = scores
    ? [
        { subject: "Compétences", value: scores.skillsScore },
        { subject: "Cognitif", value: scores.softSkillsScore },
        { subject: "Culture", value: scores.educationScore },
        { subject: "Expérience", value: scores.experienceScore }
      ]
    : [];

  return (
    <div className="flex-1 bg-background min-h-screen flex flex-col">
      <TopBar
        activeUser={activeUser}
        breadcrumb={
          <div className="flex items-center gap-2 text-sm min-w-0">
            <button onClick={onBack} className="text-on-surface-variant hover:text-secondary font-medium shrink-0">Pipeline</button>
            <ChevronRight size={14} className="text-on-surface-variant shrink-0" />
            <span className="text-on-surface-variant shrink-0">{job?.title || "—"}</span>
            <ChevronRight size={14} className="text-on-surface-variant shrink-0" />
            <span className="font-bold text-secondary truncate">{candidate.name} — Recommandation IA</span>
          </div>
        }
      />

      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <div className="bg-white border border-outline-variant rounded-xl p-6">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="w-16 h-16 rounded-full bg-primary-fixed-dim flex items-center justify-center font-bold text-xl text-on-primary-fixed shrink-0">
                {candidate.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="font-sans text-2xl font-bold text-on-surface">{candidate.name}</h2>
                  <span className="px-2.5 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-mono font-bold rounded-full flex items-center gap-1">
                    <BadgeCheck size={12} />Expert vérifié par l'IA
                  </span>
                </div>
                <p className="text-on-surface-variant text-sm mt-1">{job?.title || "—"} | {candidate.analysis?.yearsOfExperience ?? "—"}+ ans d'expérience</p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {(candidate.analysis?.skills.frameworks || []).slice(0, 3).map(s => (
                    <span key={s} className="px-2.5 py-1 bg-surface-container text-secondary text-xs font-medium rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6">
            <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold mb-2">Recommandation finale IA</p>
            <h3 className="font-sans text-xl font-bold text-secondary flex items-center gap-2 mb-3">
              <Star size={20} className="fill-secondary text-secondary" />
              {rec?.suggestedDecision === "Entretien" ? "Fort potentiel — Passer en entretien" : rec?.suggestedDecision === "Réserve" ? "Potentiel modéré — À garder en réserve" : rec?.suggestedDecision === "Rejet" ? "Faible correspondance — Non recommandé" : "Analyse en attente"}
            </h3>
            <p className="text-sm text-on-surface leading-relaxed">
              {rec?.compatibilityExplanation || "Lancez l'analyse IA depuis la fiche candidat pour obtenir une recommandation détaillée."}
            </p>
          </div>

          {rec && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-outline-variant rounded-xl p-6">
                <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-secondary" />Points forts</h3>
                <ul className="space-y-2.5">
                  {rec.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-on-surface-variant">
                      <BadgeCheck size={14} className="text-secondary shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white border border-outline-variant rounded-xl p-6">
                <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-on-surface-variant" />Axes de progression</h3>
                <ul className="space-y-2.5">
                  {rec.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-on-surface-variant">
                      <span className="w-3.5 h-3.5 rounded-full border border-outline-variant shrink-0 mt-0.5" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {rec && rec.attentionPoints.length > 0 && (
            <div className="bg-white border border-outline-variant rounded-xl p-6">
              <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-red-500" />Risques potentiels</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rec.attentionPoints.map((point, i) => (
                  <div key={i} className="bg-red-50 border border-red-100 rounded-lg p-4">
                    <p className="font-bold text-red-700 text-sm mb-1">Point d'attention {i + 1}</p>
                    <p className="text-sm text-red-700/80">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <div className="bg-primary-container rounded-xl p-6 text-center">
            <h3 className="font-bold text-white mb-4">Probabilité de réussite</h3>
            <div className="relative h-40 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" innerRadius={55} outerRadius={70} startAngle={90} endAngle={-270} stroke="none">
                    <Cell fill="#4cd7f6" />
                    <Cell fill="rgba(255,255,255,0.1)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <p className="text-3xl font-bold text-white">{successRate}%</p>
              </div>
            </div>
            <p className="font-mono text-[9px] text-secondary-fixed-dim uppercase tracking-wider -mt-2 mb-3">Indice propriétaire</p>
            <p className="text-xs text-inverse-on-surface/70 leading-relaxed">
              D'après l'historique de recrutement pour ce poste, les candidats de ce profil ont un taux de rétention <span className="text-secondary-fixed-dim font-bold">8,4× supérieur</span>.
            </p>
          </div>

          {scores && (
            <div className="bg-white border border-outline-variant rounded-xl p-6">
              <h3 className="font-bold text-on-surface mb-2">Indice de compatibilité</h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={compatData} outerRadius="70%">
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "#45464d" }} />
                    <Radar dataKey="value" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 mt-2">
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-on-surface-variant">Compétences techniques</span><span className="font-bold text-on-surface">{scores.skillsScore}/100</span></div>
                  <div className="w-full bg-surface-container rounded-full h-1.5"><div className="bg-secondary h-1.5 rounded-full" style={{ width: `${scores.skillsScore}%` }} /></div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-on-surface-variant">Alignement culturel</span><span className="font-bold text-on-surface">{scores.educationScore}/100</span></div>
                  <div className="w-full bg-surface-container rounded-full h-1.5"><div className="bg-secondary h-1.5 rounded-full" style={{ width: `${scores.educationScore}%` }} /></div>
                </div>
              </div>
            </div>
          )}

          <button onClick={openInterview} className="w-full bg-primary text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90">
            <CalendarCheck size={16} />Planifier un entretien
          </button>
          <button onClick={openShare} className="w-full border border-outline-variant rounded-lg py-3 font-medium text-sm flex items-center justify-center gap-2 hover:bg-surface-container-low">
            <Share2 size={16} />Partager aux décideurs
          </button>

          {done && (
            <div className="bg-secondary-container/40 border border-secondary-container rounded-lg p-3 text-sm text-on-secondary-container flex items-start justify-between gap-2">
              <span>{done}</span>
              <button onClick={() => setDone(null)} className="shrink-0 text-on-secondary-container/70 hover:text-on-secondary-container"><X size={16} /></button>
            </div>
          )}
        </div>
      </main>

      {/* Modal : planifier un entretien */}
      {modal === "interview" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeModal}>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-xl p-6 shadow-[0px_10px_25px_rgba(15,23,42,0.08)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-sans text-lg font-semibold text-primary">Planifier un entretien</h3>
              <button type="button" onClick={closeModal} disabled={saving} className="text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-40"><X size={20} /></button>
            </div>
            <form
              onSubmit={submit(() => ({
                action: "Entretien planifié",
                details: `Entretien ${interview.type} planifié pour ${candidate.name} le ${interview.date} à ${interview.time}${interview.notes.trim() ? ` — ${interview.notes.trim()}` : ""}`,
                confirm: `Entretien ${interview.type} planifié pour ${candidate.name}.`,
              }))}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="intv-date" className={LABEL_CLS}>Date <span className="text-error">*</span></label>
                  <input id="intv-date" type="date" required value={interview.date} onChange={e => setInterview(d => ({ ...d, date: e.target.value }))} className={INPUT_CLS} />
                </div>
                <div>
                  <label htmlFor="intv-time" className={LABEL_CLS}>Heure <span className="text-error">*</span></label>
                  <input id="intv-time" type="time" required value={interview.time} onChange={e => setInterview(d => ({ ...d, time: e.target.value }))} className={INPUT_CLS} />
                </div>
              </div>
              <div>
                <label htmlFor="intv-type" className={LABEL_CLS}>Type</label>
                <select id="intv-type" value={interview.type} onChange={e => setInterview(d => ({ ...d, type: e.target.value }))} className={INPUT_CLS}>
                  <option value="RH">RH</option>
                  <option value="Technique">Technique</option>
                  <option value="Final">Final</option>
                </select>
              </div>
              <div>
                <label htmlFor="intv-notes" className={LABEL_CLS}>Notes</label>
                <textarea id="intv-notes" rows={3} value={interview.notes} onChange={e => setInterview(d => ({ ...d, notes: e.target.value }))} className={`${INPUT_CLS} resize-y`} placeholder="Sujets à aborder, participants…" />
              </div>
              {formError && <p className="text-error text-sm">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} disabled={saving} className={CANCEL_CLS}>Annuler</button>
                <button type="submit" disabled={saving || !interview.date || !interview.time} className={SUBMIT_CLS}>
                  {saving && <Loader2 size={16} className="animate-spin" />}{saving ? "Enregistrement…" : "Planifier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal : partager aux décideurs */}
      {modal === "share" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeModal}>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-xl p-6 shadow-[0px_10px_25px_rgba(15,23,42,0.08)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-sans text-lg font-semibold text-primary">Partager aux décideurs</h3>
              <button type="button" onClick={closeModal} disabled={saving} className="text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-40"><X size={20} /></button>
            </div>
            <form
              onSubmit={submit(() => ({
                action: "Partage de profil",
                details: `Profil de ${candidate.name} partagé à ${share.email.trim()}${share.message.trim() ? ` — ${share.message.trim()}` : ""}`,
                confirm: `Profil partagé à ${share.email.trim()}.`,
              }))}
              className="space-y-4"
            >
              <div>
                <label htmlFor="share-email" className={LABEL_CLS}>Email du destinataire <span className="text-error">*</span></label>
                <input id="share-email" type="email" required autoFocus value={share.email} onChange={e => setShare(d => ({ ...d, email: e.target.value }))} className={INPUT_CLS} placeholder="decideur@entreprise.com" />
              </div>
              <div>
                <label htmlFor="share-msg" className={LABEL_CLS}>Message (optionnel)</label>
                <textarea id="share-msg" rows={3} value={share.message} onChange={e => setShare(d => ({ ...d, message: e.target.value }))} className={`${INPUT_CLS} resize-y`} placeholder="Un mot pour accompagner le partage…" />
              </div>
              {formError && <p className="text-error text-sm">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} disabled={saving} className={CANCEL_CLS}>Annuler</button>
                <button type="submit" disabled={saving || !share.email.trim()} className={SUBMIT_CLS}>
                  {saving && <Loader2 size={16} className="animate-spin" />}{saving ? "Envoi…" : "Partager"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
