import React from "react";
import {
  Briefcase,
  Users,
  CheckCircle2,
  BrainCircuit,
  Code,
  Brush,
  Database,
  MoreVertical
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar
} from "recharts";
import TopBar from "./TopBar";
import { User } from "../types";

interface DashboardStats {
  kpis: {
    totalJobs: number;
    activeJobs: number;
    totalCandidates: number;
    hiredCandidates: number;
    avgMatchingScore: number;
  };
  sourcingTrend: Array<{ name: string; candidatures: number }>;
  skillDistribution: Array<{ name: string; count: number }>;
  expDistribution: Array<{ name: string; value: number }>;
  recentCandidates: any[];
  recentJobs: any[];
}

interface DashboardViewProps {
  stats: DashboardStats | null;
  onNavigateToView: (view: string) => void;
  loading: boolean;
  activeUser: User | null;
}

const statusStyle: Record<string, string> = {
  "Reçu": "bg-surface-container-high text-on-surface-variant",
  "Analysé": "bg-surface-container-high text-on-surface-variant",
  "Pré-sélectionné": "bg-yellow-50 text-yellow-700 border border-yellow-200",
  "Entretien RH": "bg-green-50 text-green-700 border border-green-200",
  "Test technique": "bg-yellow-50 text-yellow-700 border border-yellow-200",
  "Entretien final": "bg-green-50 text-green-700 border border-green-200",
  "Offre envoyée": "bg-secondary-container text-on-secondary-container",
  "Embauché": "bg-green-50 text-green-700 border border-green-200",
  "Rejeté": "bg-red-50 text-red-700 border border-red-200"
};

const jobIcons = [Code, Brush, Database];
const jobIconBg = ["bg-primary", "bg-on-primary-fixed-variant", "bg-on-secondary-container"];

