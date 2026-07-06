// ============================================================================
// Mapping Prisma → forme attendue par le front (src/types.ts)
// ----------------------------------------------------------------------------
// Le schéma Prisma stocke les enums par CLÉ anglaise (ex. "AdminEntreprise",
// "HRInterview"), alors que le front attend les LIBELLÉS de src/types.ts
// (ex. "Admin entreprise", "Entretien RH").
//
// Astuce sans table à maintenir : la CLÉ d'enum Prisma est identique à la CLÉ
// d'enum TypeScript, et la VALEUR de l'enum TS est justement le libellé
// d'affichage. Donc `UserRole[cléPrisma]` renvoie directement le bon libellé.
// ============================================================================
import { UserRole, PipelineStage, ContractType } from "../types.js";
import { Prisma } from "@prisma/client";
import type { Company as PrismaCompany, User as PrismaUser, Email as PrismaEmail, AuditLog as PrismaAuditLog } from "@prisma/client";
import type { CandidateAnalysis, CandidateRecommendation, CandidateScores } from "../types.js";

/** Clé d'enum Prisma (UserRole) → libellé FR du front. Fallback = valeur brute. */
export const mapUserRole = (role: string): UserRole =>
  (UserRole as Record<string, UserRole>)[role] ?? (role as UserRole);

/**
 * Sens inverse : libellé FR (ex. "Admin entreprise") → CLÉ d'enum Prisma
 * (ex. "AdminEntreprise"). Accepte aussi directement une clé. undefined sinon.
 * Utile pour écrire un rôle venant du store mémoire (libellé) vers Prisma.
 */
export const toPrismaUserRole = (input: string): string | undefined => {
  if (Object.keys(UserRole).includes(input)) return input; // déjà une clé
  const entry = Object.entries(UserRole).find(([, label]) => label === input);
  return entry?.[0];
};

/** Clé d'enum Prisma (PipelineStage) → libellé FR du front. Fallback = valeur brute. */
export const mapPipelineStage = (stage: string): PipelineStage =>
  (PipelineStage as Record<string, PipelineStage>)[stage] ?? (stage as PipelineStage);

/** Ligne Company Prisma → objet Company du front (createdAt en ISO string). */
export const mapCompany = (c: PrismaCompany) => ({
  id: c.id,
  name: c.name,
  domain: c.domain,
  logoUrl: c.logoUrl ?? undefined,
  createdAt: c.createdAt.toISOString(),
});

/** Ligne User Prisma → objet User du front, SANS passwordHash, rôle mappé. */
export const mapUser = (u: PrismaUser) => ({
  id: u.id,
  companyId: u.companyId,
  name: u.name,
  email: u.email,
  role: mapUserRole(u.role),
  avatarUrl: u.avatarUrl ?? undefined,
});

// ----------------------------------------------------------------------------
// JOBS
// ----------------------------------------------------------------------------

/**
 * Clé d'enum Prisma (ContractType) → libellé du front. Ici clé == valeur
 * (CDI, CDD, Freelance, Alternance, Stage), donc mapping ~identité, mais on
 * passe par l'enum TS pour rester robuste si les libellés divergeaient un jour.
 */
export const mapContractType = (c: string): ContractType =>
  (ContractType as Record<string, ContractType>)[c] ?? (c as ContractType);

/** JobStatus Prisma (Active|Archived|Draft) — identique au front, simple cast. */
export type JobStatusLabel = "Active" | "Archived" | "Draft";
export const mapJobStatus = (s: string): JobStatusLabel => s as JobStatusLabel;

/**
 * Include réutilisable pour recharger un Job avec ses compétences.
 * Ordre : poids décroissant (les plus importantes d'abord, nulls en dernier),
 * puis nom alphabétique → sortie déterministe pour skillsRequired.
 */
export const jobInclude = {
  skills: {
    orderBy: [
      { weight: { sort: "desc", nulls: "last" } },
      { skill: { name: "asc" } },
    ],
    include: { skill: true },
  },
} satisfies Prisma.JobInclude;

export type JobWithSkills = Prisma.JobGetPayload<{ include: typeof jobInclude }>;

