import React, { useState } from "react";
import { ChevronRight, Download, Mail, Phone, MapPin, Linkedin, Globe, Sparkles, RefreshCw, GraduationCap, BadgeCheck } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer
} from "recharts";
import TopBar from "./TopBar";
import { Candidate, Job, PipelineStage, User } from "../types";

interface CandidateProfileViewProps {
  candidate: Candidate;
  job: Job | undefined;
  activeUser: User | null;
  onBack: () => void;
  onUpdateStage: (id: string, stage: PipelineStage) => void;
  onAnalyzeCandidate: (id: string) => Promise<void>;
  analyzing: boolean;
  onOpenRecommendation: () => void;
}

const tabs = ["Analyse IA", "Expérience & CV", "Lettre de motivation", "Historique"];

export default function CandidateProfileView({
  candidate,
  job,
  activeUser,
  onBack,
  onUpdateStage,
  onAnalyzeCandidate,
  analyzing,
  onOpenRecommendation
}: CandidateProfileViewProps) {
  const [activeTab, setActiveTab] = useState(0);
  const scores = candidate.scores;

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
            <button className="px-3 py-2 border border-outline-variant rounded-lg text-sm font-medium hover:bg-surface-container-low">Partager le profil</button>
            <button
              onClick={onOpenRecommendation}
              className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:opacity-90"
            >
              Voir la recommandation
            </button>
          </div>
        }
      />

      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6 items-start">
        {/* Left: identity card */}
        <div className="space-y-4">
          <div className="bg-white border border-outline-variant rounded-xl p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-primary-fixed-dim mx-auto mb-4 flex items-center justify-center font-bold text-2xl text-on-primary-fixed">
              {candidate.name.substring(0, 2).toUpperCase()}
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
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold mb-1.5">Étape de recrutement</label>
            <select
              value={candidate.stage}
              onChange={e => onUpdateStage(candidate.id, e.target.value as PipelineStage)}
              className="w-full bg-white border border-outline-variant rounded-lg p-2.5 text-sm font-medium focus:outline-none focus:border-secondary"
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
              <div className="bg-white border border-outline-variant rounded-xl p-6">
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
                  <div className="grid grid-cols-2 gap-4 mt-5">
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
                <div className="bg-white border border-outline-variant rounded-xl p-6">
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
                  <div className="bg-white border border-outline-variant rounded-xl p-6">
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
                <div className="bg-white border border-outline-variant rounded-xl p-6">
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
            <div className="bg-white border border-outline-variant rounded-xl p-6">
              <h3 className="font-bold text-on-surface mb-3">CV Original</h3>
              {candidate.cvText ? (
                <pre className="bg-primary-container text-inverse-on-surface p-4 rounded-lg text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">{candidate.cvText}</pre>
              ) : (
                <p className="text-sm text-on-surface-variant">Aucun CV fourni pour ce candidat.</p>
              )}
            </div>
          )}

          {activeTab === 2 && (
            <div className="bg-white border border-outline-variant rounded-xl p-6">
              <h3 className="font-bold text-on-surface mb-3">Lettre de Motivation</h3>
              {candidate.letterText ? (
                <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">{candidate.letterText}</p>
              ) : (
                <p className="text-sm text-on-surface-variant">Aucune lettre de motivation fournie.</p>
              )}
            </div>
          )}

          {activeTab === 3 && (
            <div className="bg-white border border-outline-variant rounded-xl p-6">
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
            <div className="bg-white border border-outline-variant rounded-xl p-6">
              <h3 className="font-bold text-on-surface mb-2">Profil d'aptitudes</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={aptitudeData} outerRadius="70%">
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "#45464d" }} />
                    <Radar dataKey="value" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