export default function DashboardView({ stats, onNavigateToView, loading, activeUser }: DashboardViewProps) {
  if (loading || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-secondary mx-auto" />
          <p className="mt-4 font-mono text-xs text-on-surface-variant">Chargement des indicateurs clés...</p>
        </div>
      </div>
    );
  }

  const { kpis, sourcingTrend, skillDistribution, expDistribution, recentCandidates, recentJobs } = stats;

  const radarData = skillDistribution.slice(0, 6).map(s => ({ subject: s.name, value: s.count }));

  return (
    <div className="flex-1 bg-background min-h-screen flex flex-col">
      <TopBar activeUser={activeUser} />

      <main className="px-8 pt-8 pb-12 flex-1">
        {/* Welcome */}
        <div className="flex justify-between items-end mb-8 flex-wrap gap-4">
          <div>
            <h2 className="font-sans text-[32px] font-semibold text-primary tracking-tight leading-tight">Recruiter Dashboard</h2>
            <p className="text-on-surface-variant mt-1">Intelligent insights for your current talent pipeline.</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 border border-secondary text-secondary rounded-lg text-sm font-medium hover:bg-surface-container transition-all">
              Export Report
            </button>
            <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all">
              Refresh Data
            </button>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <button onClick={() => onNavigateToView("jobs")} className="text-left bg-white border border-outline-variant rounded-xl p-6 transition-all hover:border-secondary">
            <div className="flex justify-between items-start mb-4">
              <span className="p-2 bg-surface-container text-secondary rounded-lg"><Briefcase size={20} /></span>
              <span className="text-green-600 font-mono text-[11px] font-medium">+12%</span>
            </div>
            <h3 className="text-on-surface-variant font-mono text-[11px] uppercase tracking-wider mb-1">Active Jobs</h3>
            <p className="font-sans text-[40px] leading-none font-bold text-primary">{kpis.activeJobs}</p>
          </button>

          <button onClick={() => onNavigateToView("candidates")} className="text-left bg-white border border-outline-variant rounded-xl p-6 transition-all hover:border-secondary">
            <div className="flex justify-between items-start mb-4">
              <span className="p-2 bg-surface-container text-secondary rounded-lg"><Users size={20} /></span>
              <span className="text-green-600 font-mono text-[11px] font-medium">+8.4%</span>
            </div>
            <h3 className="text-on-surface-variant font-mono text-[11px] uppercase tracking-wider mb-1">Total Candidates</h3>
            <p className="font-sans text-[40px] leading-none font-bold text-primary">{kpis.totalCandidates.toLocaleString("fr-FR")}</p>
          </button>

          <div className="bg-white border border-outline-variant rounded-xl p-6 transition-all hover:border-secondary">
            <div className="flex justify-between items-start mb-4">
              <span className="p-2 bg-surface-container text-secondary rounded-lg"><CheckCircle2 size={20} /></span>
              <span className="text-on-surface-variant font-mono text-[11px]">This Month</span>
            </div>
            <h3 className="text-on-surface-variant font-mono text-[11px] uppercase tracking-wider mb-1">Hired</h3>
            <p className="font-sans text-[40px] leading-none font-bold text-primary">{kpis.hiredCandidates}</p>
          </div>

          <div className="bg-white border border-outline-variant rounded-xl p-6 relative overflow-hidden transition-all hover:border-secondary">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <span className="p-2 bg-secondary-container text-on-secondary-fixed-variant rounded-lg"><BrainCircuit size={20} /></span>
                <span className="text-secondary font-bold font-mono text-[11px]">AI Prescient</span>
              </div>
              <h3 className="text-on-surface-variant font-mono text-[11px] uppercase tracking-wider mb-1">Avg AI Match Rate</h3>
              <p className="font-sans text-[40px] leading-none font-bold text-secondary">{kpis.avgMatchingScore}%</p>
            </div>
          </div>
        </div>

        {/* Charts bento */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white border border-outline-variant rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-sans text-2xl font-semibold text-primary">Monthly Applications</h3>
              <select className="bg-surface-container-low border border-outline-variant text-sm rounded-lg py-1 px-3 focus:outline-none">
                <option>Last 6 Months</option>
                <option>Last Year</option>
              </select>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sourcingTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCandidatures" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#76777d" fontSize={11} />
                  <YAxis stroke="#76777d" fontSize={11} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="candidatures" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorCandidatures)" dot={{ r: 4, fill: "#fff", stroke: "#06b6d4", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-outline-variant rounded-xl p-6">
            <h3 className="font-sans text-2xl font-semibold text-primary mb-6">Skill Demand</h3>
            <div className="h-64 flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#45464d" }} />
                  <Radar dataKey="value" stroke="#00687a" fill="#00687a" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {skillDistribution.slice(0, 3).map(s => (
                <span key={s.name} className="px-2 py-1 bg-surface-container text-secondary text-[10px] font-mono rounded-full">{s.name}</span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 bg-white border border-outline-variant rounded-xl p-6">
            <h3 className="font-sans text-2xl font-semibold text-primary mb-6">Education Distribution</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expDistribution} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#76777d" fontSize={11} />
                  <YAxis stroke="#76777d" fontSize={11} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="value" fill="#131b2e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-sans text-2xl font-semibold text-primary">Recent Applications</h3>
              <button onClick={() => onNavigateToView("candidates")} className="text-secondary font-mono text-xs font-semibold hover:underline">View All</button>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-surface text-on-surface-variant font-mono text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 font-medium">Candidate</th>
                    <th className="px-6 py-3 font-medium">Applied For</th>
                    <th className="px-6 py-3 font-medium">Match</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {recentCandidates.slice(0, 5).map(cand => (
                    <tr key={cand.id} className="hover:bg-surface-container-low transition-all cursor-pointer" onClick={() => onNavigateToView("candidates")}>
                      <td className="px-6 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-fixed-dim flex items-center justify-center font-bold text-on-primary-fixed text-xs shrink-0">
                          {cand.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-on-surface truncate">{cand.name}</p>
                          <p className="text-[11px] text-on-surface-variant truncate">{cand.location}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm whitespace-nowrap">—</td>
                      <td className="px-6 py-3">
                        {cand.scores?.globalScore ? (
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-surface-container rounded-full h-1.5">
                              <div className="bg-accent h-1.5 rounded-full" style={{ width: `${cand.scores.globalScore}%` }} />
                            </div>
                            <span className="text-sm font-bold text-secondary">{cand.scores.globalScore}%</span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono text-amber-600">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap ${statusStyle[cand.stage] || "bg-surface-container text-on-surface-variant"}`}>
                          {cand.stage}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <button className="p-1.5 hover:bg-surface-variant rounded-full"><MoreVertical size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-sans text-2xl font-semibold text-primary">Latest Job Posts</h3>
              <button onClick={() => onNavigateToView("jobs")} className="text-secondary font-mono text-xs font-semibold hover:underline">Manage All</button>
            </div>
            <div className="p-6 space-y-4">
              {recentJobs.slice(0, 3).map((job, i) => {
                const Icon = jobIcons[i % jobIcons.length];
                return (
                  <div key={job.id} onClick={() => onNavigateToView("jobs")} className="flex items-center gap-4 p-4 rounded-xl border border-outline-variant hover:border-secondary transition-all cursor-pointer">
                    <div className={`h-12 w-12 ${jobIconBg[i % jobIconBg.length]} rounded-lg flex items-center justify-center shrink-0`}>
                      <Icon size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-on-surface truncate">{job.title}</h4>
                      <p className="font-mono text-[10px] text-on-surface-variant">{job.location}</p>
                    </div>
                  </div>
                );
              })}
              {recentJobs.length === 0 && (
                <p className="text-sm text-on-surface-variant text-center py-6">Aucune offre publiée récemment.</p>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="flex justify-between items-center py-4 px-8 border-t border-outline-variant bg-surface">
        <p className="font-mono text-[10px] text-on-surface-variant">© 2026 Nexus Talent System. v1.0.0</p>
        <div className="flex gap-6">
          <a className="font-mono text-[10px] text-on-surface-variant hover:text-secondary transition-colors" href="#">Privacy Policy</a>
          <a className="font-mono text-[10px] text-on-surface-variant hover:text-secondary transition-colors" href="#">Terms of Service</a>
          <a className="font-mono text-[10px] text-on-surface-variant hover:text-secondary transition-colors" href="#">API Docs</a>
        </div>
      </footer>
    </div>
  );
}
