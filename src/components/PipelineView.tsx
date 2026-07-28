import React, { useState, useMemo } from "react";
import { MoreHorizontal, Filter, Share2, LayoutGrid, List, Sparkles, FileText, Link2, X, Loader2 } from "lucide-react";
import TopBar from "./TopBar";
import { Candidate, Job, PipelineStage, User } from "../types";
import { apiFetch } from "../lib/api";

interface PipelineViewProps {
  candidates: Candidate[];
  jobs: Job[];
  activeUser: User | null;
  onSelectCandidate: (candidate: Candidate) => void;
  onUpdateStage: (id: string, stage: PipelineStage) => void;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const stageOrder = Object.values(PipelineStage);

export default function PipelineView({ candidates, jobs, activeUser, onSelectCandidate, onUpdateStage, loading, searchQuery, onSearchChange }: PipelineViewProps) {
  const [filterJobId, setFilterJobId] = useState<string>("all");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Filtres avancés, vue et partage.
  const [showFilters, setShowFilters] = useState(false);
  const [filterScore, setFilterScore] = useState<"all" | "excellent" | "bon" | "non-analyse">("all");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const activeFiltersCount = filterScore !== "all" ? 1 : 0;

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareForm, setShareForm] = useState({ email: "", message: "" });
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  const jobTitleFor = (c: Candidate) => jobs.find(j => j.id === c.jobId)?.title ?? "";

