import React, { useMemo, useRef, useState } from "react";
import { Sparkles, X, Download, LayoutGrid, ArrowUpDown, Plus, Loader2, ChevronLeft, ChevronRight, ChevronDown, UploadCloud } from "lucide-react";
import TopBar from "./TopBar";
import { Candidate, Job, User, PipelineStage } from "../types";
import { getAccessToken } from "../lib/api";

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
  // Tri serveur : clé courante + notification de changement (refetch côté App).
  sortKey: string;
  onSortChange: (sortKey: string) => void;
}

// Champs de formulaire "Ajouter un candidat".
const EMPTY_FORM = { name: "", email: "", phone: "", location: "", jobId: "", cvText: "", letterText: "", salaryExpectation: "", source: "Manuel" };

// Styles partagés (DESIGN.md) : label mono 10px au-dessus, input ghost bordure 1px focus turquoise 2px.
const LABEL_CLS = "block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5";
const INPUT_CLS =
  "w-full bg-surface-container-lowest border border-outline-variant rounded-[8px] px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all";

const scoreTone = (score: number) => {
  if (score >= 80) return "bg-secondary-container text-on-secondary-container";
  if (score >= 60) return "bg-surface-container-high text-on-surface-variant";
  return "bg-red-50 text-red-600";
};

