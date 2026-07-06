import React, { useState } from "react";
import { ChevronRight, Download, Mail, Phone, MapPin, Linkedin, Globe, Sparkles, RefreshCw, GraduationCap, BadgeCheck, Pencil, X, Loader2, Camera } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer
} from "recharts";
import TopBar from "./TopBar";
import { Candidate, Job, PipelineStage, User } from "../types";
import { getAccessToken } from "../lib/api";

interface CandidateProfileViewProps {
  candidate: Candidate;
  job: Job | undefined;
  activeUser: User | null;
  onBack: () => void;
  onUpdateStage: (id: string, stage: PipelineStage) => void;
  onAnalyzeCandidate: (id: string) => Promise<void>;
  analyzing: boolean;
  onOpenRecommendation: () => void;
  onSaveCandidate: (id: string, patch: Partial<Candidate>) => Promise<void>;
}

const tabs = ["Analyse IA", "Expérience & CV", "Lettre de motivation", "Historique"];

// Classes partagées des modals (cohérentes avec le reste de l'app).
const LABEL_CLS = "block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1.5";
const INPUT_CLS = "w-full bg-surface-container-lowest border border-outline-variant rounded-[8px] px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all";
const CANCEL_CLS = "h-10 px-4 rounded-[8px] text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-all disabled:opacity-40";
const SUBMIT_CLS = "h-10 px-4 bg-primary text-white rounded-[8px] text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

