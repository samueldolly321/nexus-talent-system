import React, { useState } from "react";
import { 
  Search, 
  Sparkles, 
  BrainCircuit, 
  ArrowRight, 
  CheckCircle, 
  MapPin, 
  Clock,
  ExternalLink
} from "lucide-react";
import { Candidate, Job } from "../types";
import { apiFetch } from "../lib/api";

interface AiSearchViewProps {
  candidates: Candidate[];
  jobs: Job[];
  onSelectCandidate: (candidate: Candidate) => void;
}

export default function AiSearchView({ candidates, jobs, onSelectCandidate }: AiSearchViewProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ matchedIds: string[]; explanation: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const quickSearches = [
    "Trouve les développeurs React avec plus de 5 ans d'expérience",
    "Trouve les candidats parlant français et anglais",
    "Trouve les profils DevOps",
    "Trouve des experts Cloud AWS"
  ];

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setQuery(searchQuery);
    setLoading(true);
    setResults(null);
    setError(null);

    try {
      const response = await apiFetch("/api/candidates/ai-search", {
        method: "POST",
        body: JSON.stringify({ query: searchQuery })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        setError(err.error || `Erreur ${response.status}`);
        return;
      }
      const data = await response.json();
      setResults(data);
    } catch (e) {
      console.error(e);
      setError("Impossible de joindre le serveur. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const matchedCandidates = results 
    ? candidates.filter(c => results.matchedIds.includes(c.id))
    : [];

  return (
    <div className="flex-1 bg-transparent min-h-screen p-8 overflow-y-auto font-sans">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2">
          <BrainCircuit className="text-secondary shrink-0 stroke-[2]" size={26} />
          Recherche Intelligente IA
        </h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Interrogez l'ensemble de votre base de talents sémantiquement en langage naturel. Le moteur IA extrait les critères clés en temps réel.
        </p>
      </div>

      {/* Main Search Bar Wrapper */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm mb-8">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
              placeholder="ex: Trouve les développeurs React avec plus de 5 ans d'expérience..."
              className="w-full bg-background text-xs border border-outline-variant rounded-lg p-3.5 pl-10 focus:bg-surface-container-lowest focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary font-medium"
            />
            <Search className="absolute left-3.5 top-3.5 text-on-surface-variant" size={16} />
          </div>
          <button
            onClick={() => handleSearch(query)}
            disabled={loading}
            className="bg-accent hover:brightness-110 text-on-primary font-bold px-5 py-3 rounded-lg text-xs flex items-center gap-2 shadow-sm transition-colors shrink-0 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={14} />
            ) : (
              <Sparkles size={14} className="stroke-[3.5]" />
            )}
            Rechercher
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {/429|quota/i.test(error)
              ? "Quota Gemini épuisé. Réessayez dans quelques minutes ou vérifiez votre clé API."
              : error}
          </div>
        )}

        {/* Quick searches prompt triggers */}
        <div className="mt-4">
          <span className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Exemples de requêtes RH :</span>
          <div className="flex flex-wrap gap-2">
            {quickSearches.map(qs => (
              <button
                key={qs}
                onClick={() => handleSearch(qs)}
                className="bg-surface-container hover:bg-secondary-container/20 hover:text-on-secondary-container transition-colors border border-outline-variant/80 rounded-full px-3.5 py-1 text-xs text-on-surface-variant font-medium"
              >
                {qs}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loader with AI reasoning feel */}
      {loading && (
        <div className="bg-cyan-950/5 border border-secondary-container rounded-xl p-8 text-center max-w-2xl mx-auto mb-8 animate-pulse">
          <BrainCircuit size={40} className="mx-auto text-secondary animate-bounce mb-3" />
          <h4 className="text-sm font-bold text-on-surface">Le modèle Gemini analyse vos profils...</h4>
          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
            Extraction sémantique des CV, comparaison des critères d'expérience, d'outils et de langues dans la base multi-tenant.
          </p>
        </div>
      )}

      {/* Results Section */}
      {results && (
        <div className="space-y-6">
          {/* Verbal Explanation */}
          <div className="bg-cyan-950 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles size={14} className="stroke-[2.5]" />
              Analyse du Moteur IA
            </h4>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">{results.explanation}</p>
          </div>

          {/* Matched Candidates List */}
          <div>
            <h3 className="text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider mb-4">Profils retenus ({matchedCandidates.length})</h3>
            
            {matchedCandidates.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant p-8 text-center text-on-surface-variant">
                <p className="text-xs font-sans">Aucun candidat ne correspond exactement sémantiquement à cette requête.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matchedCandidates.map(cand => (
                  <div key={cand.id} onClick={() => onSelectCandidate(cand)} className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-sm hover:shadow-md hover:border-secondary transition-all cursor-pointer">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-surface-container text-on-surface-variant uppercase tracking-wider">
                          {cand.stage}
                        </span>
                        <h4 className="text-sm font-bold text-on-surface font-sans mt-1">{cand.name}</h4>
                        <p className="text-[10px] text-on-surface-variant font-sans mt-0.5">
                          {jobs.find(j => j.id === cand.jobId)?.title || "Poste général"}
                        </p>
                      </div>

                      {cand.scores?.globalScore && (
                        <span className="font-mono text-xs font-bold text-secondary bg-secondary-container/20 px-2 py-0.5 rounded border border-secondary-container">
                          {cand.scores.globalScore}% Fit
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3 bg-background p-2.5 rounded-lg border border-outline-variant font-sans">
                      {cand.cvText}
                    </p>

                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-outline-variant text-[10px] text-on-surface-variant font-medium">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-on-surface-variant shrink-0" />
                        {cand.location || "Non précisé"}
                      </span>
                      {cand.analysis?.yearsOfExperience !== undefined && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-on-surface-variant shrink-0" />
                          {cand.analysis.yearsOfExperience} ans d'expérience
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Dummy helper to let ts compile safely
interface RefreshCwProps {
  className?: string;
  size?: number;
}
function RefreshCw({ className, size }: RefreshCwProps) {
  return <div className={`animate-spin inline-block rounded-full border-2 border-t-transparent border-slate-950 ${className}`} style={{ width: size, height: size }}></div>;
}
