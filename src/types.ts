export enum UserRole {
  AdminPlateforme = "Admin plateforme",
  AdminEntreprise = "Admin entreprise",
  RH = "RH",
  Manager = "Manager",
  ConsultantRecrutement = "Consultant recrutement"
}

export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  domain: string;
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
  minExperienceYears: number;
  salaryRange?: string;
  deadline?: string; // date limite de candidature, ISO "YYYY-MM-DD" (optionnel)
  location: string;
  contractType: ContractType;
  status: "Active" | "Archived" | "Draft";
  priority?: string;
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
  timestamp: string;
}
