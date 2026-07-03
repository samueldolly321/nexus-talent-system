import React, { useState } from "react";
import { MoreHorizontal, Filter, Share2, LayoutGrid, List, Sparkles, FileText, Link2 } from "lucide-react";
import TopBar from "./TopBar";
import { Candidate, Job, PipelineStage, User } from "../types";

interface PipelineViewProps {
  candidates: Candidate[];
  jobs: Job[];
  activeUser: User | null;
  onSelectCandidate: (candidate: Candidate) => void;
  onUpdateStage: (id: string, stage: PipelineStage) => void;
  loading: boolean;
}

const stageOrder = Object.values(PipelineStage);

export default function PipelineView({ candidates, jobs, activeUser, onSelectCandidate, onUpdateStage, loading }: PipelineViewProps) {
  const [filterJobId, setFilterJobId] = useState<string>("all");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const filtered = candidates.filter(c => filterJobId === "all" || c.jobId === filterJobId);

  const getStageCandidates = (stage: PipelineStage) => filtered.filter(c => c.stage === stage);

  const handleDrop = (stage: PipelineStage) => {
    if (draggedId) {
      onUpdateStage(draggedId, stage);
      setDraggedId(null);
    }
  };

  return (
    <div className="flex-1 bg-background min-h-screen flex flex-col">
      <TopBar activeUser={activeUser} searchPlaceholder="Rechercher candidats, postes ou scores..." />

      <main className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col min-h-0">
        <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
          <div>
            <h2 className="font-sans text-2xl md:text-[32px] font-semibold text-primary tracking-tight leading-tight">Pipeline de recrutement</h2>
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
              <span className="text-secondary text-sm font-bold">— {filtered.length} candidats</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-2 border border-outline-variant rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-surface-container-low">
              <Filter size={14} />Filtrer
            </button>
            <button className="px-3 py-2 border border-outline-variant rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-surface-container-low">
              <Share2 size={14} />Partager
            </button>
            <div className="flex border border-outline-variant rounded-lg overflow-hidden">
              <button className="p-2 bg-surface-container-high text-secondary"><LayoutGrid size={16} /></button>
              <button className="p-2 hover:bg-surface-container-low"><List size={16} /></button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-secondary mx-auto" />
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
                          className="bg-white border border-outline-variant rounded-xl p-4 cursor-pointer hover:border-secondary transition-all shadow-sm"
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
    </div>
  );
}
