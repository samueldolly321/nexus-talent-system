import React, { useMemo, useState } from "react";
import { Sparkles, X, Download, LayoutGrid, ArrowUpDown } from "lucide-react";
import TopBar from "./TopBar";
import { Candidate, Job, User } from "../types";

interface CandidatesViewProps {
  candidates: Candidate[];
  jobs: Job[];
  activeUser: User | null;
  onSelectCandidate: (candidate: Candidate) => void;
  loading: boolean;
}

const scoreTone = (score: number) => {
  if (score >= 80) return "bg-secondary-container text-on-secondary-container";
  if (score >= 60) return "bg-surface-container-high text-on-surface-variant";
  return "bg-red-50 text-red-600";
};

export default function CandidatesView({ candidates, jobs, activeUser, onSelectCandidate, loading }: CandidatesViewProps) {
  const [minExperience, setMinExperience] = useState(0);
  const [scoreFilter, setScoreFilter] = useState<"all" | "excellent" | "strong">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAiBanner, setShowAiBanner] = useState(true);

  const allSkills = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach(c => c.analysis?.skills?.frameworks?.forEach(s => set.add(s)));
    candidates.forEach(c => c.analysis?.skills?.languages?.forEach(s => set.add(s)));
    return Array.from(set).slice(0, 4);
  }, [candidates]);

  const filtered = useMemo(() => {
    return candidates.filter(c => {
      const score = c.scores?.globalScore ?? 0;
      if (scoreFilter === "excellent" && score < 80) return false;
      if (scoreFilter === "strong" && (score < 60 || score >= 80)) return false;
      if ((c.analysis?.yearsOfExperience ?? 0) < minExperience) return false;
      return true;
    });
  }, [candidates, scoreFilter, minExperience]);

  const excellentCount = candidates.filter(c => (c.scores?.globalScore ?? 0) >= 80).length;
  const strongCount = candidates.filter(c => (c.scores?.globalScore ?? 0) >= 60 && (c.scores?.globalScore ?? 0) < 80).length;

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
        searchPlaceholder="AI Search: 'Top React candidates with 5+ years experience'..."
        rightSlot={
          <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all">
            <Download size={15} />
            Export List
          </button>
        }
      />

      <div className="flex flex-1 min-h-0">
        {/* Filters sidebar */}
        <aside className="w-72 border-r border-outline-variant p-6 shrink-0 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-on-surface">Filters</h3>
            <button
              onClick={() => { setScoreFilter("all"); setMinExperience(0); }}
              className="text-secondary text-xs font-bold hover:underline"
            >
              Clear all
            </button>
          </div>

          <div className="mb-6">
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold mb-3">AI Match Score</h4>
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
                Strong (60-80%)
              </span>
              <span className="text-xs text-on-surface-variant font-mono">{strongCount}</span>
            </label>
          </div>

          <div className="mb-6">
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold mb-3">Experience (years)</h4>
            <input
              type="range"
              min={0}
              max={15}
              value={minExperience}
              onChange={e => setMinExperience(Number(e.target.value))}
              className="w-full accent-secondary"
            />
            <div className="flex justify-between text-xs text-on-surface-variant font-mono mt-1">
              <span>{minExperience} yrs</span>
              <span>15+ yrs</span>
            </div>
          </div>

          {allSkills.length > 0 && (
            <div className="mb-6">
              <h4 className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold mb-3">Skills</h4>
              <div className="flex flex-wrap gap-2">
                {allSkills.map(skill => (
                  <span key={skill} className="px-2.5 py-1 bg-surface-container text-secondary text-xs rounded-full font-medium">{skill}</span>
                ))}
                <span className="px-2.5 py-1 bg-surface-container-low text-on-surface-variant text-xs rounded-full font-medium">+12</span>
              </div>
            </div>
          )}

          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold mb-3">Status</h4>
            <div className="space-y-2">
              {["All Candidates", "Interviewing", "Offer Extended", "Applied"].map(s => (
                <label key={s} className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
                  <input type="radio" name="status" className="text-secondary focus:ring-secondary" defaultChecked={s === "All Candidates"} />
                  {s}
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Main list */}
        <main className="flex-1 min-w-0 p-6 overflow-y-auto relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-sans text-2xl font-semibold text-primary">Candidates <span className="text-on-surface-variant font-normal">({filtered.length})</span></h2>
            <div className="flex items-center gap-3">
              <button className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm flex items-center gap-2 hover:bg-surface-container-low">
                <ArrowUpDown size={14} />
                Sort by: Newest
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
                    <th className="px-4 py-3 font-medium">Profile</th>
                    <th className="px-4 py-3 font-medium">Email &amp; Phone</th>
                    <th className="px-4 py-3 font-medium">AI Match Score</th>
                    <th className="px-4 py-3 font-medium">Experience</th>
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
                            <span className="text-xs font-mono text-amber-600">Not analyzed</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-on-surface">
                          {cand.analysis?.yearsOfExperience ?? "—"} Years
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
                <span>Showing 1 to {filtered.length} of {candidates.length} candidates</span>
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
                    <p className="font-bold text-white text-sm">AI Recruiter Assistant</p>
                    <p className="font-mono text-[9px] text-secondary-fixed-dim uppercase tracking-wider">Active Insight</p>
                  </div>
                </div>
                <button onClick={() => setShowAiBanner(false)} className="text-white/60 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm text-inverse-on-surface/90 mb-4">
                I've identified <span className="font-bold text-white">{excellentCount} candidates</span> matching your criteria with a score above 80%. Would you like to schedule a bulk intro?
              </p>
              <button className="w-full bg-secondary text-white py-2 rounded-lg text-sm font-bold hover:brightness-110">View Batch</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
