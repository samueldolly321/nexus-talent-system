import React, { useState } from "react";
import {
  Plus,
  MapPin,
  Clock,
  DollarSign,
  Award,
  FileText,
  Check,
  Briefcase,
  X,
  PlusCircle,
  Trash2,
  ListFilter,
  Pencil
} from "lucide-react";
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
}

// Formate une date ISO "YYYY-MM-DD" en "JJ/MM/AAAA" (indépendant du fuseau horaire).
const formatDeadline = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

// Deadline dépassée = strictement avant aujourd'hui (comparaison lexicographique sur YYYY-MM-DD).
const isDeadlinePassed = (iso: string) => iso < new Date().toISOString().slice(0, 10);

export default function JobsView({ jobs, activeUser, searchQuery, onSearchChange, onCreateJob, onEditJob, onDeleteJob, loading }: JobsViewProps) {
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
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setIsEditing(false);
    resetForm();
  };

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
      languagesRequired: languagesRequired.split(",").map(l => l.trim()).filter(Boolean)
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
  const filteredJobs = q
    ? jobs.filter(job =>
        job.title.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q) ||
        job.skillsRequired.join(", ").toLowerCase().includes(q)
      )
    : jobs;

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
        <button
          onClick={openCreateModal}
          className="bg-accent hover:brightness-110 text-on-primary font-bold px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 shadow-sm transition-colors shrink-0"
        >
          <Plus size={16} className="stroke-[3]" />
          Nouvelle Offre
        </button>
      </div>

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
              <div className="bg-white rounded-xl border border-dashed border-outline-variant p-12 text-center">
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
                  className={`bg-white rounded-xl border p-6 cursor-pointer shadow-sm hover:shadow-md transition-all ${
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
                      <DollarSign size={14} className="text-on-surface-variant shrink-0" />
                      <span className="truncate">{job.salaryRange || "Non précisé"}</span>
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
                      <span key={skill} className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-secondary-container/20 text-cyan-800 font-bold">
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
              <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-6 sticky top-8">
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
                        <span key={skill} className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-secondary-container/20 text-cyan-800 border border-secondary-container font-bold">
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
          <div className="bg-white rounded-xl border border-outline-variant shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                    className="w-full bg-white text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Type de contrat *</label>
                  <select 
                    value={contractType}
                    onChange={e => setContractType(e.target.value as ContractType)}
                    className="w-full bg-white text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                  >
                    <option value={ContractType.CDI}>CDI</option>
                    <option value={ContractType.CDD}>CDD</option>
                    <option value={ContractType.Freelance}>Freelance</option>
                    <option value={ContractType.Alternance}>Alternance</option>
                    <option value={ContractType.Stage}>Stage</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Localisation</label>
                  <input 
                    type="text" 
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="ex: Paris (Hybride)"
                    className="w-full bg-white text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Salaire / Fourchette</label>
                  <input 
                    type="text" 
                    value={salaryRange}
                    onChange={e => setSalaryRange(e.target.value)}
                    placeholder="ex: 55k€ - 65k€"
                    className="w-full bg-white text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Expérience minimale (ans)</label>
                  <input
                    type="number"
                    value={minExperienceYears}
                    onChange={e => setMinExperienceYears(Number(e.target.value))}
                    className="w-full bg-white text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Date limite de candidature</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full bg-white text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Diplôme requis / Éducation</label>
                <input 
                  type="text" 
                  value={educationRequired}
                  onChange={e => setEducationRequired(e.target.value)}
                  placeholder="ex: Bac +5 Université ou École d'Ingénieur"
                  className="w-full bg-white text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Description du poste</label>
                <textarea 
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Présentez brièvement le projet, le contexte de recrutement et l'équipe..."
                  className="w-full bg-white text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Missions Principales (Une par ligne)</label>
                <textarea 
                  rows={3}
                  value={missions}
                  onChange={e => setMissions(e.target.value)}
                  placeholder="ex: Concevoir l'architecture de la console d'administration.&#10;Mentorer l'équipe junior..."
                  className="w-full bg-white text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
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
                    className="w-full bg-white text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Langues (Séparées par virgules)</label>
                  <input 
                    type="text" 
                    value={languagesRequired}
                    onChange={e => setLanguagesRequired(e.target.value)}
                    placeholder="Français (Courant), Anglais (Technique)"
                    className="w-full bg-white text-xs border border-outline-variant rounded p-2 focus:border-secondary focus:outline-none"
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