export default function CandidatesView({ candidates, jobs, activeUser, onSelectCandidate, onAddCandidate, loading, searchQuery, onSearchChange, page, totalPages, totalCandidates, onPageChange, sortKey, onSortChange }: CandidatesViewProps) {
  const [minExperience, setMinExperience] = useState(0);
  const [scoreFilter, setScoreFilter] = useState<"all" | "excellent" | "strong">("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  // Filtre par prétention salariale (bornes en Ariary, null = pas de borne).
  const [salaryMin, setSalaryMin] = useState<number | null>(null);
  const [salaryMax, setSalaryMax] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAiBanner, setShowAiBanner] = useState(true);
  // Bascule vue tableau / vue grille (cartes) pour la liste des candidats (>= md).
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Modal "Ajouter un candidat"
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const updateField = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // Import de fichiers pour le CV (PDF/image) et la lettre (PDF/Word) : le
  // serveur extrait le texte (POST /api/extract-text) et remplit le champ,
  // qui reste éditable. Même logique que la page publique /postuler.
  const cvFileRef = useRef<HTMLInputElement>(null);
  const letterFileRef = useRef<HTMLInputElement>(null);
  const [importingCv, setImportingCv] = useState(false);
  const [importingLetter, setImportingLetter] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const extractText = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    const token = getAccessToken();
    const res = await fetch("/api/extract-text", {
      method: "POST",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Échec de l'import du fichier.");
    return data.text ?? "";
  };

  const handleCvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de réimporter le même fichier
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      setImportError("Le CV doit être au format PDF ou une image (JPG/PNG).");
      return;
    }
    setImportError(null);
    setImportingCv(true);
    try {
      updateField("cvText", await extractText(file));
    } catch (err: any) {
      setImportError(err?.message || "Une erreur est survenue.");
    } finally {
      setImportingCv(false);
    }
  };

  const handleLetterFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isDocx =
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.toLowerCase().endsWith(".docx");
    if (!isPdf && !isDocx) {
      setImportError("La lettre de motivation doit être au format PDF ou Word (.docx).");
      return;
    }
    setImportError(null);
    setImportingLetter(true);
    try {
      updateField("letterText", await extractText(file));
    } catch (err: any) {
      setImportError(err?.message || "Une erreur est survenue.");
    } finally {
      setImportingLetter(false);
    }
  };

  const closeModal = () => {
    if (submitting) return;
    setShowAddModal(false);
    setForm(EMPTY_FORM);
    setImportError(null);
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
        letterText: form.letterText.trim(),
        // Envoyé brut : le backend normalise / extrait depuis la lettre si vide.
        salaryExpectation: form.salaryExpectation.trim() || undefined,
        source: form.source || undefined,
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
    candidates.forEach(c => c.analysis?.skills?.domain?.forEach(s => set.add(s)));
    candidates.forEach(c => c.analysis?.skills?.frameworks?.forEach(s => set.add(s)));
    candidates.forEach(c => c.analysis?.skills?.languages?.forEach(s => set.add(s)));
    return Array.from(set).slice(0, 4);
  }, [candidates]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = candidates.filter(c => {
      const score = c.scores?.globalScore ?? 0;
      if (scoreFilter === "excellent" && score < 80) return false;
      if (scoreFilter === "strong" && (score < 60 || score >= 80)) return false;
      if ((c.analysis?.yearsOfExperience ?? 0) < minExperience) return false;
      if (stageFilter !== "all" && c.stage !== stageFilter) return false;
      if (salaryMin !== null || salaryMax !== null) {
        if (!c.salaryExpectation) return false;
        // Extraire le nombre depuis une valeur normalisée "1 300 000 Ar".
        const num = parseInt(c.salaryExpectation.replace(/[\s.,]/g, "").replace(/ar.*/i, ""), 10);
        if (isNaN(num)) return false;
        if (salaryMin !== null && num < salaryMin) return false;
        if (salaryMax !== null && num > salaryMax) return false;
      }
      if (q && !(
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
      )) return false;
      return true;
    });

    // Le tri est appliqué côté serveur (sur toute la base) ; ici on ne fait que filtrer.
    return result;
  }, [candidates, scoreFilter, minExperience, stageFilter, salaryMin, salaryMax, searchQuery]);

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

  const handleExportListe = async () => {
    if (filtered.length === 0) return;
    // Lib Excel chargée à la demande (import dynamique) pour alléger le démarrage.
    const { buildStyledSheet, downloadStyledWorkbook } = await import("../lib/excelExport");

    const rows = filtered.map(c => ({
      Nom: c.name,
      Email: c.email,
      Téléphone: c.phone ?? "",
      Localisation: c.location ?? "",
      Offre: jobs.find(j => j.id === c.jobId)?.title ?? "",
      Stage: c.stage,
      "Score Global": c.scores?.globalScore ?? "N/A",
      "Score Compétences": c.scores?.skillsScore ?? "N/A",
      "Score Expérience": c.scores?.experienceScore ?? "N/A",
      "Décision IA": c.recommendation?.suggestedDecision ?? "Non analysé",
      "Date candidature": new Date(c.appliedAt).toLocaleDateString("fr-FR"),
    }));

    const ws = buildStyledSheet({
      sheetName: "Candidats",
      title: "Liste des candidats",
      subtitle: `Généré le ${new Date().toLocaleDateString("fr-FR")} · ${rows.length} candidat(s)`,
      columns: [
        { header: "Nom", key: "Nom" },
        { header: "Email", key: "Email" },
        { header: "Téléphone", key: "Téléphone" },
        { header: "Localisation", key: "Localisation" },
        { header: "Offre", key: "Offre" },
        { header: "Stage", key: "Stage" },
        { header: "Score Global", key: "Score Global" },
        { header: "Score Compétences", key: "Score Compétences" },
        { header: "Score Expérience", key: "Score Expérience" },
        { header: "Décision IA", key: "Décision IA" },
        { header: "Date candidature", key: "Date candidature" },
      ],
      rows,
    });
    downloadStyledWorkbook(`nexus-candidats-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      { name: "Candidats", ws },
    ]);
  };

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
              className="h-10 px-3 sm:px-4 bg-accent hover:bg-accent-dark text-white rounded-[8px] text-sm font-bold flex items-center gap-2 transition-all"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Ajouter un candidat</span>
            </button>
            <button
              onClick={handleExportListe}
              disabled={filtered.length === 0}
              className="h-10 px-3 sm:px-4 bg-primary text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Exporter la liste</span>
            </button>
          </div>
        }
      />

      <div className="flex flex-1 min-h-0">
        {/* Filters sidebar — masquée sous lg (place à la liste sur mobile/tablette) */}
        <aside className="hidden lg:block w-72 border-r border-outline-variant p-6 shrink-0 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-on-surface">Filtres</h3>
            <button
              onClick={() => { setScoreFilter("all"); setMinExperience(0); setStageFilter("all"); setSalaryMin(null); setSalaryMax(null); }}
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
                  <span key={skill} className="px-2.5 py-1 bg-secondary-container text-on-secondary-container text-xs rounded-full font-medium">{skill}</span>
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

          <div className="mt-6">
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold mb-3">Prétention salariale</h4>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={salaryMin ?? ""}
                onChange={e => setSalaryMin(e.target.value === "" ? null : Number(e.target.value))}
                placeholder="0"
                aria-label="Prétention salariale minimum (Ar)"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-[8px] px-2.5 py-1.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
              />
              <span className="text-on-surface-variant text-sm">–</span>
              <input
                type="number"
                min={0}
                value={salaryMax ?? ""}
                onChange={e => setSalaryMax(e.target.value === "" ? null : Number(e.target.value))}
                placeholder="2 000 000"
                aria-label="Prétention salariale maximum (Ar)"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-[8px] px-2.5 py-1.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
              />
            </div>
            <p className="text-[10px] text-on-surface-variant font-mono mt-1.5">Montants en Ariary</p>
          </div>
        </aside>

        {/* Main list */}
        <main className="flex-1 min-w-0 p-4 md:p-6 overflow-y-auto relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-sans text-2xl font-semibold text-on-surface">Candidats <span className="text-on-surface-variant font-normal">({filtered.length})</span></h2>
            <div className="flex items-center gap-3">
              <div className="relative flex items-center">
                <ArrowUpDown size={14} className="absolute left-3 text-on-surface-variant pointer-events-none" />
                <select
                  value={sortKey}
                  onChange={e => onSortChange(e.target.value)}
                  aria-label="Trier les candidats"
                  className="appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg text-sm pl-8 pr-8 py-1.5 text-on-surface hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-accent transition-all cursor-pointer"
                >
                  <option value="recent">Récents</option>
                  <option value="name_asc">Nom A→Z</option>
                  <option value="name_desc">Nom Z→A</option>
                  <option value="score_asc">Score ↑</option>
                  <option value="score_desc">Score ↓</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 text-on-surface-variant pointer-events-none" />
              </div>
              <button
                onClick={() => setViewMode(m => (m === "table" ? "grid" : "table"))}
                title={viewMode === "table" ? "Passer en vue grille" : "Passer en vue tableau"}
                aria-pressed={viewMode === "grid"}
                className={`p-2 border rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-secondary-container border-secondary text-on-secondary-container"
                    : "border-outline-variant hover:bg-surface-container-low"
                }`}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-secondary mx-auto" />
            </div>
          ) : (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
              {/* Vue tableau (>= md) */}
              <div className="hidden md:block overflow-x-auto">
              <table className={viewMode === "table" ? "w-full min-w-[760px] text-left" : "hidden"}>
                <thead className="bg-surface-container-low text-on-surface-variant font-mono text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-10"><input type="checkbox" className="rounded border-outline-variant" /></th>
                    <th className="px-4 py-3 font-medium">Profil</th>
                    <th className="px-4 py-3 font-medium">Email &amp; Téléphone</th>
                    <th className="px-4 py-3 font-medium">Score IA</th>
                    <th className="px-4 py-3 font-medium w-48">Expérience</th>
                    <th className="px-4 py-3 font-medium">Prétention sal.</th>
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
                        <td className="px-4 py-4 text-sm text-on-surface align-top">
                          <span>{cand.analysis?.yearsOfExperience ?? "—"} ans</span>
                          {cand.analysis?.experiences?.[0] && (
                            <p className="text-xs text-on-surface-variant break-words line-clamp-2 leading-snug mt-0.5">{cand.analysis.experiences[0].company}</p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-on-surface whitespace-nowrap">{cand.salaryExpectation ?? "—"}</td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center text-sm text-on-surface-variant">Aucun candidat ne correspond aux filtres.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Vue grille (>= md), affichée quand viewMode === "grid" */}
              {viewMode === "grid" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
                  {filtered.map(cand => {
                    const score = cand.scores?.globalScore ?? 0;
                    return (
                      <button
                        key={cand.id}
                        onClick={() => onSelectCandidate(cand)}
                        className="text-left border border-outline-variant rounded-xl p-4 hover:border-secondary hover:shadow-sm transition-all bg-surface-container-lowest"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-primary-fixed-dim flex items-center justify-center font-bold text-on-primary-fixed text-xs shrink-0">
                            {cand.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-on-surface text-sm truncate">{cand.name}</p>
                            <p className="text-xs text-on-surface-variant truncate">
                              {jobs.find(j => j.id === cand.jobId)?.title || "—"}
                            </p>
                          </div>
                          {cand.scores ? (
                            <span className={`shrink-0 px-2.5 py-1 rounded-full font-mono text-xs font-bold ${scoreTone(score)}`}>{score}%</span>
                          ) : (
                            <span className="shrink-0 text-xs font-mono text-amber-600">Non analysé</span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant truncate mb-1">{cand.email}</p>
                        {cand.phone && <p className="text-xs text-on-surface-variant mb-1">{cand.phone}</p>}
                        <p className="text-xs text-on-surface-variant break-words line-clamp-2">
                          {cand.analysis?.yearsOfExperience ?? "—"} ans d'exp.
                          {cand.analysis?.experiences?.[0] && ` — ${cand.analysis.experiences[0].company}`}
                        </p>
                      </button>
                    );
                  })}
                  {filtered.length === 0 && (
                    <p className="col-span-full py-16 text-center text-sm text-on-surface-variant">Aucun candidat ne correspond aux filtres.</p>
                  )}
                </div>
              )}
              </div>

              {/* Vue cards empilées (< md) */}
              <div className="md:hidden divide-y divide-outline-variant">
                {filtered.map(cand => {
                  const score = cand.scores?.globalScore ?? 0;
                  return (
                    <button
                      key={cand.id}
                      onClick={() => onSelectCandidate(cand)}
                      className="w-full text-left p-4 hover:bg-surface-container-low transition-all"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-primary-fixed-dim flex items-center justify-center font-bold text-on-primary-fixed text-xs shrink-0">
                          {cand.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-on-surface text-sm truncate">{cand.name}</p>
                          <p className="text-xs text-on-surface-variant truncate">
                            {jobs.find(j => j.id === cand.jobId)?.title || "—"}
                          </p>
                        </div>
                        {cand.scores ? (
                          <span className={`shrink-0 px-2.5 py-1 rounded-full font-mono text-xs font-bold ${scoreTone(score)}`}>{score}%</span>
                        ) : (
                          <span className="shrink-0 text-xs font-mono text-amber-600">Non analysé</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                        <span className="truncate max-w-full">{cand.email}</span>
                        {cand.phone && <span>{cand.phone}</span>}
                        <span>{cand.analysis?.yearsOfExperience ?? "—"} ans d'exp.</span>
                      </div>
                      {cand.salaryExpectation && (
                        <p className="text-xs font-medium text-on-surface mt-1.5">Prétention : {cand.salaryExpectation}</p>
                      )}
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="px-4 py-16 text-center text-sm text-on-surface-variant">Aucun candidat ne correspond aux filtres.</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-4 py-3 border-t border-outline-variant text-xs text-on-surface-variant">
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
            <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-80 bg-primary-container rounded-xl shadow-xl p-5 z-30">
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
              <button
                onClick={() => { setScoreFilter("excellent"); setShowAiBanner(false); }}
                className="w-full bg-secondary text-white py-2 rounded-lg text-sm font-bold hover:brightness-110"
              >
                Voir la sélection
              </button>
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
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-xl p-8 shadow-[0px_10px_25px_rgba(15,23,42,0.08)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-sans text-xl font-semibold text-on-surface">Ajouter un candidat</h3>
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
                    placeholder="+261 34 00 111 22"
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
                  placeholder="Antananarivo, Madagascar"
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
                <label htmlFor="cand-source" className={LABEL_CLS}>Source</label>
                <select
                  id="cand-source"
                  value={form.source}
                  onChange={e => updateField("source", e.target.value)}
                  className={INPUT_CLS}
                >
                  {["Manuel", "LinkedIn", "Indeed", "Jobteaser", "Référence", "Autre"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="cand-cv" className={`${LABEL_CLS} mb-0`}>CV</label>
                  <button
                    type="button"
                    onClick={() => cvFileRef.current?.click()}
                    disabled={importingCv}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-accent hover:text-accent-dark transition-colors disabled:opacity-50"
                  >
                    {importingCv ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                    {importingCv ? "Import…" : "Importer (PDF ou image)"}
                  </button>
                </div>
                <input
                  ref={cvFileRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={handleCvFile}
                  className="hidden"
                />
                <textarea
                  id="cand-cv"
                  rows={5}
                  value={form.cvText}
                  onChange={e => updateField("cvText", e.target.value)}
                  className={`${INPUT_CLS} resize-y`}
                  placeholder="Collez le texte du CV ici, ou importez un fichier PDF / image"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="cand-letter" className={`${LABEL_CLS} mb-0`}>Lettre de motivation</label>
                  <button
                    type="button"
                    onClick={() => letterFileRef.current?.click()}
                    disabled={importingLetter}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-accent hover:text-accent-dark transition-colors disabled:opacity-50"
                  >
                    {importingLetter ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                    {importingLetter ? "Import…" : "Importer (PDF ou Word)"}
                  </button>
                </div>
                <input
                  ref={letterFileRef}
                  type="file"
                  accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleLetterFile}
                  className="hidden"
                />
                <textarea
                  id="cand-letter"
                  rows={5}
                  value={form.letterText}
                  onChange={e => updateField("letterText", e.target.value)}
                  className={`${INPUT_CLS} resize-y`}
                  placeholder="Collez le texte de la lettre ici, ou importez un fichier PDF / Word"
                />
              </div>

              {importError && (
                <p className="text-sm text-error bg-error-container/40 border border-error-container rounded-lg px-3 py-2">{importError}</p>
              )}

              <div>
                <label htmlFor="cand-salary" className={LABEL_CLS}>Prétention salariale</label>
                <input
                  id="cand-salary"
                  type="text"
                  value={form.salaryExpectation}
                  onChange={e => updateField("salaryExpectation", e.target.value)}
                  className={INPUT_CLS}
                  placeholder="ex: 1 300 000 Ar"
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
