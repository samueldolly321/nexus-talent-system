import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  MapPin,
  Clock,
  Banknote,
  Award,
  FileText,
  Check,
  Briefcase,
  X,
  PlusCircle,
  Trash2,
  ListFilter,
  Pencil,
  SlidersHorizontal
} from "lucide-react";

// Styles des badges de priorité (tokens adaptés dark/light).
const PRIORITY_BADGE: Record<string, string> = {
  Urgent: "bg-red-500/15 text-red-500 border border-red-500/30",
  Haute: "bg-orange-500/15 text-orange-500 border border-orange-500/30",
  Normal: "bg-surface-container text-on-surface-variant border border-outline-variant",
  Basse: "bg-surface-container text-on-surface-variant/60 border border-outline-variant",
};
const PRIORITY_OPTIONS = ["Normal", "Haute", "Urgent", "Basse"];
import TopBar from "./TopBar";
import { Job, ContractType, User } from "../types";

interface JobsViewProps {
  jobs: Job[];
  activeUser: User | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onCreateJob: (jobData: Partial<Job>) => void;
  onEditJob: (id: string, jobData: Partial<Job>) => void;
  onDeleteJob: (id: string) => void;
  loading: boolean;
  // Incrémenté par App (ex. bouton "Nouvelle Offre" de la sidebar) pour
  // déclencher l'ouverture du modal de création depuis l'extérieur du composant.
  openCreateSignal?: number;
}

// Formate une date ISO "YYYY-MM-DD" en "JJ/MM/AAAA" (indépendant du fuseau horaire).
const formatDeadline = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

// Deadline dépassée = strictement avant aujourd'hui (comparaison lexicographique sur YYYY-MM-DD).
const isDeadlinePassed = (iso: string) => iso < new Date().toISOString().slice(0, 10);

