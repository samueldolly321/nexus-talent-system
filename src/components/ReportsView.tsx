import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { apiFetch } from "../lib/api";
import {
  BarChart3,
  FileSpreadsheet,
  FileDown,
  Users,
  CheckCircle2, 
  PieChart as LucidePieChart, 
  Target,
  Clock,
  Sparkles,
  Download
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadarChart
} from "recharts";

interface ReportsViewProps {
  stats: any;
  companyName: string;
  onNavigateToView: (view: string) => void;
}

export default function ReportsView({ stats, companyName, onNavigateToView }: ReportsViewProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [funnel, setFunnel] = useState<{ stage: string; count: number }[]>([]);

  // Entonnoir réel : nombre de candidats par stage, chargé au montage.
  useEffect(() => {
    apiFetch("/api/reports/funnel")
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (data?.funnel) setFunnel(data.funnel); })
      .catch(() => { /* silencieux : l'entonnoir reste vide */ });
  }, []);

  // Format attendu par le BarChart et l'export PDF.
  const funnelData = funnel.map(f => ({ name: f.stage, valeur: f.count }));

  // KPIs dérivés des stats réelles (prop). "--" si donnée absente.
  const kpis = stats?.kpis;
  const conversionRate =
    kpis && kpis.totalCandidates > 0
      ? ((kpis.hiredCandidates / kpis.totalCandidates) * 100).toFixed(1)
      : null;
  const aiScore =
    kpis && kpis.avgMatchingScore != null ? Number(kpis.avgMatchingScore).toFixed(1) : null;

  const channelDistribution = [
    { name: "LinkedIn Recruiter", pourcentage: 54 },
    { name: "Cooptation Interne", pourcentage: 22 },
    { name: "Sourcing Email", pourcentage: 14 },
    { name: "Indeed / Monster", pourcentage: 10 }
  ];

  // Échappe le texte injecté dans le HTML du registre PDF (évite un HTML cassé/injection).
  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  // Export Excel (.xlsx) via SheetJS : un onglet "Candidats" à partir des données réelles.
  const handleExportExcel = () => {
    if (!stats) return;
    setExporting("excel");

    const rows = (stats.recentCandidates || []).map((c: any) => ({
      Nom: c.name,
      Email: c.email,
      Téléphone: c.phone,
      Localisation: c.location,
      Stage: c.stage,
      "Score Global": c.scores?.globalScore ?? "N/A",
      "Score Compétences": c.scores?.skillsScore ?? "N/A",
      "Score Expérience": c.scores?.experienceScore ?? "N/A",
      "Décision IA": c.recommendation?.suggestedDecision ?? "Non analysé",
      "Date candidature": new Date(c.appliedAt).toLocaleDateString("fr-FR"),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candidats");
    XLSX.writeFile(wb, `nexus-sourcing-${companyName}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setExporting(null);
  };

  // Export PDF : ouvre une fenêtre avec une mise en page dédiée à l'impression,
  // puis déclenche l'impression navigateur (l'utilisateur choisit "Enregistrer en PDF").
  const handleExportPdf = () => {
    if (!stats) return;
    setExporting("pdf");

    const kpis = stats.kpis || {};
    const candidates = stats.recentCandidates || [];
    const dateStr = new Date().toLocaleDateString("fr-FR");

    const kpiCards = [
      { label: "Offres d'emploi", value: kpis.totalJobs ?? 0 },
      { label: "Candidatures totales", value: kpis.totalCandidates ?? 0 },
      { label: "Embauches", value: kpis.hiredCandidates ?? 0 },
      { label: "Score moyen IA", value: `${kpis.avgMatchingScore ?? 0}%` },
    ]
      .map(k => `<div class="kpi"><div class="kpi-value">${escapeHtml(k.value)}</div><div class="kpi-label">${escapeHtml(k.label)}</div></div>`)
      .join("");

    const candidateRows = candidates
      .map((c: any) => `
        <tr>
          <td>${escapeHtml(c.name)}</td>
          <td>${escapeHtml(c.stage)}</td>
          <td>${escapeHtml(c.scores?.globalScore ?? "N/A")}</td>
          <td>${escapeHtml(c.recommendation?.suggestedDecision ?? "Non analysé")}</td>
        </tr>`)
      .join("");

    const funnelItems = funnelData
      .map(f => `<li><strong>${escapeHtml(f.name)}</strong> : ${escapeHtml(f.valeur)}</li>`)
      .join("");

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Registre RH — ${escapeHtml(companyName)}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
  h1 { color: #131b2e; font-size: 22px; margin-bottom: 4px; }
  h2 { color: #131b2e; font-size: 15px; margin-top: 28px; }
  .meta { color: #64748b; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
  th { background: #131b2e; color: white; padding: 8px; text-align: left; }
  td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
  .kpi-value { font-size: 28px; font-weight: bold; color: #131b2e; }
  .kpi-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
  ul { font-size: 12px; line-height: 1.9; }
  footer { margin-top: 40px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>Nexus Talent</h1>
  <div class="meta">${escapeHtml(companyName)} — Registre RH généré le ${escapeHtml(dateStr)}</div>

  <h2>Indicateurs clés</h2>
  <div class="kpi-grid">${kpiCards}</div>

  <h2>Candidats récents</h2>
  <table>
    <thead><tr><th>Nom</th><th>Stage</th><th>Score global</th><th>Décision IA</th></tr></thead>
    <tbody>${candidateRows || `<tr><td colspan="4">Aucun candidat.</td></tr>`}</tbody>
  </table>

  <h2>Entonnoir de recrutement</h2>
  <ul>${funnelItems}</ul>

  <footer>Généré par Nexus Talent System</footer>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) {
      setExporting(null);
      alert("Impossible d'ouvrir la fenêtre d'impression. Autorisez les pop-ups pour ce site.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    win.close();
    setExporting(null);
  };

  return (
    <div className="flex-1 bg-background min-h-screen p-8 overflow-y-auto font-sans">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2">
            <BarChart3 className="text-secondary shrink-0" />
            Statistiques & Rapports RH
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Analyse complète de la performance de sourcing, de la vélocité du pipeline de recrutement et exports de données.
          </p>
        </div>
        <button
          onClick={() => onNavigateToView("candidates")}
          className="px-4 py-2 border border-secondary text-secondary rounded-lg text-sm font-medium hover:bg-surface-container transition-all shrink-0"
        >
          Voir les candidats
        </button>
      </div>

      {/* KPI Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-outline-variant p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-secondary-container/20 text-secondary rounded-lg shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <span className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider font-semibold">Temps Moyen de Recrutement</span>
            <span className="text-xl font-bold text-on-surface block mt-0.5 font-sans">-- j</span>
            <span className="text-[10px] font-mono text-on-surface-variant font-semibold block mt-0.5">Données indicatives</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-outline-variant p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
            <Target size={22} />
          </div>
          <div>
            <span className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider font-semibold">Taux de Conversion Final</span>
            <span className="text-xl font-bold text-on-surface block mt-0.5 font-sans">{conversionRate !== null ? `${conversionRate}%` : "--"}</span>
            <span className="text-[10px] text-on-surface-variant block mt-0.5">Embauchés / total candidats</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-outline-variant p-6 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span className="block text-[10px] font-mono text-on-surface-variant uppercase tracking-wider font-semibold">Sourcing ROI par IA</span>
            <span className="text-xl font-bold text-on-surface block mt-0.5 font-sans">{aiScore !== null ? `${aiScore}% d'exactitude` : "--"}</span>
            <span className="text-[10px] text-on-secondary-container font-semibold block mt-0.5">Précision du scoring sémantique</span>
          </div>
        </div>
      </div>

      {/* Main Charts Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Recruitment Funnel Conversion Bar chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-outline-variant p-6 shadow-sm">
          <h3 className="font-sans font-bold text-on-surface text-sm mb-4">Entonnoir de Recrutement (Fidélité de conversion)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} className="font-mono" />
                <YAxis stroke="#94a3b8" fontSize={11} className="font-mono" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="valeur" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Acquisition channels pie chart representation */}
        <div className="bg-white rounded-xl border border-outline-variant p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-sans font-bold text-on-surface text-sm mb-1">Canaux de Sourcing</h3>
            <p className="text-[10px] font-mono text-on-surface-variant/70 mb-1">Données indicatives — champ source à venir</p>
            <p className="text-xs text-on-surface-variant mb-6">Répartition par origine des candidatures reçues.</p>
          </div>

          <div className="space-y-4">
            {channelDistribution.map((ch, i) => (
              <div key={ch.name}>
                <div className="flex justify-between text-xs text-on-surface-variant font-medium mb-1.5">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: i === 0 ? "#06b6d4" : i === 1 ? "#3b82f6" : i === 2 ? "#6366f1" : "#94a3b8" }}></span>
                    {ch.name}
                  </span>
                  <span className="font-mono font-bold text-on-surface">{ch.pourcentage}%</span>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ 
                    width: `${ch.pourcentage}%`,
                    backgroundColor: i === 0 ? "#06b6d4" : i === 1 ? "#3b82f6" : i === 2 ? "#6366f1" : "#94a3b8"
                  }}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-on-surface-variant font-mono mt-6 border-t border-outline-variant pt-3">
            Source : Analyse d'acquisition Nexus Talent
          </div>
        </div>
      </div>

      {/* Export Reports Panel */}
      <div className="bg-white rounded-xl border border-outline-variant p-6 shadow-sm">
        <h3 className="font-sans font-bold text-on-surface text-sm mb-1">Génération de Rapports Officiels</h3>
        <p className="text-xs text-on-surface-variant mb-6">Exportez le registre complet des candidatures, les analyses et les décisions recommandées par le moteur IA.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Excel Export Card */}
          <div className="border border-outline-variant rounded-xl p-5 hover:border-outline-variant hover:bg-background/20 transition-all text-left">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                <FileSpreadsheet size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-on-surface">Rapport de Sourcing Excel (.xlsx)</h4>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Contient les informations de contact, les coordonnées sémantiques, les notations IA détaillées et les statuts du pipeline de recrutement.
                </p>
                
                <button
                  onClick={handleExportExcel}
                  disabled={exporting !== null}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                >
                  {exporting === "excel" ? (
                    <RefreshCw className="animate-spin" size={13} />
                  ) : (
                    <Download size={13} />
                  )}
                  Générer le rapport Excel
                </button>
              </div>
            </div>
          </div>

          {/* PDF Export Card */}
          <div className="border border-outline-variant rounded-xl p-5 hover:border-outline-variant hover:bg-background/20 transition-all text-left">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-lg shrink-0">
                <FileDown size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-on-surface">Registre RH PDF (.pdf)</h4>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Registre de recrutement à en-tête officiel de l'entreprise contenant l'historique d'audit, les graphiques analytiques clés et le récapitulatif des postes.
                </p>

                <button
                  onClick={handleExportPdf}
                  disabled={exporting !== null}
                  className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                >
                  {exporting === "pdf" ? (
                    <RefreshCw className="animate-spin" size={13} />
                  ) : (
                    <Download size={13} />
                  )}
                  Générer le registre PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RefreshCw({ className, size }: { className?: string; size?: number }) {
  return <div className={`animate-spin inline-block rounded-full border-2 border-t-transparent border-white ${className}`} style={{ width: size, height: size }}></div>;
}
