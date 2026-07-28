import React, { useState } from "react";
import {
  Terminal,
  Code,
  Database,
  Layers,
  Copy,
  Check,
  BookOpen,
  HardDriveUpload,
  Cpu,
  Loader2
} from "lucide-react";
import { apiFetch } from "../lib/api";

export default function DevCenterView() {
  const [activeTab, setActiveTab] = useState<"architecture" | "dbcontext" | "controller" | "docker">("architecture");
  const [copied, setCopied] = useState(false);

  // Maintenance : backfill one-shot des prétentions salariales (candidats
  // dont la lettre a été importée avant l'ajout de l'extraction automatique).
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);

  const handleBackfill = async () => {
    setBackfilling(true);
    setBackfillMsg(null);
    setBackfillError(null);
    try {
      const res = await apiFetch("/api/admin/backfill-salary-expectations", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec du backfill.");
      const names = (data.results || []).map((r: { name: string; salaryExpectation: string }) => `${r.name} (${r.salaryExpectation})`).join(", ");
      setBackfillMsg(`${data.updated} candidat(s) mis à jour${names ? " : " + names : "."}`);
    } catch (e: any) {
      setBackfillError(e?.message || "Une erreur est survenue.");
    } finally {
      setBackfilling(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const dbContextCode = `using Microsoft.EntityFrameworkCore;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NexusTalentSystem.Infrastructure.Persistence
{
    // ==========================================
    // ENTITY FRAMEWORK CORE MULTI-TENANT CONTEXT
    // ==========================================
    public class NexusTalentDbContext : DbContext
    {
        private readonly string _tenantId; // Claim companyId extrait du JWT Token

        public NexusTalentDbContext(DbContextOptions<NexusTalentDbContext> options, string tenantId) 
            : base(options)
        {
            _tenantId = tenantId;
        }

        public DbSet<Company> Companies { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Job> Jobs { get; set; }
        public DbSet<Candidate> Candidates { get; set; }
        public DbSet<CandidateFile> CandidateFiles { get; set; }
        public DbSet<CandidateExperience> CandidateExperiences { get; set; }
        public DbSet<CandidateEducation> CandidateEducations { get; set; }
        public DbSet<CandidateSkill> CandidateSkills { get; set; }
        public DbSet<CandidateLanguage> CandidateLanguages { get; set; }
        public DbSet<CandidateScore> CandidateScores { get; set; }
        public DbSet<CandidateRecommendation> CandidateRecommendations { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Clefs primaires composées pour tables d'association PostgreSQL
            modelBuilder.Entity<CandidateSkill>().HasKey(cs => new { cs.CandidateId, cs.SkillName });
            modelBuilder.Entity<CandidateLanguage>().HasKey(cl => new { cl.CandidateId, cl.LanguageCode });

            // REGLE D'ISOLATION MULTI-TENANT CRITIQUE (Filtre Global EF Core)
            // Empêche toute fuite accidentelle de données d'une entreprise à une autre.
            modelBuilder.Entity<User>().HasQueryFilter(u => u.CompanyId == _tenantId);
            modelBuilder.Entity<Job>().HasQueryFilter(j => j.CompanyId == _tenantId);
            modelBuilder.Entity<Candidate>().HasQueryFilter(c => c.CompanyId == _tenantId);
            modelBuilder.Entity<AuditLog>().HasQueryFilter(a => a.CompanyId == _tenantId);

            // Indexation PostgreSQL pour requêtes haute densité (Recherche sémantique & Kanban)
            modelBuilder.Entity<Candidate>().HasIndex(c => new { c.CompanyId, c.JobId, c.Stage });
            modelBuilder.Entity<CandidateSkill>().HasIndex(cs => new { cs.SkillName, cs.CandidateId });
        }
    }
}`;

  const controllerCode = `using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace NexusTalentSystem.Api.Controllers
{
    /// <summary>
    /// Contrôleur REST API pour la gestion intelligente des candidats et du scoring IA.
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/v1/candidates")]
    [Produces("application/json")]
    public class CandidateController : ControllerBase
    {
        private readonly IMediator _mediator; // Pattern CQRS via MediatR

        public CandidateController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Déclenche l'analyse sémantique IA par OpenAI d'un CV par rapport aux critères requis du poste.
        /// </summary>
        [HttpPost("{id}/analyze")]
        [Authorize(Roles = "RH,AdminEntreprise")]
        [ProducesResponseType(typeof(CandidateAnalysisDto), 200)]
        [ProducesResponseType(400)]
        public async Task<IActionResult> TriggerAiAnalysis(string id)
        {
            var command = new AnalyzeCandidateWithAiCommand { CandidateId = id };
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        /// <summary>
        /// Recherche sémantique s'appuyant sur l'IA (NLP) sur l'ensemble du vivier de talents de l'entreprise.
        /// </summary>
        [HttpPost("ai-search")]
        [ProducesResponseType(typeof(AiSearchResultDto), 200)]
        public async Task<IActionResult> AiSearch([FromBody] AiSearchQuery query)
        {
            var result = await _mediator.Send(query);
            return Ok(result);
        }
    }
}`;

  const dockerCode = `version: '3.8'

services:
  nexus-db:
    image: postgres:15-alpine
    container_name: nexus-postgresql
    environment:
      POSTGRES_DB: nexustalent_prod
      POSTGRES_USER: nexus_admin
      POSTGRES_PASSWORD: SecretPassword2026!
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  nexus-api:
    image: nexustalentsystem-api:latest
    container_name: nexus-webapi
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=Host=nexus-db;Database=nexustalent_prod;Username=nexus_admin;Password=SecretPassword2026!
      - OpenAI__ApiKey=sk-YourOpenAiKeyHere
    ports:
      - "5000:80"
    depends_on:
      - nexus-db

volumes:
  pgdata:
    driver: local`;

  return (
    <div className="flex-1 bg-transparent min-h-screen p-8 overflow-y-auto font-sans">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2">
          <Terminal className="text-secondary shrink-0 stroke-[2]" size={26} />
          Architecture & Blueprint .NET Core
        </h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Centre de ressources techniques de l'application SaaS. Modèles de données PostgreSQL, contrôleurs C# ASP.NET Core, CQRS et environnements de déploiement Docker.
        </p>
      </div>

      {/* Maintenance : outils d'administration ponctuels */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-sm mb-8">
        <div className="flex items-center gap-2 mb-1">
          <HardDriveUpload size={18} className="text-secondary shrink-0" />
          <h3 className="font-bold text-on-surface font-sans text-sm">Maintenance — Prétentions salariales</h3>
        </div>
        <p className="text-xs text-on-surface-variant mb-4">
          Renseigne <code className="font-mono">salaryExpectation</code> pour les candidats existants dont la lettre de motivation a été importée avant l'ajout de l'extraction automatique. Opération ponctuelle, réexécutable sans effet de bord.
        </p>
        <button
          onClick={handleBackfill}
          disabled={backfilling}
          className="h-9 px-4 bg-accent hover:bg-accent-dark text-white rounded-[8px] text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {backfilling ? <Loader2 size={15} className="animate-spin" /> : <HardDriveUpload size={15} />}
          {backfilling ? "Backfill en cours…" : "Lancer le backfill"}
        </button>
        {backfillMsg && <p className="text-xs text-secondary font-medium mt-3">{backfillMsg}</p>}
        {backfillError && <p className="text-xs text-error font-medium mt-3">{backfillError}</p>}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant mb-6 shrink-0">
        <button
          onClick={() => setActiveTab("architecture")}
          className={`px-4 py-2.5 font-sans text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "architecture" ? "border-secondary text-secondary" : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <BookOpen size={14} />
          Architecture Pro SaaS
        </button>
        <button
          onClick={() => setActiveTab("dbcontext")}
          className={`px-4 py-2.5 font-sans text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "dbcontext" ? "border-secondary text-secondary" : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <Database size={14} />
          EF Core & PostgreSQL
        </button>
        <button
          onClick={() => setActiveTab("controller")}
          className={`px-4 py-2.5 font-sans text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "controller" ? "border-secondary text-secondary" : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <Code size={14} />
          ASP.NET Core REST API
        </button>
        <button
          onClick={() => setActiveTab("docker")}
          className={`px-4 py-2.5 font-sans text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "docker" ? "border-secondary text-secondary" : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <Cpu size={14} />
          Docker Dev Setup
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "architecture" && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm space-y-6 text-left">
          <div className="flex items-center gap-3 border-b border-outline-variant pb-4">
            <Layers className="text-secondary" size={20} />
            <h3 className="font-bold text-on-surface font-sans">Patrons d'Architecture du Nexus Talent System</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed">
            <div className="space-y-4">
              <h4 className="text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider">Clean Architecture</h4>
              <p className="text-xs text-on-surface-variant font-sans">
                La solution s'appuie sur la **Clean Architecture** (ou Onion Architecture). La logique métier pure réside au centre dans le projet **Domain**, entouré par le projet **Application** décrivant les cas d'utilisation (Use Cases). L'infrastructure d'accès aux données (PostgreSQL, OpenAI, JWT) est déportée en périphérie dans la couche d'**Infrastructure**, garantissant l'indépendance technologique et facilitant les tests unitaires.
              </p>

              <h4 className="text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider pt-2">Sécurité Multi-Tenant</h4>
              <p className="text-xs text-on-surface-variant font-sans">
                Pour assurer la totale étanchéité des données d'un client à l'autre, nous implémentons un **Global Query Filter** au niveau d'Entity Framework Core. Durant l'authentification d'une requête REST (via JWT token), le claim de l'identifiant entreprise est chargé dans un service scopé d'injection de dépendances, automatiquement greffé sur les requêtes vers PostgreSQL.
              </p>
            </div>

            <div className="bg-background border border-outline-variant rounded-xl p-5 space-y-3 font-sans">
              <h4 className="text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider">Avantages de la Stack .NET Core</h4>
              
              <div className="flex items-start gap-2 text-xs text-on-surface-variant">
                <Check className="text-secondary mt-0.5 shrink-0" size={14} />
                <span>**CQRS (MediatR)** : Séparation claire des opérations de lecture (Queries) et d'écriture (Commands).</span>
              </div>

              <div className="flex items-start gap-2 text-xs text-on-surface-variant">
                <Check className="text-secondary mt-0.5 shrink-0" size={14} />
                <span>**Auto-Migrations EF Core** : Génération automatique des tables, des clés composées et des index de performance PostgreSQL.</span>
              </div>

              <div className="flex items-start gap-2 text-xs text-on-surface-variant">
                <Check className="text-secondary mt-0.5 shrink-0" size={14} />
                <span>**Validation Automatisée** : Intégration de FluentValidation au pipeline d'entrée pour filtrer les DTOs corrompus.</span>
              </div>

              <div className="flex items-start gap-2 text-xs text-on-surface-variant">
                <Check className="text-secondary mt-0.5 shrink-0" size={14} />
                <span>**Authentification JWT sécurisée** : Refresh Tokens pour sessions prolongées et accès sécurisés aux pièces jointes.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "dbcontext" && (
        <div className="space-y-4 text-left">
          <div className="flex justify-between items-center bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm">
            <span className="text-xs font-mono text-on-surface-variant font-semibold">NexusTalentDbContext.cs (EF Core & PostgreSQL)</span>
            <button
              onClick={() => handleCopy(dbContextCode)}
              className="text-xs font-semibold text-secondary hover:text-on-secondary-container flex items-center gap-1 hover:underline"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-500" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copier le code C#
                </>
              )}
            </button>
          </div>

          <pre className="bg-slate-950 text-slate-300 p-5 rounded-xl text-xs font-mono leading-relaxed overflow-x-auto border border-slate-800 max-h-[500px]">
            {dbContextCode}
          </pre>
        </div>
      )}

      {activeTab === "controller" && (
        <div className="space-y-4 text-left">
          <div className="flex justify-between items-center bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm">
            <span className="text-xs font-mono text-on-surface-variant font-semibold">CandidateController.cs (C# REST Controllers)</span>
            <button
              onClick={() => handleCopy(controllerCode)}
              className="text-xs font-semibold text-secondary hover:text-on-secondary-container flex items-center gap-1 hover:underline"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-500" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copier le code C#
                </>
              )}
            </button>
          </div>

          <pre className="bg-slate-950 text-slate-300 p-5 rounded-xl text-xs font-mono leading-relaxed overflow-x-auto border border-slate-800 max-h-[500px]">
            {controllerCode}
          </pre>
        </div>
      )}

      {activeTab === "docker" && (
        <div className="space-y-4 text-left">
          <div className="flex justify-between items-center bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm">
            <span className="text-xs font-mono text-on-surface-variant font-semibold">docker-compose.yml (Déploiement Local / Production)</span>
            <button
              onClick={() => handleCopy(dockerCode)}
              className="text-xs font-semibold text-secondary hover:text-on-secondary-container flex items-center gap-1 hover:underline"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-500" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copier le yaml
                </>
              )}
            </button>
          </div>

          <pre className="bg-slate-950 text-slate-300 p-5 rounded-xl text-xs font-mono leading-relaxed overflow-x-auto border border-slate-800 max-h-[500px]">
            {dockerCode}
          </pre>
        </div>
      )}
    </div>
  );
}