/** Ligne Job Prisma (+ JobSkill→Skill) → objet Job du front, skillsRequired reconstruit. */
export const mapJob = (j: JobWithSkills) => ({
  id: j.id,
  companyId: j.companyId,
  title: j.title,
  description: j.description,
  missions: j.missions,
  skillsRequired: j.skills.map((js) => js.skill.name),
  educationRequired: j.educationRequired,
  languagesRequired: j.languagesRequired,
  minExperienceYears: j.minExperienceYears,
  salaryRange: j.salaryRange ?? undefined,
  deadline: j.deadline ? j.deadline.toISOString().slice(0, 10) : undefined,
  location: j.location,
  contractType: mapContractType(j.contractType),
  status: mapJobStatus(j.status),
  priority: j.priority ?? "Normal",
  createdAt: j.createdAt.toISOString(),
  updatedAt: j.updatedAt.toISOString(),
});

// ----------------------------------------------------------------------------
// CANDIDATES
// ----------------------------------------------------------------------------

/**
 * Résout un stage entrant (front ENVOIE le libellé FR, ex. "Entretien RH")
 * vers la CLÉ d'enum Prisma (ex. "HRInterview"). Accepte aussi directement une
 * clé Prisma. Renvoie undefined si non reconnu (→ 400 côté route).
 */
export const toPrismaPipelineStage = (input: string): string | undefined => {
  if (Object.keys(PipelineStage).includes(input)) return input; // déjà une clé Prisma
  const entry = Object.entries(PipelineStage).find(([, label]) => label === input);
  return entry?.[0]; // libellé FR → clé
};

/** Table CandidateScore Prisma → objet CandidateScores du front (6 champs). */
export const mapScore = (s: {
  skillsScore: number; experienceScore: number; educationScore: number;
  softSkillsScore: number; languagesScore: number; globalScore: number;
}): CandidateScores => ({
  skillsScore: s.skillsScore,
  experienceScore: s.experienceScore,
  educationScore: s.educationScore,
  softSkillsScore: s.softSkillsScore,
  languagesScore: s.languagesScore,
  globalScore: s.globalScore,
});

/** Include standard : la table 1-1 CandidateScore est toujours ramenée. */
export const candidateInclude = { score: true } satisfies Prisma.CandidateInclude;
export type CandidateWithScore = Prisma.CandidateGetPayload<{ include: typeof candidateInclude }>;

/**
 * Ligne Candidate Prisma (+ score 1-1) → objet Candidate du front.
 * analysis / recommendation sont stockés en Json → renvoyés tels quels.
 * stage : clé Prisma → libellé FR. score null → scores undefined.
 */
export const mapCandidate = (c: CandidateWithScore) => ({
  id: c.id,
  companyId: c.companyId,
  jobId: c.jobId ?? "",
  name: c.name,
  email: c.email,
  phone: c.phone,
  location: c.location,
  linkedinUrl: c.linkedinUrl ?? undefined,
  avatarUrl: c.avatarUrl ?? undefined,
  stage: mapPipelineStage(c.stage),
  cvText: c.cvText ?? undefined,
  letterText: c.letterText ?? undefined,
  salaryExpectation: c.salaryExpectation ?? undefined,
  source: c.source ?? undefined,
  appliedAt: c.appliedAt.toISOString(),
  analysis: (c.analysis ?? undefined) as unknown as CandidateAnalysis | undefined,
  scores: c.score ? mapScore(c.score) : undefined,
  recommendation: (c.recommendation ?? undefined) as unknown as CandidateRecommendation | undefined,
});

// ----------------------------------------------------------------------------
// EMAILS
// ----------------------------------------------------------------------------

/** EmailStatus Prisma (Pending|Imported|Ignored) — identique au front, simple cast. */
export type EmailStatusLabel = "Pending" | "Imported" | "Ignored";
export const mapEmailStatus = (s: string): EmailStatusLabel => s as EmailStatusLabel;

/** Ligne Email Prisma → objet EmailItem du front (date en ISO string). */
export const mapEmail = (e: PrismaEmail) => ({
  id: e.id,
  companyId: e.companyId,
  from: e.from,
  subject: e.subject,
  body: e.body,
  date: e.date.toISOString(),
  attachmentName: e.attachmentName ?? undefined,
  attachmentContent: e.attachmentContent ?? undefined,
  status: mapEmailStatus(e.status),
});

// ----------------------------------------------------------------------------
// AUDIT LOGS
// ----------------------------------------------------------------------------

/** Ligne AuditLog Prisma → objet AuditLog du front (userRole→FR, timestamp ISO). */
export const mapAuditLog = (a: PrismaAuditLog) => ({
  id: a.id,
  companyId: a.companyId,
  userId: a.userId ?? "",
  userName: a.userName,
  userRole: mapUserRole(a.userRole),
  action: a.action,
  details: a.details,
  timestamp: a.timestamp.toISOString(),
});
