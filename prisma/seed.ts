import { PrismaClient, UserRole, ContractType, JobStatus, PipelineStage, SkillCategory, EmailStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Mot de passe démo commun (identique au server.ts d'origine).
const DEMO_PASSWORD = "password123";

// ---------------------------------------------------------------------------
// RÉFÉRENTIEL DE COMPÉTENCES
// Catégorie déduite. Les compétences des candidats arrivent déjà catégorisées
// (analysis.skills.{languages|frameworks|databases|tools|cloud|softSkills}) ;
// pour les skillsRequired des jobs (liste à plat) on s'appuie sur ce dictionnaire.
// Les LANGUES PARLÉES (Anglais (Courant)…) sont volontairement EXCLUES du
// référentiel Skill : elles vivent dans Job.languagesRequired / analysis.languages.
// ---------------------------------------------------------------------------

// Normalisation des variantes de libellé → nom canonique (évite les doublons
// qui casseraient le matching, ex. "Méthode Agile" vs "Agile").
const SKILL_ALIASES: Record<string, string> = {
  "Méthode Agile": "Agile",
  "Vite.js": "Vite",
};

// Dictionnaire nom canonique → catégorie.
const SKILL_CATEGORY: Record<string, SkillCategory> = {
  // Languages
  TypeScript: SkillCategory.Language,
  JavaScript: SkillCategory.Language,
  Python: SkillCategory.Language,
  SQL: SkillCategory.Language,
  "HTML/CSS": SkillCategory.Language,
  Bash: SkillCategory.Language,
  // Frameworks
  React: SkillCategory.Framework,
  Express: SkillCategory.Framework,
  NestJS: SkillCategory.Framework,
  Redux: SkillCategory.Framework,
  PyTorch: SkillCategory.Framework,
  Transformers: SkillCategory.Framework,
  FastAPI: SkillCategory.Framework,
  "Scikit-Learn": SkillCategory.Framework,
  "TanStack Query": SkillCategory.Framework,
  Zod: SkillCategory.Framework,
  Recharts: SkillCategory.Framework,
  // Databases
  PostgreSQL: SkillCategory.Database,
  // Cloud
  AWS: SkillCategory.Cloud,
  Vercel: SkillCategory.Cloud,
  // Tools
  Vite: SkillCategory.Tool,
  Git: SkillCategory.Tool,
  Docker: SkillCategory.Tool,
  Kubernetes: SkillCategory.Tool,
  Terraform: SkillCategory.Tool,
  "GitHub Actions": SkillCategory.Tool,
  Prometheus: SkillCategory.Tool,
  Grafana: SkillCategory.Tool,
  Ansible: SkillCategory.Tool,
  Jenkins: SkillCategory.Tool,
  Linux: SkillCategory.Tool,
  Jira: SkillCategory.Tool,
  Figma: SkillCategory.Tool,
  "Tailwind CSS": SkillCategory.Tool,
  NLP: SkillCategory.Tool,
  // SoftSkills / méthodo
  Mentoring: SkillCategory.SoftSkill,
  Agile: SkillCategory.SoftSkill,
  Scrum: SkillCategory.SoftSkill,
  "Product Roadmap": SkillCategory.SoftSkill,
  SaaS: SkillCategory.SoftSkill,
  "Esprit d'équipe": SkillCategory.SoftSkill,
  Autonomie: SkillCategory.SoftSkill,
  "Résolution de problèmes": SkillCategory.SoftSkill,
  Rigueur: SkillCategory.SoftSkill,
  "Esprit analytique": SkillCategory.SoftSkill,
};

const canon = (raw: string): string => SKILL_ALIASES[raw] ?? raw;

// Détecte une langue parlée ("Anglais (Courant)", "Français (Maternelle)"…) → exclue de Skill.
const isSpokenLanguage = (s: string): boolean =>
  /\((Maternelle|Courant|Technique|Professionnel|Bilingue|Natif|C1|C2|B1|B2)\)/i.test(s) ||
  /^(Français|Anglais|Espagnol|Allemand|Italien)\b/.test(s);

function categoryFor(name: string): SkillCategory {
  const cat = SKILL_CATEGORY[name];
  if (!cat) {
    console.warn(`⚠️  Compétence sans catégorie explicite: "${name}" → Tool par défaut`);
    return SkillCategory.Tool;
  }
  return cat;
}

// ---------------------------------------------------------------------------
// DONNÉES SEED (fidèles au server.ts d'origine)
// ---------------------------------------------------------------------------

const companies = [
  { id: "tenant-techcorp",   name: "TechCorp Solutions", domain: "techcorp.io",  logoUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=80&h=80&fit=crop&q=80", createdAt: new Date("2025-01-10T08:00:00Z") },
  { id: "tenant-healthsoft", name: "HealthSoft Innov",   domain: "healthsoft.com", logoUrl: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=80&h=80&fit=crop&q=80", createdAt: new Date("2025-02-15T09:30:00Z") },
];

const users = [
  { id: "user-samuel-demo", companyId: "tenant-techcorp", name: "Samuel",         email: "samuel@test.io",          role: UserRole.RH,              avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&q=80" },
  { id: "user-elena", companyId: "tenant-healthsoft", name: "Dr. Elena Rostova", email: "elena.r@healthsoft.com",  role: UserRole.AdminEntreprise, avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&q=80" },
];

// Jobs : skillsRequired sera transformé en JobSkill via le référentiel.
const jobs = [
  {
    id: "job-react-senior", companyId: "tenant-techcorp",
    title: "Développeur Senior React / TypeScript",
    description: "Nous recherchons un développeur React chevronné pour piloter notre nouvelle plateforme d'analyse SaaS. Vous collaborerez avec l'équipe produit pour concevoir des dashboards interactifs et hautement performants.",
    missions: ["Concevoir et développer des composants de dashboard d'analyse avec React, Vite et Tailwind CSS.", "Optimiser les performances de rendu d'interfaces complexes manipulant d'importants volumes de données.", "Mettre en place des tests unitaires et d'intégration robustes.", "Mentorer les développeurs juniors de l'équipe."],
    skillsRequired: ["React", "TypeScript", "Tailwind CSS", "Vite", "Zod", "TanStack Query", "Recharts"],
    educationRequired: "Bac +5 en Informatique ou expérience équivalente",
    languagesRequired: ["Français (Courant)", "Anglais (Technique)"],
    minExperienceYears: 5, salaryRange: "3 000 000 Ariary", location: "Paris (Hybride)",
    contractType: ContractType.CDI, status: JobStatus.Active, createdAt: new Date("2026-06-01T10:00:00Z"),
  },
  {
    id: "job-devops-engineer", companyId: "tenant-techcorp",
    title: "Ingénieur Cloud DevOps (AWS / Kubernetes)",
    description: "Rejoignez notre équipe d'infrastructure pour accélérer le déploiement de nos microservices et renforcer la sécurité de nos clusters Kubernetes hébergés sur AWS.",
    missions: ["Administrer les infrastructures cloud de production sur AWS.", "Maintenir et améliorer les pipelines CI/CD (GitHub Actions).", "Gérer l'orchestration des conteneurs avec Kubernetes et Terraform.", "Assurer la supervision, le logging et la haute disponibilité."],
    skillsRequired: ["Docker", "Kubernetes", "AWS", "Terraform", "GitHub Actions", "Prometheus", "Linux"],
    educationRequired: "Diplôme d'ingénieur ou équivalent",
    languagesRequired: ["Français (Courant)", "Anglais (Courant)"],
    minExperienceYears: 3, salaryRange: "3 000 000 Ariary", location: "Lyon (Télétravail)",
    contractType: ContractType.CDI, status: JobStatus.Active, createdAt: new Date("2026-06-15T09:00:00Z"),
  },
  {
    id: "job-data-scientist", companyId: "tenant-techcorp",
    title: "Data Scientist - Intelligence Artificielle",
    description: "Intégrez notre pôle R&D IA pour concevoir des modèles de NLP appliqués à l'analyse sémantique et à l'extraction automatique de données.",
    missions: ["Concevoir des pipelines de traitement automatique des langues (NLP).", "Entraîner et fine-tuner des modèles de Deep Learning.", "Déployer des APIs d'inférence scalables (Python, FastAPIs).", "Collaborer avec les équipes logicielles pour intégrer les fonctionnalités IA."],
    skillsRequired: ["Python", "PyTorch", "NLP", "Transformers", "SQL", "FastAPI", "Scikit-Learn"],
    educationRequired: "Master ou Doctorat en Data Science / IA",
    languagesRequired: ["Anglais (Courant)"],
    minExperienceYears: 2, salaryRange: "3 000 000 Ariary", location: "Paris (Hybride)",
    contractType: ContractType.CDI, status: JobStatus.Active, createdAt: new Date("2026-06-20T14:00:00Z"),
  },
  {
    id: "job-product-manager", companyId: "tenant-healthsoft",
    title: "Product Manager - HealthTech Portal",
    description: "Pilotez la roadmap de notre portail de télé-médecine destiné aux centres hospitaliers.",
    missions: ["Recueillir les besoins des cliniciens et des directions hospitalières.", "Rédiger les spécifications fonctionnelles détaillées (User Stories).", "Prioriser le backlog produit en méthode Agile.", "Suivre l'avancement avec les équipes de développement."],
    skillsRequired: ["Agile", "Scrum", "Product Roadmap", "Jira", "Figma", "SaaS"],
    educationRequired: "Bac +5 école de commerce ou ingénieur",
    languagesRequired: ["Français (Courant)", "Anglais (Professionnel)"],
    minExperienceYears: 4, salaryRange: "3 000 000 Ariary", location: "Bordeaux (Hybride)",
    contractType: ContractType.CDI, status: JobStatus.Active, createdAt: new Date("2026-06-18T11:00:00Z"),
  },
];

// Candidats (fidèles au server.ts). analysis/recommendation → Json.
const candidates = [
  {
    id: "cand-jean-dupont", companyId: "tenant-techcorp", jobId: "job-react-senior",
    name: "Jean Dupont", email: "jean.dupont@gmail.com", phone: "06 12 34 56 78",
    location: "Paris, France", linkedinUrl: "linkedin.com/in/jeandupont-dev",
    stage: PipelineStage.HRInterview, appliedAt: new Date("2026-06-10T14:30:00Z"),
    // compétences dérivées de analysis.skills (voir extraction plus bas)
    skills: ["TypeScript", "JavaScript", "SQL", "HTML/CSS", "React", "Express", "NestJS", "Redux", "PostgreSQL", "Vite", "Git", "Docker", "TanStack Query", "AWS", "Vercel", "Mentoring", "Méthode Agile", "Esprit d'équipe", "Autonomie"],
    scores: { skillsScore: 95, experienceScore: 90, educationScore: 90, softSkillsScore: 85, languagesScore: 90, globalScore: 91 },
    analysis: { personalInfo: { name: "Jean Dupont", email: "jean.dupont@gmail.com", phone: "06 12 34 56 78", location: "Paris, France", linkedin: "linkedin.com/in/jeandupont-dev" }, skills: { languages: ["TypeScript", "JavaScript", "SQL", "HTML/CSS"], frameworks: ["React", "Express", "NestJS", "Redux"], databases: ["PostgreSQL"], tools: ["Vite", "Git", "Docker", "TanStack Query"], cloud: ["AWS", "Vercel"], softSkills: ["Mentoring", "Méthode Agile", "Esprit d'équipe", "Autonomie"] }, educations: [{ degree: "Master en Ingénierie Logicielle", school: "Université Sorbonne", year: "2019" }], experiences: [{ years: 4, company: "ScaleTech", role: "Senior Frontend Engineer", description: "Refonte d'une console SaaS interactive en React." }, { years: 3, company: "WebFlow Studio", role: "Fullstack Developer", description: "Création d'APIs et interfaces React." }], languages: ["Français (Maternelle)", "Anglais (Courant)"], yearsOfExperience: 7 },
    recommendation: { summary: "Jean Dupont est un profil de développeur frontend senior d'un niveau technique excellent. Son expérience de 7 ans en environnement SaaS correspond parfaitement au profil recherché.", strengths: ["Maîtrise totale de React, TypeScript et TanStack Query", "Expérience concrète de l'optimisation des performances graphiques", "Autonomie et autonomisation des juniors"], weaknesses: ["Peu d'expérience directe en pure gestion d'infrastructure"], attentionPoints: ["Valider son niveau d'anglais technique lors d'un échange informel"], compatibilityExplanation: "Le candidat remplit tous les critères requis. Ses années d'expérience dépassent le minimum et ses compétences en cache/performance SaaS sont précieuses.", suggestedDecision: "Entretien" },
  },
  {
    id: "cand-alice-smith", companyId: "tenant-techcorp", jobId: "job-react-senior",
    name: "Alice Smith", email: "alice.smith@outlook.com", phone: "07 89 45 12 23",
    location: "Nice, France", linkedinUrl: undefined,
    stage: PipelineStage.Received, appliedAt: new Date("2026-06-25T11:15:00Z"),
    skills: [], // non analysée → pas encore de compétences structurées
    scores: undefined, analysis: undefined, recommendation: undefined,
  },
  {
    id: "cand-lucas-martin", companyId: "tenant-techcorp", jobId: "job-devops-engineer",
    name: "Lucas Martin", email: "lucas.martin@proton.me", phone: "06 55 44 33 22",
    location: "Lyon, France", linkedinUrl: undefined,
    stage: PipelineStage.Preselected, appliedAt: new Date("2026-06-12T09:00:00Z"),
    skills: ["Python", "Bash", "Docker", "Kubernetes", "Ansible", "Terraform", "Jenkins", "Prometheus", "Grafana", "AWS", "Résolution de problèmes", "Rigueur", "Esprit analytique"],
    scores: { skillsScore: 88, experienceScore: 80, educationScore: 82, softSkillsScore: 85, languagesScore: 80, globalScore: 84 },
    analysis: { personalInfo: { name: "Lucas Martin", email: "lucas.martin@proton.me", phone: "06 55 44 33 22", location: "Lyon, France" }, skills: { languages: ["Python", "Bash"], frameworks: [], databases: [], tools: ["Docker", "Kubernetes", "Ansible", "Terraform", "Jenkins", "Prometheus", "Grafana"], cloud: ["AWS"], softSkills: ["Résolution de problèmes", "Rigueur", "Esprit analytique"] }, educations: [], experiences: [], languages: ["Français", "Anglais (Technique)"], yearsOfExperience: 5 },
    recommendation: { summary: "Profil DevOps solide, bonne maîtrise de l'écosystème Kubernetes et de l'automatisation.", strengths: ["Automatisation (Terraform, Ansible)", "Supervision (Prometheus, Grafana)"], weaknesses: ["Peu d'expérience frontend"], attentionPoints: ["Confirmer l'expérience sur AWS en production"], compatibilityExplanation: "Correspond au poste DevOps ; compétences infra alignées avec les besoins.", suggestedDecision: "Entretien" },
  },
];

// Poids matching (JobSkill.weight) par job — total 100, réparti sur les compétences requises.
const JOB_SKILL_WEIGHTS: Record<string, Record<string, number>> = {
  "job-react-senior":    { React: 30, TypeScript: 25, "TanStack Query": 15, "Tailwind CSS": 10, Vite: 8, Zod: 7, Recharts: 5 },
  "job-devops-engineer": { Kubernetes: 25, Docker: 20, AWS: 20, Terraform: 15, "GitHub Actions": 10, Prometheus: 5, Linux: 5 },
  "job-data-scientist":  { Python: 30, PyTorch: 20, NLP: 15, Transformers: 15, SQL: 10, FastAPI: 5, "Scikit-Learn": 5 },
  "job-product-manager": { Agile: 25, Scrum: 20, "Product Roadmap": 20, Jira: 15, Figma: 10, SaaS: 10 },
};

// ---------------------------------------------------------------------------
// SEED
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱 Seed Nexus Talent System… (idempotent : upsert, n'écrase jamais l'existant)");

  // Aucune purge : le seed n'AJOUTE que ce qui manque. Partout `update: {}` →
  // une ligne déjà présente n'est jamais modifiée.

  // 1. Companies — upsert sur id.
  for (const c of companies) {
    await prisma.company.upsert({ where: { id: c.id }, update: {}, create: c });
  }

  // 2. Users (bcrypt) — upsert sur id.
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const u of users) {
    await prisma.user.upsert({ where: { id: u.id }, update: {}, create: { ...u, passwordHash } });
  }

  // 2b. Comptes admin dédiés pour TechCorp Solutions — upsert sur l'email (create-only,
  // mot de passe "admin123"). update vide : un compte déjà présent n'est jamais modifié.
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const adminUsers = [
    { name: "Samuel Admin",   email: "samuel@techcorp.io", role: UserRole.AdminPlateforme },
    { name: "Admin TechCorp", email: "admin@techcorp.io",  role: UserRole.AdminEntreprise },
  ];
  for (const a of adminUsers) {
    await prisma.user.upsert({
      where: { email: a.email },
      update: {},
      create: { name: a.name, email: a.email, role: a.role, companyId: "tenant-techcorp", passwordHash: adminPasswordHash },
    });
  }

  // 3. Référentiel Skill : collecte jobs.skillsRequired + candidates skills, normalise, exclut langues.
  const skillSet = new Set<string>();
  for (const j of jobs) for (const s of j.skillsRequired) { if (!isSpokenLanguage(s)) skillSet.add(canon(s)); }
  for (const c of candidates) for (const s of c.skills ?? []) { if (!isSpokenLanguage(s)) skillSet.add(canon(s)); }

  const skillIdByName = new Map<string, string>();
  for (const name of [...skillSet].sort()) {
    // upsert sur name (@unique) → récupère l'id existant ou nouvellement créé.
    const skill = await prisma.skill.upsert({ where: { name }, update: {}, create: { name, category: categoryFor(name) } });
    skillIdByName.set(name, skill.id);
  }
  console.log(`   ${skillIdByName.size} compétences dans le référentiel`);

  // 4. Jobs + JobSkill (avec poids)
  for (const j of jobs) {
    const { skillsRequired, ...jobData } = j;
    await prisma.job.upsert({ where: { id: j.id }, update: {}, create: jobData });
    const weights = JOB_SKILL_WEIGHTS[j.id] ?? {};
    for (const raw of skillsRequired) {
      if (isSpokenLanguage(raw)) continue;
      const name = canon(raw);
      const skillId = skillIdByName.get(name);
      if (!skillId) continue;
      await prisma.jobSkill.upsert({
        where: { jobId_skillId: { jobId: j.id, skillId } },
        update: {},
        create: { jobId: j.id, skillId, required: true, weight: weights[name] ?? null },
      });
    }
  }

  // 5. Candidats + CandidateScore + CandidateSkill
  for (const c of candidates) {
    const { skills, scores, analysis, recommendation, ...candData } = c;
    await prisma.candidate.upsert({
      where: { id: c.id },
      update: {},
      create: {
        ...candData,
        analysis: analysis ?? undefined,
        recommendation: recommendation ?? undefined,
      },
    });
    if (scores) {
      await prisma.candidateScore.upsert({
        where: { candidateId: c.id },
        update: {},
        create: { candidateId: c.id, ...scores },
      });
    }
    const seen = new Set<string>();
    for (const raw of skills ?? []) {
      if (isSpokenLanguage(raw)) continue;
      const name = canon(raw);
      const skillId = skillIdByName.get(name);
      if (!skillId || seen.has(skillId)) continue;
      seen.add(skillId);
      await prisma.candidateSkill.upsert({
        where: { candidateId_skillId: { candidateId: c.id, skillId } },
        update: {},
        create: { candidateId: c.id, skillId },
      });
    }
  }

  // 6. Emails (inbox de démo, rattachés à TechCorp) — fidèles au tableau mémoire du server.ts.
  const emails = [
    {
      id: "mail-1",
      companyId: "tenant-techcorp",
      from: "thomas.bernard.dev@gmail.com",
      subject: "Candidature - Développeur Senior React / TypeScript - Thomas Bernard",
      body: `Bonjour Sarah,
Je suis tombé sur votre annonce pour le poste de Développeur Senior React. Fort de mes 6 années d'expérience en développement frontend et d'une passion inébranlable pour TypeScript, je pense pouvoir apporter une réelle valeur ajoutée à vos dashboards analytiques.

Veuillez trouver ci-joint mon CV récapitulant mes expériences clés chez Veepee et Deezer.
Merci pour votre temps.

Cordialement,
Thomas Bernard`,
      date: new Date("2026-06-29T06:12:00Z"),
      attachmentName: "CV_Thomas_Bernard.pdf",
      attachmentContent: `Thomas Bernard
Développeur React Senior | 6 ans d'expérience.
Spécialiste de la création d'architectures frontend modulaires et ultra-performantes.

COMPÉTENCES :
- React, TypeScript, Redux, Next.js, GraphQL, REST APIs.
- Jest, Cypress, Vite, Webpack, Tailwind CSS.
- AWS, CI/CD GitHub Actions.

PARCOURS :
1. Tech Lead Frontend - Veepee (Paris) | Février 2023 - Présent
- Leadership d'une feature team de 4 développeurs sur le tunnel d'achat.
- Migration de l'application legacy vers React et TypeScript (Vite).
- Gain de 30% sur le chargement initial.

2. Développeur Frontend - Deezer | Mars 2020 - Janvier 2023
- Développement d'interfaces interactives pour les lecteurs web de Deezer.
- Travail approfondi en CSS, Tailwind et animations de fluidité.

FORMATION :
Epitech - Titre d'Expert en Technologies de l'Information (2020)`,
      status: EmailStatus.Pending,
    },
    {
      id: "mail-2",
      companyId: "tenant-techcorp",
      from: "m.dupire.devops@outlook.fr",
      subject: "Candidature Spontanée : DevOps / Cloud Architect",
      body: `Bonjour l'équipe Recrutement,
Je m'appelle Matthieu Dupire, ingénieur Cloud certifié AWS avec 8 ans d'expérience. J'aide les entreprises SaaS à stabiliser, automatiser et orchestrer leurs déploiements.

J'aimerais beaucoup en savoir plus sur vos besoins DevOps et d'infrastructures.
Je me tiens à votre entière disposition.

Cordialement,
Matthieu Dupire`,
      date: new Date("2026-06-28T16:45:00Z"),
      attachmentName: "CV_Matthieu_DevOps.pdf",
      attachmentContent: `Matthieu Dupire
Cloud Architect & Senior DevOps Engineer
8 ans d'expérience en environnements Cloud Scalables.

COMPÉTENCES :
- Clouds : AWS, Google Cloud Platform (GCP)
- Orchestration : Kubernetes, Helm, Docker
- Infrastructure as Code : Terraform, CloudFormation
- CI/CD : GitLab CI, Jenkins, GitHub Actions
- Monitoring : Prometheus, Grafana, Datadog

EXPÉRIENCES :
- Lead Cloud Architect - PayFit | 2021 - Présent
  Gestion d'une infrastructure AWS hébergeant 40+ microservices sur EKS. Coût de l'infra réduit de 25% grâce au scaling dynamique.
- DevOps Engineer - BlaBlaCar | 2018 - 2021
  Mise en œuvre des pipelines d'automatisation CI/CD globaux.

FORMATION :
Master Informatique option Réseaux & Cloud - Telecom Paris (2018)`,
      status: EmailStatus.Pending,
    },
  ];
  for (const e of emails) await prisma.email.upsert({ where: { id: e.id }, update: {}, create: e });

  // 7. Audit logs (démo) — 2 entrées TechCorp fidèles au tableau mémoire + 1 HealthSoft.
  const auditLogs = [
    {
      id: "log-1", companyId: "tenant-techcorp", userId: "user-samuel-demo",
      userName: "Samuel", userRole: UserRole.RH,
      action: "Création d'offre",
      details: "Création du poste 'Développeur Senior React / TypeScript' (CDI)",
      timestamp: new Date("2026-06-01T10:05:00Z"),
    },
    {
      id: "log-2", companyId: "tenant-techcorp", userId: "user-samuel-demo",
      userName: "Samuel", userRole: UserRole.RH,
      action: "Analyse IA",
      details: "Analyse automatique du CV de Jean Dupont via le moteur IA",
      timestamp: new Date("2026-06-10T14:40:00Z"),
    },
    {
      id: "log-3", companyId: "tenant-healthsoft", userId: "user-elena",
      userName: "Dr. Elena Rostova", userRole: UserRole.AdminEntreprise,
      action: "Connexion",
      details: "Dr. Elena Rostova s'est connecté(e).",
      timestamp: new Date("2026-06-20T08:00:00Z"),
    },
  ];
  for (const l of auditLogs) await prisma.auditLog.upsert({ where: { id: l.id }, update: {}, create: l });

  // ---------------------------------------------------------------------------
  // RÉCONCILIATION des bases DÉJÀ existantes (locale/prod).
  // Le reste du seed est purement additif (update: {}), donc il ne met jamais à
  // jour l'existant ; ces quelques opérations ciblées propagent les changements
  // voulus aux bases déjà déployées, à chaque `prisma db seed` (donc à chaque
  // build Render). Idempotent.
  // ---------------------------------------------------------------------------
  // 1. Retire les utilisateurs de démo sortis du référentiel (Sarah, Marc).
  //    AuditLog.userId est onDelete:SetNull → les logs sont conservés, détachés.
  const removedUsers = await prisma.user.deleteMany({ where: { id: { in: ["user-sarah", "user-marc"] } } });
  if (removedUsers.count) console.log(`   ${removedUsers.count} utilisateur(s) de démo retiré(s)`);
  // 2. Aligne le salaire des offres de démo sur leur valeur courante (Ariary).
  //    Ciblé par id → n'affecte PAS les offres créées par l'utilisateur.
  await prisma.job.updateMany({
    where: { id: { in: jobs.map((j) => j.id) } },
    data: { salaryRange: "3 000 000 Ariary" },
  });
  // 3. Backfill Niveau 1 — experienceYears depuis analysis.yearsOfExperience,
  //    pour les candidats déjà analysés (colonne encore NULL). Idempotent.
  const filledExp = await prisma.$executeRawUnsafe(`
    UPDATE "Candidate"
    SET "experienceYears" = (("analysis"->>'yearsOfExperience'))::int
    WHERE "experienceYears" IS NULL
      AND "analysis" IS NOT NULL
      AND ("analysis"->>'yearsOfExperience') ~ '^[0-9]+$'
  `);
  if (filledExp) console.log(`   experienceYears rétro-rempli pour ${filledExp} candidat(s)`);
  // 4. Backfill Niveau 2 — CandidateSkill depuis analysis.skills, pour les
  //    candidats analysés qui n'ont ENCORE aucun lien de compétence. Idempotent
  //    (les candidats du seed en ont déjà → non concernés).
  const SKILL_BUCKETS: Array<[string, SkillCategory]> = [
    ["languages", SkillCategory.Language],
    ["frameworks", SkillCategory.Framework],
    ["databases", SkillCategory.Database],
    ["tools", SkillCategory.Tool],
    ["cloud", SkillCategory.Cloud],
    ["softSkills", SkillCategory.SoftSkill],
    ["domain", SkillCategory.Domain],
    ["certifications", SkillCategory.Certification],
  ];
  const toBackfill = await prisma.candidate.findMany({
    where: { analysis: { not: null }, skills: { none: {} } },
    select: { id: true, analysis: true },
  });
  let skillLinks = 0;
  for (const c of toBackfill) {
    const skillsObj = c.analysis && typeof c.analysis === "object" ? (c.analysis as any).skills : null;
    if (!skillsObj || typeof skillsObj !== "object") continue;
    const seen = new Set<string>();
    for (const [key, category] of SKILL_BUCKETS) {
      const list = Array.isArray(skillsObj[key]) ? skillsObj[key] : [];
      for (const raw of list) {
        const name = String(raw).trim();
        if (!name) continue;
        const dedup = name.toLowerCase();
        if (seen.has(dedup)) continue;
        seen.add(dedup);
        const skill = await prisma.skill.upsert({ where: { name }, update: {}, create: { name, category } });
        await prisma.candidateSkill.create({ data: { candidateId: c.id, skillId: skill.id } });
        skillLinks++;
      }
    }
  }
  if (skillLinks) console.log(`   CandidateSkill : ${skillLinks} lien(s) rétro-remplis`);

  // 5. Grille "Rôles & permissions" (globale, éditable dans Paramètres). On sème
  //    UNIQUEMENT les cases absentes (create-only via skipDuplicates) → ne JAMAIS
  //    écraser les choix faits par un admin. Doit rester aligné sur
  //    DEFAULT_PERMISSIONS / PERMISSION_ROLES de server.ts.
  //    Colonnes : [Super admin, Admin, Manager, RH, Consultant].
  const PERM_ROLE_ORDER: UserRole[] = [
    UserRole.AdminPlateforme,
    UserRole.AdminEntreprise,
    UserRole.Manager,
    UserRole.RH,
    UserRole.ConsultantRecrutement,
  ];
  const PERM_DEFAULTS: Record<string, boolean[]> = {
    dashboard:    [true, true, true, true, true],
    jobs:         [true, true, true, true, true],
    candidates:   [true, true, true, true, true],
    pipeline:     [true, true, true, true, true],
    ai_search:    [true, true, true, true, true],
    manage_users: [true, true, true, false, false],
    settings:     [true, true, true, false, false],
    edit_company: [true, true, false, false, false],
    connections:  [true, true, false, false, false],
  };
  const permRows = Object.entries(PERM_DEFAULTS).flatMap(([action, allowedByRole]) =>
    PERM_ROLE_ORDER.map((role, i) => ({ action, role, allowed: allowedByRole[i] }))
  );
  const permSeeded = await prisma.rolePermission.createMany({ data: permRows, skipDuplicates: true });
  if (permSeeded.count) console.log(`   RolePermission : ${permSeeded.count} case(s) par défaut semée(s)`);

  const counts = {
    companies: await prisma.company.count(),
    users: await prisma.user.count(),
    jobs: await prisma.job.count(),
    candidates: await prisma.candidate.count(),
    skills: await prisma.skill.count(),
    candidateSkills: await prisma.candidateSkill.count(),
    jobSkills: await prisma.jobSkill.count(),
    emails: await prisma.email.count(),
    auditLogs: await prisma.auditLog.count(),
  };
  console.log("✅ Seed terminé :", counts);
  console.log(`   Connexion démo : samuel@test.io / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => { console.error("❌ Seed échoué :", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
