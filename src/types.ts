export enum UserRole {
  AdminPlateforme = "Admin plateforme",
  AdminEntreprise = "Admin entreprise",
  RH = "RH",
  Manager = "Manager",
  ConsultantRecrutement = "Consultant recrutement"
}

// Libellé FR d'un rôle (valeur de l'enum) → clé stable (nom d'enum = clé Prisma).
// Les colonnes de la matrice de permissions sont indexées par ces clés.
export const roleKeyOf = (role?: string): string | undefined => {
  if (!role) return undefined;
  if (role in UserRole) return role; // déjà une clé
  return (Object.keys(UserRole) as string[]).find(k => (UserRole as Record<string, string>)[k] === role);
};

// Grille "Rôles & permissions" (globale). Renvoyée par GET /api/permissions.
export interface PermissionMeta {
  key: string;
  label: string;
}
export interface PermissionsData {
  actions: PermissionMeta[];
  roles: PermissionMeta[];
  matrix: Record<string, Record<string, boolean>>; // matrix[action][roleKey] = bool
}

export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  domain: string;
  appName?: string;
  createdAt: string;
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  /** Present only in server-side records; never sent to the client. */
  passwordHash?: string;
}

export enum ContractType {
  CDI = "CDI",
  CDD = "CDD",
  Freelance = "Freelance",
  Alternance = "Alternance",
  Stage = "Stage"
}

export interface Job {
  id: string;
  companyId: string;
  title: string;
  description: string;
  missions: string[];
  skillsRequired: string[];
  educationRequired: string;
  languagesRequired: string[];
  softSkillsRequired: string[]; // savoir-être souhaités (soft skills)
  minExperienceYears: number;
  salaryRange?: string;
  deadline?: string; // date limite de candidature, ISO "YYYY-MM-DD" (optionnel)
  location: string;
  contractType: ContractType;
  status: "Active" | "Archived" | "Draft";
  priority?: string;
  domain?: "IT" | "Autre"; // pilote la grille de compétences de l'analyse IA
  createdAt: string;
  updatedAt?: string;
}

export enum PipelineStage {
  Received = "Reçu",
  Analyzed = "Analysé",
  Preselected = "Pré-sélectionné",
  HRInterview = "Entretien RH",
  TechTest = "Test technique",
  FinalInterview = "Entretien final",
  OfferSent = "Offre envoyée",
  Hired = "Embauché",
  Rejected = "Rejeté"
}

export interface CandidateExperience {
  years: number;
  company: string;
  role: string;
  description?: string;
}

export interface CandidateEducation {
  degree: string;
  school: string;
  year?: string;
}

export interface CandidateAnalysis {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
  };
  skills: {
    languages: string[];
    frameworks: string[];
    databases: string[];
    tools: string[];
    cloud: string[];
    softSkills: string[];
    domain?: string[];         // compétences métier (offres "Autre" : compta, RH, juridique…)
    certifications?: string[]; // certifications / habilitations (offres "Autre")
  };
  educations: CandidateEducation[];
  experiences: CandidateExperience[];
  languages: string[];
  yearsOfExperience: number;
}

export interface CandidateScores {
  skillsScore: number;       // out of 100
  experienceScore: number;   // out of 100
  educationScore: number;    // out of 100
  softSkillsScore: number;   // out of 100
  languagesScore: number;    // out of 100
  globalScore: number;       // out of 100
}

export interface CandidateRecommendation {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  attentionPoints: string[];
  compatibilityExplanation: string;
  suggestedDecision: "Entretien" | "Réserve" | "Rejet";
}

export interface Candidate {
  id: string;
  companyId: string;
  jobId: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl?: string;
  avatarUrl?: string;
  stage: PipelineStage;
  cvText?: string;
  letterText?: string;
  salaryExpectation?: string;
  source?: string;
  appliedAt: string;
  analysis?: CandidateAnalysis;
  scores?: CandidateScores;
  recommendation?: CandidateRecommendation;
}

export interface Interview {
  id: string;
  candidateId: string;
  jobId?: string;
  date: string;
  time: string;
  type: string;
  notes?: string;
  createdAt: string;
  candidate?: { name: string; jobTitle?: string };
}

export interface EmailItem {
  id: string;
  companyId: string;
  from: string;
  subject: string;
  body: string;
  date: string;
  attachmentName?: string;
  attachmentContent?: string;
  status: "Pending" | "Imported" | "Ignored";
}

export interface AuditLog {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  ip?: string | null;
  userAgent?: string | null;
  timestamp: string;
}
