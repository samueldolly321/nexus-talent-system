import React, { useMemo, useState } from "react";
import { Sparkles, X, Download, LayoutGrid, ArrowUpDown, Plus, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import TopBar from "./TopBar";
import { Candidate, Job, User, PipelineStage } from "../types";

interface CandidatesViewProps {
  candidates: Candidate[];
  jobs: Job[];
  activeUser: User | null;
  onSelectCandidate: (candidate: Candidate) => void;
  onAddCandidate: (data: Partial<Candidate>) => Promise<void>;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  page: number;
  totalPages: number;
  totalCandidates: number;
  onPageChange: (page: number) => void;
}

// Champs de formulaire "Ajouter un candidat".
const EMPTY_FORM = { name: "", email: "", phone: "", location: "", jobId: "", cvText: "" };

// Styles partagés (DESIGN.md) : label mono 10px au-dessus, input ghost bordure 1px focus turquoise 2px.
const LABEL_CLS = "block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5";
const INPUT_CLS =
  "w-full bg-white border border-outline-variant rounded-[8px] px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all";

const scoreTone = (score: number) => {
  if (score >= 80) return "bg-secondary-container text-on-secondary-container";
  if (score >= 60) return "bg-surface-container-high text-on-surface-variant";
  return "bg-red-50 text-red-600";
};

export default function CandidatesView({ candidates, jobs, activeUser, onSelectCandidate, onAddCandidate, loading, searchQuery, onSearchChange, page, totalPages, totalCandidates, onPageChange }: CandidatesViewProps) {
  const [minExperience, setMinExperience] = useState(0);
  const [scoreFilter, setScoreFilter] = useState<"all" | "excellent" | "strong">("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAiBanner, setShowAiBanner] = useState(true);

  // Modal "Ajouter un candidat"
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const updateField = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const closeModal = () => {
    if (submitting) return;
    setShowAddModal(false);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddCandidate({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        location: form.location.trim(),
        jobId: form.jobId || undefined,
        cvText: form.cvText.trim(),
      });
      setForm(EMPTY_FORM);
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const allSkills = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach(c => c.analysis?.skills?.frameworks?.forEach(s => set.add(s)));
    candidates.forEach(c => c.analysis?.skills?.languages?.forEach(s => set.add(s)));
    return Array.from(set).slice(0, 4);
  }, [candidates]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return candidates.filter(c => {
      const score = c.scores?.globalScore ?? 0;
      if (scoreFilter === "excellent" && score < 80) return false;
      if (scoreFilter === "strong" && (score < 60 || score >= 80)) return false;
      if ((c.analysis?.yearsOfExperience ?? 0) < minExperience) return false;
      if (stageFilter !== "all" && c.stage !== stageFilter) return false;
      if (q && !(
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q)
      )) return false;
      return true;
    });
  }, [candidates, scoreFilter, minExperience, stageFilter, searchQuery]);

  const excellentCount = candidates.filter(c => (c.scores?.globalScore ?? 0) >= 80).length;
  const strongCount = candidates.filter(c => (c.scores?.globalScore ?? 0) >= 60 && (c.scores?.globalScore ?? 0) < 80).length;

  // Options de statut branchées sur PipelineStage (+ "Tous"), avec le compte par stage.
  const stageOptions = useMemo(
    () => [{ label: "Tous", value: "all" }, ...Object.values(PipelineStage).map(s => ({ label: s, value: s }))],
    []
  );
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    candidates.forEach(c => { counts[c.stage] = (counts[c.stage] ?? 0) + 1; });
    return counts;
  }, [candidates]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="flex-1 bg-background min-h-screen flex flex-col">
      <TopBar
        activeUser={activeUser}
        searchValue={searchQuery}
        onSearchChange={onSearchChange}
        searchPlaceholder="Rechercher par nom, email ou localisation..."
        rightSlot={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="h-10 px-4 bg-accent hover:bg-accent-dark text-white rounded-[8px] text-sm font-bold flex items-center gap-2 transition-all"
            >
              <Plus size={16} />
              Ajouter un candidat
            </button>
            <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all">
              <Download size={15} />
              Exporter la liste
            </button>
          </div>
        }
      />

      <div className="flex flex-1 min-h-0">
        {/* Filters sidebar */}
        <aside className="w-72 border-r border-outline-variant p-6 shrink-0 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-on-surface">Filtres</h3>
            <button
              onClick={() => { setScoreFilter("all"); setMinExperience(0); setStageFilter("all"); }}
              className="text-secondary text-xs font-bold hover:underline"
            >
              Tout effacer
            </button>
          </div>

          <div className="mb-6">
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold mb-3">Score IA</h4>
            <label className="flex items-center justify-between mb-2 cursor-pointer">
              <span className="flex items-center gap-2 text-sm text-on-surface">
                <input type="checkbox" checked={scoreFilter === "excellent"} onChange={() => setScoreFilter(scoreFilter === "excellent" ? "all" : "excellent")} className="rounded border-outline-variant text-secondary focus:ring-secondary" />
                Excellent (80%+)
              </span>
              <span className="text-xs text-on-surface-variant font-mono">{excellentCount}</span>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-2 text-sm text-on-surface">
                <input type="checkbox" checked={scoreFilter === "strong"} onChange={() => setScoreFilter(scoreFilter === "strong" ? "all" : "strong")} className="rounded border-outline-variant text-secondary focus:ring-secondary" />
                Bon (60-80%)
              </span>
              <span className="text-xs text-on-surface-variant font-mono">{strongCount}</span>
            </label>
          </div>

          <div className="mb-6">
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold mb-3">Expérience (années)</h4>
            <input
              type="range"
              min={0}
              max={15}
              value={minExperience}
              onChange={e => setMinExperience(Number(e.target.value))}
              className="w-full accent-secondary"
            />
            <div className="flex justify-between text-xs text-on-surface-variant font-mono mt-1">
              <span>{minExperience} ans</span>
              <span>15+ ans</span>
            </div>
          </div>

          {allSkills.length > 0 && (
            <div className="mb-6">
              <h4 className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold mb-3">Compétences</h4>
              <div className="flex flex-wrap gap-2">
                {allSkills.map(skill => (
                  <span key={skill} className="px-2.5 py-1 bg-surface-container text-secondary text-xs rounded-full font-medium">{skill}</span>
                ))}
                <span className="px-2.5 py-1 bg-surface-container-low text-on-surface-variant text-xs rounded-full font-medium">+12</span>
              </div>
            </div>
          )}

          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold mb-3">Statut</h4>
            <div className="space-y-2">
              {stageOptions.map(opt => (
                <label key={opt.value} className="flex items-center justify-between gap-2 text-sm text-on-surface cursor-pointer">
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="status"
                      className="text-secondary focus:ring-secondary"
                      checked={stageFilter === opt.value}
                      onChange={() => setStageFilter(opt.value)}
                    />
                    {opt.label}
                  </span>
                  <span className="text-xs text-on-surface-variant font-mono">
                    {opt.value === "all" ? candidates.length : (stageCounts[opt.value] ?? 0)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Main list */}
        <main className="flex-1 min-w-0 p-6 overflow-y-auto relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-sans text-2xl font-semibold text-primary">Candidats <span className="text-on-surface-variant font-normal">({filtered.length})</span></h2>
            <div className="flex items-center gap-3">
              <button className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm flex items-center gap-2 hover:bg-surface-container-low">
                <ArrowUpDown size={14} />
                Trier : Récents
              </button>
              <button className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container-low">
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-secondary mx-auto" />
            </div>
          ) : (
            <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low text-on-surface-variant font-mono text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-10"><input type="checkbox" className="rounded border-outline-variant" /></th>
                    <th className="px-4 py-3 font-medium">Profil</th>
                    <th className="px-4 py-3 font-medium">Email &amp; Téléphone</th>
                    <th className="px-4 py-3 font-medium">Score IA</th>
                    <th className="px-4 py-3 font-medium">Expérience</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {filtered.map(cand => {
                    const score = cand.scores?.globalScore ?? 0;
                    return (
                      <tr
                        key={cand.id}
                        onClick={() => onSelectCandidate(cand)}
                        className="hover:bg-surface-container-low transition-all cursor-pointer"
                      >
                        <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.has(cand.id)} onChange={() => toggleSelect(cand.id)} className="rounded border-outline-variant text-secondary focus:ring-secondary" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-fixed-dim flex items-center justify-center font-bold text-on-primary-fixed text-xs shrink-0">
                              {cand.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-on-surface text-sm truncate">{cand.name}</p>
                              <p className="text-xs text-on-surface-variant truncate">
                                {jobs.find(j => j.id === cand.jobId)?.title || "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-on-surface-variant">
                          <p className="truncate">{cand.email}</p>
                          <p className="text-xs">{cand.phone || "—"}</p>
                        </td>
                        <td className="px-4 py-4">
                          {cand.scores ? (
                            <div className="flex items-center gap-3">
                              <span className={`px-2.5 py-1 rounded-full font-mono text-xs font-bold ${scoreTone(score)}`}>{score}%</span>
                              <div className="w-16 bg-surface-container rounded-full h-1.5">
                                <div className="bg-secondary h-1.5 rounded-full" style={{ width: `${score}%` }} />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs font-mono text-amber-600">Non analysé</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-on-surface">
                          {cand.analysis?.yearsOfExperience ?? "—"} ans
                          {cand.analysis?.experiences?.[0] && (
                            <p className="text-xs text-on-surface-variant truncate max-w-[160px]">{cand.analysis.experiences[0].company}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center text-sm text-on-surface-variant">Aucun candidat ne correspond aux filtres.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="flex justify-between items-center px-4 py-3 border-t border-outline-variant text-xs text-on-surface-variant">
                <span>Page {page} / {totalPages} — {totalCandidates} candidats au total</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    className="flex items-center gap-1 px-3 py-1.5 border border-outline-variant rounded-lg font-medium hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={14} />
                    Précédent
                  </button>
                  <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 border border-outline-variant rounded-lg font-medium hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Suivant
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI assistant floating banner */}
          {showAiBanner && excellentCount > 0 && (
            <div className="fixed bottom-6 right-6 w-80 bg-primary-container rounded-xl shadow-xl p-5 z-30">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-secondary-fixed-dim" />
                  <div>
                    <p className="font-bold text-white text-sm">Assistant IA Recruteur</p>
                    <p className="font-mono text-[9px] text-secondary-fixed-dim uppercase tracking-wider">Insight actif</p>
                  </div>
                </div>
                <button onClick={() => setShowAiBanner(false)} className="text-white/60 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm text-inverse-on-surface/90 mb-4">
                J'ai identifié <span className="font-bold text-white">{excellentCount} candidats</span> correspondant à vos critères avec un score supérieur à 80 %. Souhaitez-vous planifier une prise de contact groupée ?
              </p>
              <button className="w-full bg-secondary text-white py-2 rounded-lg text-sm font-bold hover:brightness-110">Voir la sélection</button>
            </div>
          )}
        </main>
      </div>

      {/* Modal "Ajouter un candidat" */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-xl p-8 shadow-[0px_10px_25px_rgba(15,23,42,0.08)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-sans text-xl font-semibold text-primary">Ajouter un candidat</h3>
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-40"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="cand-name" className={LABEL_CLS}>Nom <span className="text-error">*</span></label>
                <input
                  id="cand-name"
                  type="text"
                  required
                  autoFocus
                  value={form.name}
                  onChange={e => updateField("name", e.target.value)}
                  className={INPUT_CLS}
                  placeholder="Jean Dupont"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cand-email" className={LABEL_CLS}>Email</label>
                  <input
                    id="cand-email"
                    type="email"
                    value={form.email}
                    onChange={e => updateField("email", e.target.value)}
                    className={INPUT_CLS}
                    placeholder="jean@exemple.com"
                  />
                </div>
                <div>
                  <label htmlFor="cand-phone" className={LABEL_CLS}>Téléphone</label>
                  <input
                    id="cand-phone"
                    type="tel"
                    value={form.phone}
                    onChange={e => updateField("phone", e.target.value)}
                    className={INPUT_CLS}
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="cand-location" className={LABEL_CLS}>Localisation</label>
                <input
                  id="cand-location"
                  type="text"
                  value={form.location}
                  onChange={e => updateField("location", e.target.value)}
                  className={INPUT_CLS}
                  placeholder="Paris, France"
                />
              </div>

              <div>
                <label htmlFor="cand-job" className={LABEL_CLS}>Offre</label>
                <select
                  id="cand-job"
                  value={form.jobId}
                  onChange={e => updateField("jobId", e.target.value)}
                  className={INPUT_CLS}
                >
                  <option value="">— Sélectionner une offre —</option>
                  {jobs.map(job => (
                    <option key={job.id} value={job.id}>{job.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="cand-cv" className={LABEL_CLS}>CV</label>
                <textarea
                  id="cand-cv"
                  rows={5}
                  value={form.cvText}
                  onChange={e => updateField("cvText", e.target.value)}
                  className={`${INPUT_CLS} resize-y`}
                  placeholder="Collez le texte du CV ici"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="h-10 px-4 rounded-[8px] text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-all disabled:opacity-40"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.name.trim()}
                  className="h-10 px-4 bg-accent hover:bg-accent-dark text-white rounded-[8px] text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {submitting ? "Ajout…" : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