export default function JobsView({ jobs, activeUser, searchQuery, onSearchChange, onCreateJob, onEditJob, onDeleteJob, loading, openCreateSignal }: JobsViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [contractType, setContractType] = useState<ContractType>(ContractType.CDI);
  const [location, setLocation] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [minExperienceYears, setMinExperienceYears] = useState(3);
  const [deadline, setDeadline] = useState("");
  const [educationRequired, setEducationRequired] = useState("");
  const [description, setDescription] = useState("");
  const [missions, setMissions] = useState("");
  const [skillsRequired, setSkillsRequired] = useState("");
  const [languagesRequired, setLanguagesRequired] = useState("");
  const [priority, setPriority] = useState("Normal");

  // Filtres avancés (panneau repliable).
  const [showFilters, setShowFilters] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState<string>("all");
  const [filterDeadline, setFilterDeadline] = useState<string[]>([]);
  const toggleFrom = (list: string[], setList: (v: string[]) => void, value: string) =>
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  const activeFiltersCount = filterPriority.length + (filterDate !== "all" ? 1 : 0) + filterDeadline.length;
  const resetFilters = () => { setFilterPriority([]); setFilterDate("all"); setFilterDeadline([]); };

  const resetForm = () => {
    setTitle("");
    setContractType(ContractType.CDI);
    setLocation("");
    setSalaryRange("");
    setMinExperienceYears(3);
    setDeadline("");
    setEducationRequired("");
    setDescription("");
    setMissions("");
    setSkillsRequired("");
    setLanguagesRequired("");
    setPriority("Normal");
  };

  // Ouvre le modal en mode création (formulaire vierge).
  const openCreateModal = () => {
    resetForm();
    setSelectedJob(null);
    setIsEditing(false);
    setShowAddModal(true);
  };

  // Ouvre le modal en mode édition : pré-remplit le formulaire avec le job choisi.
  const openEditModal = (job: Job) => {
    setSelectedJob(job);
    setIsEditing(true);
    setTitle(job.title);
    setContractType(job.contractType);
    setLocation(job.location);
    setSalaryRange(job.salaryRange || "");
    setMinExperienceYears(job.minExperienceYears);
    setDeadline(job.deadline || "");
    setEducationRequired(job.educationRequired);
    setDescription(job.description);
    setMissions(job.missions.join("\n"));
    setSkillsRequired(job.skillsRequired.join(", "));
    setLanguagesRequired(job.languagesRequired.join(", "));
    setPriority(job.priority || "Normal");
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setIsEditing(false);
    resetForm();
  };

  // Déclenché par le bouton "Nouvelle Offre" de la sidebar : ouvre le modal
  // de création même si on n'était pas déjà sur cette page. Le signal est un
  // compteur (et non un booléen) pour se redéclencher à chaque clic, y
  // compris si l'utilisateur est déjà sur la page Offres.
  useEffect(() => {
    if (openCreateSignal) openCreateModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCreateSignal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const jobData: Partial<Job> = {
      title,
      contractType,
      location,
      salaryRange,
      minExperienceYears,
      deadline: deadline || undefined,
      educationRequired,
      description,
      missions: missions.split("\n").filter(Boolean),
      skillsRequired: skillsRequired.split(",").map(s => s.trim()).filter(Boolean),
      languagesRequired: languagesRequired.split(",").map(l => l.trim()).filter(Boolean),
      priority
    };
    if (isEditing && selectedJob) {
      onEditJob(selectedJob.id, jobData);
    } else {
      onCreateJob(jobData);
    }
    closeModal();
  };

  // Recherche globale : titre, description ou compétences contiennent la requête.
  const q = searchQuery.trim().toLowerCase();
  const filteredJobs = useMemo(() => {
    let result = q
      ? jobs.filter(job =>
          job.title.toLowerCase().includes(q) ||
          job.description.toLowerCase().includes(q) ||
          job.skillsRequired.join(", ").toLowerCase().includes(q)
        )
      : jobs;

    // Priorité
    if (filterPriority.length > 0) {
      result = result.filter(j => filterPriority.includes(j.priority ?? "Normal"));
    }

    // Date de création
    if (filterDate !== "all") {
      const now = new Date();
      if (filterDate === "today") {
        result = result.filter(j => new Date(j.createdAt).toDateString() === now.toDateString());
      } else if (filterDate === "7d" || filterDate === "30d") {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - (filterDate === "7d" ? 7 : 30));
        result = result.filter(j => new Date(j.createdAt) >= cutoff);
      } else if (filterDate === "older") {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 30);
        result = result.filter(j => new Date(j.createdAt) < cutoff);
      }
    }

    // Deadline (checkboxes indépendantes, appliquées en ET)
    if (filterDeadline.includes("passed")) {
      result = result.filter(j => j.deadline && isDeadlinePassed(j.deadline));
    }
    if (filterDeadline.includes("7d")) {
      const in7 = new Date(); in7.setDate(in7.getDate() + 7);
      result = result.filter(j => j.deadline && !isDeadlinePassed(j.deadline) && new Date(j.deadline) <= in7);
    }
    if (filterDeadline.includes("30d")) {
      const in30 = new Date(); in30.setDate(in30.getDate() + 30);
      result = result.filter(j => j.deadline && !isDeadlinePassed(j.deadline) && new Date(j.deadline) <= in30);
    }

    return result;
  }, [jobs, q, filterPriority, filterDate, filterDeadline]);

  return (
    <div className="flex-1 bg-background min-h-screen flex flex-col">
      <TopBar activeUser={activeUser} searchValue={searchQuery} onSearchChange={onSearchChange} searchPlaceholder="Rechercher une offre par titre, description ou compétence..." />
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
      {/* Upper header block */}
      <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface font-sans">Offres d'Emploi</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Gérez et publiez les offres d'emploi actives et archivez-les une fois pourvues.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowFilters(s => !s)}
            aria-pressed={showFilters}
            className={`px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 border transition-all ${
              showFilters || activeFiltersCount > 0
                ? "bg-secondary-container border-secondary text-on-secondary-container"
                : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            <SlidersHorizontal size={16} />
            Filtres
            {activeFiltersCount > 0 && (
              <span className="bg-secondary text-white rounded-full px-1.5 text-[10px] font-mono leading-4">{activeFiltersCount}</span>
            )}
          </button>
          <button
            onClick={openCreateModal}
            className="bg-accent hover:brightness-110 text-on-primary font-bold px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus size={16} className="stroke-[3]" />
            Nouvelle Offre
          </button>
        </div>
      </div>

      {/* Panneau de filtres avancés (repliable) */}
      {showFilters && (
        <div className="mb-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-on-surface text-sm">Filtres avancés</h3>
            {activeFiltersCount > 0 && (
              <button onClick={resetFilters} className="text-secondary text-xs font-bold hover:underline">Réinitialiser</button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Priorité */}
            <div>
              <h4 className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold mb-3">Priorité</h4>
              <div className="space-y-2">
                {PRIORITY_OPTIONS.map(p => (
                  <label key={p} className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterPriority.includes(p)}
                      onChange={() => toggleFrom(filterPriority, setFilterPriority, p)}
                      className="rounded border-outline-variant text-secondary focus:ring-secondary"
                    />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            {/* Date de création */}
            <div>
              <h4 className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold mb-3">Date de création</h4>
              <select
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-[8px] px-2.5 py-1.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
              >
                <option value="all">Toutes</option>
                <option value="today">Aujourd'hui</option>
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
                <option value="older">Plus de 30 jours</option>
              </select>
            </div>

            {/* Deadline */}
            <div>
              <h4 className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold mb-3">Deadline</h4>
              <div className="space-y-2">
                {[
                  { value: "passed", label: "Deadline dépassée" },
                  { value: "7d", label: "Dans 7 jours" },
                  { value: "30d", label: "Dans 30 jours" },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterDeadline.includes(opt.value)}
                      onChange={() => toggleFrom(filterDeadline, setFilterDeadline, opt.value)}
                      className="rounded border-outline-variant text-secondary focus:ring-secondary"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-secondary mx-auto"></div>
          <p className="mt-4 text-xs font-mono text-on-surface-variant">Synchronisation des offres d'emploi...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
          {/* Left / Middle: Jobs List */}
          <div className="xl:col-span-2 space-y-4">
            {filteredJobs.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant p-12 text-center">
                <Briefcase className="mx-auto text-slate-300 mb-4" size={44} />
                <h3 className="font-sans font-bold text-on-surface-variant text-sm">
                  {q ? "Aucune offre ne correspond à la recherche" : "Aucune offre d'emploi active"}
                </h3>
                <p className="text-xs text-on-surface-variant mt-1 max-w-sm mx-auto">
                  {q
                    ? "Essayez d'autres mots-clés (titre, compétence...)."
                    : "Commencez à recruter en publiant votre première offre d'emploi multi-tenant."}
                </p>
              </div>
            ) : (
              filteredJobs.map(job => (
                <div 
                  key={job.id} 
                  onClick={() => setSelectedJob(job)}
                  className={`bg-surface-container-lowest rounded-xl border p-6 cursor-pointer shadow-sm hover:shadow-md transition-all ${
                    selectedJob?.id === job.id ? "border-secondary ring-2 ring-secondary/10" : "border-outline-variant"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide uppercase bg-secondary-container/20 text-on-secondary-container">
                          {job.contractType}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide uppercase bg-surface-container text-on-surface-variant">
                          {job.status === "Active" ? "Publié" : "Archivé"}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide uppercase ${PRIORITY_BADGE[job.priority ?? "Normal"] ?? PRIORITY_BADGE.Normal}`}>
                          {job.priority ?? "Normal"}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-on-surface font-sans tracking-tight leading-snug">
                        {job.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(job);
                        }}
                        className="text-on-surface-variant hover:text-secondary p-1.5 hover:bg-secondary-container/20 rounded transition-colors"
                        title="Modifier l'offre"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Archiver définitivement cette offre d'emploi ?")) {
                            onDeleteJob(job.id);
                            if (selectedJob?.id === job.id) setSelectedJob(null);
                          }
                        }}
                        className="text-on-surface-variant hover:text-red-500 p-1.5 hover:bg-red-50 rounded transition-colors"
                        title="Archiver l'offre"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-on-surface-variant mt-3 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-outline-variant text-on-surface-variant font-medium">
                    <div className="flex items-center gap-1.5 text-xs">
                      <MapPin size={14} className="text-on-surface-variant shrink-0" />
                      <span className="truncate">{job.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Banknote size={14} className="text-on-surface-variant shrink-0" />
                      <span className="truncate text-on-surface font-medium">{job.salaryRange || "Non précisé"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Award size={14} className="text-on-surface-variant shrink-0" />
                      <span className="truncate">{job.minExperienceYears}+ ans d'exp</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <FileText size={14} className="text-on-surface-variant shrink-0" />
                      <span className="truncate max-w-[120px]">{job.educationRequired}</span>
                    </div>
                  </div>

                  {/* Date limite de candidature (rouge si dépassée) */}
                  {job.deadline && (
                    <p className={`flex items-center gap-1.5 text-xs font-semibold mt-3 ${isDeadlinePassed(job.deadline) ? "text-red-600" : "text-on-surface-variant"}`}>
                      <Clock size={14} className="shrink-0" />
                      Limite : {formatDeadline(job.deadline)}
                    </p>
                  )}

                  {/* Skills badges */}
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {job.skillsRequired.slice(0, 5).map(skill => (
                      <span key={skill} className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-secondary-container text-on-secondary-container">
                        {skill}
                      </span>
                    ))}
                    {job.skillsRequired.length > 5 && (
                      <span className="text-[9px] font-mono text-on-surface-variant font-semibold self-center">
                        +{job.skillsRequired.length - 5} autres
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Panel: Selected Job Details */}
          <div className="xl:col-span-1">
            {selectedJob ? (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6 sticky top-8">
                <div className="border-b border-outline-variant pb-5 mb-5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-secondary-container/20 text-on-secondary-container uppercase tracking-wider">
                    Fiche de Poste
                  </span>
                  <h3 className="text-lg font-bold text-on-surface mt-2 font-sans leading-snug">
                    {selectedJob.title}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1">Créée le {new Date(selectedJob.createdAt).toLocaleDateString("fr-FR")}</p>
                </div>

                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface-variant mb-2">Description</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed font-sans">{selectedJob.description}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface-variant mb-2">Missions Principales</h4>
                    <ul className="space-y-1.5">
                      {selectedJob.missions.map((mission, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-on-surface-variant leading-relaxed">
                          <Check size={14} className="text-secondary shrink-0 mt-0.5 stroke-[3]" />
                          <span>{mission}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface-variant mb-2">Compétences attendues</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedJob.skillsRequired.map(skill => (
                        <span key={skill} className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-secondary-container text-on-secondary-container">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface-variant mb-2">Langues requises</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedJob.languagesRequired.map(lang => (
                        <span key={lang} className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-container text-on-surface-variant font-bold">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-outline-variant grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Localisation</span>
                      <span className="text-xs font-semibold text-on-surface-variant mt-0.5 block">{selectedJob.location}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Rémunération</span>
                      <span className="text-xs font-semibold text-on-surface-variant mt-0.5 block">{selectedJob.salaryRange || "Non précisé"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Priorité</span>
                      <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${PRIORITY_BADGE[selectedJob.priority ?? "Normal"] ?? PRIORITY_BADGE.Normal}`}>
                        {selectedJob.priority ?? "Normal"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-outline-variant flex items-center gap-2">
                    {selectedJob.status === "Active" && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Archiver l'offre "${selectedJob.title}" ?`)) {
                            onEditJob(selectedJob.id, { status: "Archived" });
                            setSelectedJob(null);
                          }
                        }}
                        className="flex-1 h-9 px-3 rounded-lg text-sm font-bold text-on-surface-variant border border-outline-variant hover:bg-surface-container-low transition-all"
                      >
                        Archiver
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (!window.confirm(`Supprimer définitivement "${selectedJob.title}" ?`)) return;
                        onDeleteJob(selectedJob.id);
                        setSelectedJob(null);
                      }}
                      className="flex-1 h-9 px-3 rounded-lg text-sm font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-all"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-surface-container rounded-xl border border-dashed border-outline-variant p-8 text-center text-on-surface-variant">
                <Briefcase size={28} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">Sélectionnez une offre d'emploi pour afficher l'ensemble des critères exigés par le recruteur.</p>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Add Job Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <div className="flex items-center gap-2 text-on-surface">
                {isEditing ? <Pencil size={20} className="text-secondary" /> : <PlusCircle size={20} className="text-secondary" />}
                <h3 className="font-bold text-base font-sans">{isEditing ? "Modifier l'offre" : "Publier une Nouvelle Offre"}</h3>
              </div>
              <button
                onClick={closeModal}
                className="text-on-surface-variant hover:text-on-surface-variant p-1 rounded-lg hover:bg-surface-container transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Titre du poste *</label>
                  <input 
                    type="text" 
                    required 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="ex: Lead Developer React"
                    className="w-full bg-surface-container-lowest text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Type de contrat *</label>
                  <select 
                    value={contractType}
                    onChange={e => setContractType(e.target.value as ContractType)}
                    className="w-full bg-surface-container-lowest text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                  >
                    <option value={ContractType.CDI}>CDI</option>
                    <option value={ContractType.CDD}>CDD</option>
                    <option value={ContractType.Freelance}>Freelance</option>
                    <option value={ContractType.Alternance}>Alternance</option>
                    <option value={ContractType.Stage}>Stage</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Priorité</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="w-full bg-surface-container-lowest text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                >
                  <option value="Normal">Normal</option>
                  <option value="Haute">Haute priorité</option>
                  <option value="Urgent">🔴 Urgent</option>
                  <option value="Basse">Basse priorité</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Localisation</label>
                  <input 
                    type="text" 
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="ex: Antananarivo (Hybride)"
                    className="w-full bg-surface-container-lowest text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Salaire / Fourchette (Ariary)</label>
                  <input
                    type="text"
                    value={salaryRange}
                    onChange={e => setSalaryRange(e.target.value)}
                    placeholder="ex: 1 000 000 Ar - 2 000 000 Ar"
                    className="w-full bg-surface-container-lowest text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Expérience minimale (ans)</label>
                  <input
                    type="number"
                    value={minExperienceYears}
                    onChange={e => setMinExperienceYears(Number(e.target.value))}
                    className="w-full bg-surface-container-lowest text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Date limite de candidature</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full bg-surface-container-lowest text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Diplôme requis / Éducation</label>
                <input 
                  type="text" 
                  value={educationRequired}
                  onChange={e => setEducationRequired(e.target.value)}
                  placeholder="ex: Bac +5 Université ou École d'Ingénieur"
                  className="w-full bg-surface-container-lowest text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Description du poste</label>
                <textarea 
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Présentez brièvement le projet, le contexte de recrutement et l'équipe..."
                  className="w-full bg-surface-container-lowest text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Missions Principales (Une par ligne)</label>
                <textarea 
                  rows={3}
                  value={missions}
                  onChange={e => setMissions(e.target.value)}
                  placeholder="ex: Concevoir l'architecture de la console d'administration.&#10;Mentorer l'équipe junior..."
                  className="w-full bg-surface-container-lowest text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Compétences attendues (Séparées par virgules)</label>
                  <input 
                    type="text" 
                    value={skillsRequired}
                    onChange={e => setSkillsRequired(e.target.value)}
                    placeholder="React, TypeScript, Redux, Docker"
                    className="w-full bg-surface-container-lowest text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Langues (Séparées par virgules)</label>
                  <input 
                    type="text" 
                    value={languagesRequired}
                    onChange={e => setLanguagesRequired(e.target.value)}
                    placeholder="Français (Courant), Anglais (Technique)"
                    className="w-full bg-surface-container-lowest text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-accent hover:brightness-110 text-on-primary font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition-colors"
                >
                  {isEditing ? "Enregistrer les modifications" : "Publier l'offre"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