export default function CandidateProfileView({
  candidate,
  job,
  activeUser,
  onBack,
  onUpdateStage,
  onAnalyzeCandidate,
  analyzing,
  onOpenRecommendation,
  onSaveCandidate
}: CandidateProfileViewProps) {
  const [activeTab, setActiveTab] = useState(0);
  const scores = candidate.scores;

  // Un seul modal ouvert à la fois : profil, avatar, CV ou lettre de motivation.
  type ModalKind = "profile" | "avatar" | "cv" | "letter";
  const [modal, setModal] = useState<ModalKind | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Brouillons par formulaire (initialisés à l'ouverture depuis le candidat).
  const [profileDraft, setProfileDraft] = useState({ name: "", email: "", phone: "", location: "", linkedinUrl: "", salaryExpectation: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [cvDraft, setCvDraft] = useState("");
  const [letterDraft, setLetterDraft] = useState("");

  const closeModal = () => { if (!saving) { setModal(null); setFormError(null); } };

  const openProfile = () => {
    setProfileDraft({
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone || "",
      location: candidate.location || "",
      linkedinUrl: candidate.linkedinUrl || "",
      salaryExpectation: candidate.salaryExpectation || "",
    });
    setFormError(null);
    setModal("profile");
  };
  const openAvatar = () => { setAvatarFile(null); setFormError(null); setModal("avatar"); };
  const openCv = () => { setCvDraft(candidate.cvText || ""); setFormError(null); setModal("cv"); };
  const openLetter = () => { setLetterDraft(candidate.letterText || ""); setFormError(null); setModal("letter"); };

  // Soumission générique : construit le patch au submit puis délègue à onSaveCandidate.
  const handleSubmit = (buildPatch: () => Partial<Candidate>) => async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError(null);
    try {
      await onSaveCandidate(candidate.id, buildPatch());
      setModal(null);
    } catch (err: any) {
      setFormError(err?.message || "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  // Upload de la photo : POST multipart → URL publique, puis PUT avatarUrl.
  // fetch brut (pas apiFetch, qui force le Content-Type JSON incompatible multipart).
  const handleAvatarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!avatarFile) { setFormError("Veuillez choisir une image."); return; }
    setSaving(true);
    setFormError(null);
    try {
      const form = new FormData();
      form.append("avatar", avatarFile);
      const token = getAccessToken();
      const res = await fetch(`/api/candidates/${candidate.id}/avatar`, {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Échec de l'upload.");
      }
      const { url } = await res.json();
      await onSaveCandidate(candidate.id, { avatarUrl: url });
      setModal(null);
    } catch (err: any) {
      setFormError(err?.message || "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  const aptitudeData = scores
    ? [
        { subject: "Compétences", value: scores.skillsScore },
        { subject: "Expérience", value: scores.experienceScore },
        { subject: "Formation", value: scores.educationScore },
        { subject: "Savoir-être", value: scores.softSkillsScore },
        { subject: "Langues", value: scores.languagesScore }
      ]
    : [];

  return (
    <div className="flex-1 bg-background min-h-screen flex flex-col">
      <TopBar
        activeUser={activeUser}
        breadcrumb={
          <div className="flex items-center gap-2 text-sm min-w-0">
            <button onClick={onBack} className="text-on-surface-variant hover:text-secondary font-medium shrink-0">Candidats</button>
            <ChevronRight size={14} className="text-on-surface-variant shrink-0" />
            <span className="font-bold text-on-surface truncate">{candidate.name}</span>
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-2">
            <button className="hidden sm:inline-flex px-3 py-2 border border-outline-variant rounded-lg text-sm font-medium hover:bg-surface-container-low">Partager le profil</button>
            <button
              onClick={onOpenRecommendation}
              className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:opacity-90 whitespace-nowrap"
            >
              <span className="sm:hidden">Reco. IA</span>
              <span className="hidden sm:inline">Voir la recommandation</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6 items-start">
        {/* Left: identity card */}
        <div className="space-y-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              {candidate.avatarUrl ? (
                <img
                  src={candidate.avatarUrl}
                  alt={candidate.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-secondary"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary-fixed-dim flex items-center justify-center font-bold text-2xl text-on-primary-fixed">
                  {candidate.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <button
                onClick={openAvatar}
                title="Changer la photo"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow hover:opacity-90 transition-all"
              >
                <Camera size={14} />
              </button>
            </div>
            <h2 className="font-bold text-lg text-on-surface">{candidate.name}</h2>
            <p className="text-secondary text-sm font-medium mb-3">{job?.title || "—"}</p>
            <div className="flex justify-center gap-2 mb-4 flex-wrap">
              <span className="px-2.5 py-1 bg-surface-container-high text-on-surface-variant text-[10px] font-mono uppercase rounded-full">{candidate.stage}</span>
              {candidate.location && <span className="px-2.5 py-1 bg-surface-container-high text-on-surface-variant text-[10px] font-mono uppercase rounded-full">{candidate.location}</span>}
            </div>
            <button className="w-full border border-outline-variant rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-2 hover:bg-surface-container-low mb-4">
              <Download size={14} />
              Télécharger le CV
            </button>
            <div className="text-left space-y-2.5 pt-4 border-t border-outline-variant">
              <p className="flex items-center gap-2 text-sm text-on-surface-variant truncate"><Mail size={14} className="shrink-0" />{candidate.email}</p>
              <p className="flex items-center gap-2 text-sm text-on-surface-variant"><Phone size={14} className="shrink-0" />{candidate.phone || "—"}</p>
              <p className="flex items-center gap-2 text-sm text-on-surface-variant"><MapPin size={14} className="shrink-0" />{candidate.location || "—"}</p>
              {candidate.linkedinUrl && (
                <p className="flex items-center gap-2 text-sm text-secondary truncate"><Linkedin size={14} className="shrink-0" />{candidate.linkedinUrl}</p>
              )}
            </div>
            <button
              onClick={openProfile}
              className="w-full border border-outline-variant rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-2 hover:bg-surface-container-low transition-all mt-4"
            >
              <Pencil size={14} />
              Modifier le profil
            </button>
          </div>

          {candidate.salaryExpectation && (
            <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">
                Prétention salariale
              </p>
              <p className="font-sans text-sm font-bold text-on-surface">
                {candidate.salaryExpectation}
              </p>
            </div>
          )}

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold mb-1.5">Étape de recrutement</label>
            <select
              value={candidate.stage}
              onChange={e => onUpdateStage(candidate.id, e.target.value as PipelineStage)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2.5 text-sm font-medium focus:outline-none focus:border-secondary"
            >
              {Object.values(PipelineStage).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {candidate.recommendation?.summary && (
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold mb-2">Note du recruteur</p>
              <p className="text-sm text-on-surface italic leading-relaxed">"{candidate.recommendation.summary}"</p>
            </div>
          )}
        </div>

        {/* Center: tabs + content */}
        <div className="space-y-6 min-w-0">
          <div className="flex gap-6 border-b border-outline-variant overflow-x-auto">
            {tabs.map((t, i) => (
              <button
                key={t}
                onClick={() => setActiveTab(i)}
                className={`pb-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                  activeTab === i ? "border-secondary text-secondary font-bold" : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {activeTab === 0 && (
            <div className="space-y-6">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={18} className="text-secondary" />
                  <h3 className="font-bold text-on-surface">Synthèse IA</h3>
                </div>
                {candidate.recommendation?.compatibilityExplanation ? (
                  <p className="text-sm text-on-surface-variant leading-relaxed">{candidate.recommendation.compatibilityExplanation}</p>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-on-surface-variant">Ce profil n'a pas encore été analysé par le moteur IA.</p>
                    <button
                      onClick={() => onAnalyzeCandidate(candidate.id)}
                      disabled={analyzing}
                      className="shrink-0 bg-accent text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:brightness-110 disabled:opacity-60"
                    >
                      {analyzing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {analyzing ? "Analyse en cours..." : "Analyser avec l'IA"}
                    </button>
                  </div>
                )}
                {candidate.recommendation && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                    <div className="bg-secondary-container/30 border border-secondary-container rounded-lg p-4">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-secondary font-semibold mb-1">Point fort clé</p>
                      <p className="text-sm font-medium text-on-surface">{candidate.recommendation.strengths[0] || "—"}</p>
                    </div>
                    <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold mb-1">Axe de progression</p>
                      <p className="text-sm font-medium text-on-surface">{candidate.recommendation.weaknesses[0] || "—"}</p>
                    </div>
                  </div>
                )}
              </div>

              {candidate.analysis?.experiences && candidate.analysis.experiences.length > 0 && (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
                  <h3 className="font-bold text-on-surface mb-5">Parcours professionnel</h3>
                  <div className="space-y-5">
                    {candidate.analysis.experiences.map((exp, i) => (
                      <div key={i} className="relative pl-6 border-l-2 border-outline-variant">
                        <span className="absolute w-3 h-3 rounded-full bg-secondary -left-[7px] top-0.5 border-2 border-white" />
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="font-bold text-sm text-on-surface">{exp.role}</h4>
                          <span className="px-2 py-0.5 bg-surface-container-low text-on-surface-variant text-[10px] font-mono rounded-full">{exp.years} an(s)</span>
                        </div>
                        <p className="text-sm text-secondary font-medium">{exp.company}</p>
                        {exp.description && <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {candidate.analysis?.educations && candidate.analysis.educations.length > 0 && (
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
                    <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2"><GraduationCap size={16} />Formation</h3>
                    <div className="space-y-3">
                      {candidate.analysis.educations.map((edu, i) => (
                        <div key={i}>
                          <p className="font-bold text-sm text-on-surface">{edu.degree}</p>
                          <p className="text-xs text-on-surface-variant">{edu.school}{edu.year ? ` • ${edu.year}` : ""}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
                  <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2"><BadgeCheck size={16} />Compétences clés</h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ...(candidate.analysis?.skills.languages || []),
                      ...(candidate.analysis?.skills.frameworks || []),
                      ...(candidate.analysis?.skills.cloud || [])
                    ].map(skill => (
                      <span key={skill} className="px-2.5 py-1 bg-surface-container text-secondary text-xs font-medium rounded-full">{skill}</span>
                    ))}
                    {!candidate.analysis && <span className="text-sm text-on-surface-variant">—</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 1 && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
              <div className="flex items-center justify-between mb-3 gap-3">
                <h3 className="font-bold text-on-surface">CV Original</h3>
                <button
                  onClick={openCv}
                  className="shrink-0 px-3 py-1.5 border border-outline-variant rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-surface-container-low transition-all"
                >
                  <Pencil size={14} />
                  Modifier le CV
                </button>
              </div>
              {candidate.cvText ? (
                <pre className="bg-primary-container text-inverse-on-surface p-4 rounded-lg text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">{candidate.cvText}</pre>
              ) : (
                <p className="text-sm text-on-surface-variant">Aucun CV fourni pour ce candidat.</p>
              )}
            </div>
          )}

          {activeTab === 2 && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
              <div className="flex items-center justify-between mb-3 gap-3">
                <h3 className="font-bold text-on-surface">Lettre de Motivation</h3>
                <button
                  onClick={openLetter}
                  className="shrink-0 px-3 py-1.5 border border-outline-variant rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-surface-container-low transition-all"
                >
                  <Pencil size={14} />
                  Ajouter / Modifier
                </button>
              </div>
              {candidate.letterText ? (
                <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">{candidate.letterText}</p>
              ) : (
                <p className="text-sm text-on-surface-variant">Aucune lettre de motivation fournie.</p>
              )}
            </div>
          )}

          {activeTab === 3 && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
              <h3 className="font-bold text-on-surface mb-3">Historique</h3>
              <p className="text-sm text-on-surface-variant">
                Candidature reçue le {new Date(candidate.appliedAt).toLocaleDateString("fr-FR")}, actuellement à l'étape <span className="font-semibold text-on-surface">{candidate.stage}</span>.
              </p>
            </div>
          )}
        </div>

        {/* Right: scores */}
        <div className="space-y-4">
          <div className="bg-primary-container rounded-xl p-6 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-secondary-fixed-dim font-semibold mb-2">Score global</p>
            <p className="font-sans text-5xl font-bold text-white">
              {scores?.globalScore ?? "—"}<span className="text-xl">{scores ? "%" : ""}</span>
            </p>
            {scores && scores.globalScore >= 80 && (
              <span className="inline-block mt-2 px-2.5 py-1 bg-secondary-fixed-dim/20 text-secondary-fixed-dim text-[10px] font-mono uppercase rounded-full">Priorité haute</span>
            )}
            {scores && (
              <div className="mt-5 space-y-3 text-left">
                {[
                  ["Compétences techniques", scores.skillsScore],
                  ["Adéquation expérience", scores.experienceScore],
                  ["Savoir-être", scores.softSkillsScore]
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <div className="flex justify-between text-xs text-inverse-on-surface/80 mb-1">
                      <span>{label}</span><span className="font-bold">{value}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div className="bg-secondary-fixed-dim h-1.5 rounded-full" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {scores && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
              <h3 className="font-bold text-on-surface mb-2">Profil d'aptitudes</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={aptitudeData} outerRadius="70%">
                    <PolarGrid stroke="var(--color-outline-variant)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "var(--color-on-surface-variant)" }} />
                    <Radar dataKey="value" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal : modifier le profil (nom, email, téléphone, localisation, LinkedIn) */}
      {modal === "profile" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeModal}>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-xl p-6 shadow-[0px_10px_25px_rgba(15,23,42,0.08)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-sans text-lg font-semibold text-on-surface">Modifier le profil</h3>
              <button type="button" onClick={closeModal} disabled={saving} className="text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-40"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit(() => ({
              name: profileDraft.name.trim(),
              email: profileDraft.email.trim(),
              phone: profileDraft.phone.trim(),
              location: profileDraft.location.trim(),
              linkedinUrl: profileDraft.linkedinUrl.trim() || undefined,
              salaryExpectation: profileDraft.salaryExpectation.trim() || undefined,
            }))} className="space-y-4">
              <div>
                <label htmlFor="prof-name" className={LABEL_CLS}>Nom <span className="text-error">*</span></label>
                <input id="prof-name" type="text" required autoFocus value={profileDraft.name} onChange={e => setProfileDraft(d => ({ ...d, name: e.target.value }))} className={INPUT_CLS} placeholder="Jean Dupont" />
              </div>
              <div>
                <label htmlFor="prof-email" className={LABEL_CLS}>Email</label>
                <input id="prof-email" type="email" value={profileDraft.email} onChange={e => setProfileDraft(d => ({ ...d, email: e.target.value }))} className={INPUT_CLS} placeholder="jean@exemple.com" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="prof-phone" className={LABEL_CLS}>Téléphone</label>
                  <input id="prof-phone" type="tel" value={profileDraft.phone} onChange={e => setProfileDraft(d => ({ ...d, phone: e.target.value }))} className={INPUT_CLS} placeholder="06 12 34 56 78" />
                </div>
                <div>
                  <label htmlFor="prof-loc" className={LABEL_CLS}>Localisation</label>
                  <input id="prof-loc" type="text" value={profileDraft.location} onChange={e => setProfileDraft(d => ({ ...d, location: e.target.value }))} className={INPUT_CLS} placeholder="Paris, France" />
                </div>
              </div>
              <div>
                <label htmlFor="prof-linkedin" className={LABEL_CLS}>LinkedIn</label>
                <input id="prof-linkedin" type="text" value={profileDraft.linkedinUrl} onChange={e => setProfileDraft(d => ({ ...d, linkedinUrl: e.target.value }))} className={INPUT_CLS} placeholder="linkedin.com/in/…" />
              </div>
              <div>
                <label htmlFor="prof-salary" className={LABEL_CLS}>Prétention salariale</label>
                <input id="prof-salary" type="text" value={profileDraft.salaryExpectation} onChange={e => setProfileDraft(d => ({ ...d, salaryExpectation: e.target.value }))} className={INPUT_CLS} placeholder="ex: 1 300 000 Ar" />
              </div>
              {formError && <p className="text-error text-sm">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} disabled={saving} className={CANCEL_CLS}>Annuler</button>
                <button type="submit" disabled={saving || !profileDraft.name.trim()} className={SUBMIT_CLS}>
                  {saving && <Loader2 size={16} className="animate-spin" />}{saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal : changer la photo (URL) */}
      {modal === "avatar" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeModal}>
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-xl p-6 shadow-[0px_10px_25px_rgba(15,23,42,0.08)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans text-lg font-semibold text-on-surface">Changer la photo</h3>
              <button type="button" onClick={closeModal} disabled={saving} className="text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-40"><X size={20} /></button>
            </div>
            <form onSubmit={handleAvatarSubmit} className="space-y-4">
              <div>
                <label htmlFor="avatar-file" className={LABEL_CLS}>Fichier image</label>
                <input
                  id="avatar-file"
                  type="file"
                  accept="image/*"
                  autoFocus
                  onChange={e => setAvatarFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-on-surface file:mr-3 file:py-2 file:px-4 file:rounded-[8px] file:border-0 file:text-sm file:font-bold file:bg-primary file:text-white hover:file:opacity-90 file:cursor-pointer"
                />
                <p className="text-[11px] text-on-surface-variant mt-1.5">JPG, PNG… — 5 Mo maximum.</p>
              </div>
              {formError && <p className="text-error text-sm">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} disabled={saving} className={CANCEL_CLS}>Annuler</button>
                <button type="submit" disabled={saving || !avatarFile} className={SUBMIT_CLS}>
                  {saving && <Loader2 size={16} className="animate-spin" />}{saving ? "Envoi…" : "Envoyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal : éditer le CV */}
      {modal === "cv" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeModal}>
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-surface-container-lowest rounded-xl p-6 shadow-[0px_10px_25px_rgba(15,23,42,0.08)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans text-lg font-semibold text-on-surface">Modifier le CV — {candidate.name}</h3>
              <button type="button" onClick={closeModal} disabled={saving} className="text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-40"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit(() => ({ cvText: cvDraft }))} className="flex flex-col min-h-0 flex-1">
              <label htmlFor="cv-edit" className={LABEL_CLS}>Texte du CV</label>
              <textarea id="cv-edit" autoFocus value={cvDraft} onChange={e => setCvDraft(e.target.value)} className="w-full flex-1 min-h-[240px] bg-surface-container-lowest border border-outline-variant rounded-[8px] px-3 py-2 text-sm font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all resize-y" placeholder="Collez ou éditez le texte du CV ici…" />
              {formError && <p className="text-error text-sm mt-2">{formError}</p>}
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeModal} disabled={saving} className={CANCEL_CLS}>Annuler</button>
                <button type="submit" disabled={saving} className={SUBMIT_CLS}>
                  {saving && <Loader2 size={16} className="animate-spin" />}{saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal : lettre de motivation */}
      {modal === "letter" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeModal}>
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-surface-container-lowest rounded-xl p-6 shadow-[0px_10px_25px_rgba(15,23,42,0.08)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans text-lg font-semibold text-on-surface">Lettre de motivation — {candidate.name}</h3>
              <button type="button" onClick={closeModal} disabled={saving} className="text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-40"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit(() => ({ letterText: letterDraft }))} className="flex flex-col min-h-0 flex-1">
              <label htmlFor="letter-edit" className={LABEL_CLS}>Texte de la lettre</label>
              <textarea id="letter-edit" autoFocus value={letterDraft} onChange={e => setLetterDraft(e.target.value)} className="w-full flex-1 min-h-[240px] bg-surface-container-lowest border border-outline-variant rounded-[8px] px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all resize-y" placeholder="Saisissez la lettre de motivation…" />
              {formError && <p className="text-error text-sm mt-2">{formError}</p>}
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeModal} disabled={saving} className={CANCEL_CLS}>Annuler</button>
                <button type="submit" disabled={saving} className={SUBMIT_CLS}>
                  {saving && <Loader2 size={16} className="animate-spin" />}{saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