  const filteredCandidates = useMemo(() => {
    let result = candidates.filter(c => filterJobId === "all" || c.jobId === filterJobId);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        jobTitleFor(c).toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
      );
    }
    if (filterScore === "excellent") result = result.filter(c => (c.scores?.globalScore ?? 0) >= 80);
    else if (filterScore === "bon") result = result.filter(c => { const s = c.scores?.globalScore ?? 0; return s >= 60 && s < 80; });
    else if (filterScore === "non-analyse") result = result.filter(c => !c.scores?.globalScore);
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, jobs, filterJobId, searchQuery, filterScore]);

  const getStageCandidates = (stage: PipelineStage) => filteredCandidates.filter(c => c.stage === stage);

  const handleDrop = (stage: PipelineStage) => {
    if (draggedId) {
      onUpdateStage(draggedId, stage);
      setDraggedId(null);
    }
  };

  const openShare = () => { setShareForm({ email: "", message: "" }); setShareError(null); setShareSuccess(null); setShowShareModal(true); };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sharing) return;
    setShareError(null);
    if (!shareForm.email.trim()) { setShareError("L'email du destinataire est requis."); return; }
    setSharing(true);
    try {
      const jobLabel = filterJobId === "all" ? "toutes les offres" : (jobs.find(j => j.id === filterJobId)?.title ?? "offre");
      const res = await apiFetch("/api/audit-logs", {
        method: "POST",
        body: JSON.stringify({
          action: "Pipeline partagé",
          details: `Pipeline (${jobLabel}) partagé à ${shareForm.email.trim()}.${shareForm.message.trim() ? " Message : " + shareForm.message.trim() : ""}`,
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Échec du partage."); }
      setShowShareModal(false);
      setShareSuccess(`Pipeline partagé à ${shareForm.email.trim()}.`);
    } catch (err: any) {
      setShareError(err?.message || "Une erreur est survenue.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="flex-1 bg-transparent min-h-screen flex flex-col">
      <TopBar activeUser={activeUser} searchValue={searchQuery} onSearchChange={onSearchChange} searchPlaceholder="Rechercher candidats, postes ou scores..." />

      <main className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col min-h-0">
        <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
          <div>
            <h2 className="font-sans text-2xl md:text-[32px] font-semibold text-on-surface tracking-tight leading-tight">Pipeline de recrutement</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant text-[10px] font-mono uppercase rounded-full font-bold">Poste actif</span>
              <select
                value={filterJobId}
                onChange={e => setFilterJobId(e.target.value)}
                className="bg-transparent text-sm font-medium text-on-surface focus:outline-none border-b border-dashed border-outline-variant"
              >
                <option value="all">Toutes les offres</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
              <span className="text-secondary text-sm font-bold">— {filteredCandidates.length} candidats</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(f => !f)}
              aria-pressed={showFilters}
              className={`px-3 py-2 border rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                showFilters || activeFiltersCount > 0
                  ? "bg-secondary-container border-secondary text-on-secondary-container"
                  : "border-outline-variant hover:bg-surface-container-low"
              }`}
            >
              <Filter size={14} />Filtrer
              {activeFiltersCount > 0 && (
                <span className="bg-secondary text-white rounded-full px-1.5 text-[10px] font-mono leading-4">{activeFiltersCount}</span>
              )}
            </button>
            <button
              onClick={openShare}
              className="px-3 py-2 border border-outline-variant rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-surface-container-low"
            >
              <Share2 size={14} />Partager
            </button>
            <div className="flex border border-outline-variant rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("kanban")}
                title="Vue kanban"
                className={`p-2 ${viewMode === "kanban" ? "bg-surface-container-high text-secondary" : "hover:bg-surface-container-low"}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="Vue liste"
                className={`p-2 ${viewMode === "list" ? "bg-surface-container-high text-secondary" : "hover:bg-surface-container-low"}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {shareSuccess && (
          <div className="mb-4 bg-secondary-container/40 border border-secondary text-on-secondary-container rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-between gap-3">
            <span>{shareSuccess}</span>
            <button onClick={() => setShareSuccess(null)} className="hover:opacity-70"><X size={16} /></button>
          </div>
        )}

        {showFilters && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 mb-4 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-2">Score IA</p>
              {[
                { label: "Excellent (80%+)", value: "excellent" },
                { label: "Bon (60-80%)", value: "bon" },
                { label: "Non analysé", value: "non-analyse" },
                { label: "Tous", value: "all" },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-on-surface cursor-pointer mb-1">
                  <input
                    type="radio"
                    name="scoreFilter"
                    value={opt.value}
                    checked={filterScore === opt.value}
                    onChange={() => setFilterScore(opt.value as typeof filterScore)}
                    className="text-secondary focus:ring-secondary"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            <div className="flex items-end">
              <button onClick={() => setFilterScore("all")} className="text-xs text-secondary hover:underline">
                Réinitialiser
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-secondary mx-auto" />
          </div>
        ) : viewMode === "list" ? (
          <div className="overflow-y-auto flex-1 min-h-0">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead className="bg-surface-container-low font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                    <tr>
                      <th className="px-4 py-3">Candidat</th>
                      <th className="px-4 py-3">Poste</th>
                      <th className="px-4 py-3">Étape</th>
                      <th className="px-4 py-3">Score IA</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.map(c => (
                      <tr
                        key={c.id}
                        onClick={() => onSelectCandidate(c)}
                        className="border-t border-outline-variant hover:bg-surface-container-low cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-on-surface text-sm">{c.name}</div>
                          <div className="text-on-surface-variant text-xs">{c.email}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-on-surface-variant">{jobTitleFor(c) || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-surface-container text-on-surface-variant">{c.stage}</span>
                        </td>
                        <td className="px-4 py-3">
                          {c.scores?.globalScore
                            ? <span className="text-secondary font-bold text-sm">{c.scores.globalScore}%</span>
                            : <span className="text-on-surface-variant text-xs">Non analysé</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={e => { e.stopPropagation(); onSelectCandidate(c); }}
                            className="text-xs text-secondary hover:underline"
                          >
                            Voir la fiche
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredCandidates.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-sm text-on-surface-variant">Aucun candidat ne correspond aux critères.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4 flex-1 min-h-0">
            {stageOrder.map(stage => {
              const cands = getStageCandidates(stage);
              return (
                <div
                  key={stage}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(stage)}
                  className="w-72 shrink-0 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="font-bold text-sm text-on-surface">{stage}</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant text-[10px] font-mono font-bold rounded-full">{cands.length}</span>
                      <button className="text-on-surface-variant hover:text-on-surface"><MoreHorizontal size={16} /></button>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3 overflow-y-auto pr-1 min-h-[120px]">
                    {cands.map(cand => {
                      const score = cand.scores?.globalScore;
                      return (
                        <div
                          key={cand.id}
                          draggable
                          onDragStart={() => setDraggedId(cand.id)}
                          onClick={() => onSelectCandidate(cand)}
                          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 cursor-pointer hover:border-secondary transition-all shadow-sm"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-full bg-primary-fixed-dim flex items-center justify-center font-bold text-on-primary-fixed text-xs shrink-0">
                              {cand.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-on-surface truncate">{cand.name}</p>
                              <p className="text-xs text-on-surface-variant truncate">{jobs.find(j => j.id === cand.jobId)?.title || "—"}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-on-surface-variant">
                              {cand.cvText && <FileText size={13} />}
                              {cand.linkedinUrl && <Link2 size={13} />}
                            </div>
                            {score ? (
                              <span className="px-2.5 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-mono font-bold rounded-full flex items-center gap-1">
                                <Sparkles size={10} />{score}% FIT
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-amber-600">Non analysé</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {cands.length === 0 && (
                      <div className="text-center py-8 text-xs font-mono text-on-surface-variant border border-dashed border-outline-variant rounded-xl">
                        Aucun profil
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal : partager le pipeline */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !sharing && setShowShareModal(false)}>
          <div className="w-full max-w-md bg-surface-container-lowest rounded-xl p-6 shadow-[0px_10px_25px_rgba(15,23,42,0.08)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-sans text-lg font-semibold text-on-surface">Partager le pipeline</h3>
              <button type="button" onClick={() => setShowShareModal(false)} disabled={sharing} className="text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-40"><X size={20} /></button>
            </div>
            <form onSubmit={handleShareSubmit} className="space-y-4">
              <div>
                <label htmlFor="share-email" className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">Email du destinataire <span className="text-error">*</span></label>
                <input
                  id="share-email"
                  type="email"
                  required
                  autoFocus
                  value={shareForm.email}
                  onChange={e => setShareForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-[8px] px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                  placeholder="decideur@exemple.com"
                />
              </div>
              <div>
                <label htmlFor="share-message" className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5 font-semibold">Message (optionnel)</label>
                <textarea
                  id="share-message"
                  rows={3}
                  value={shareForm.message}
                  onChange={e => setShareForm(f => ({ ...f, message: e.target.value }))}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-[8px] px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all resize-y"
                  placeholder="Un mot d'accompagnement…"
                />
              </div>
              {shareError && <p className="text-error text-sm">{shareError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowShareModal(false)} disabled={sharing} className="h-10 px-4 rounded-[8px] text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-all disabled:opacity-40">Annuler</button>
                <button type="submit" disabled={sharing || !shareForm.email.trim()} className="h-10 px-4 bg-accent hover:bg-accent-dark text-white rounded-[8px] text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50">
                  {sharing && <Loader2 size={16} className="animate-spin" />}
                  {sharing ? "Envoi…" : "Envoyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
