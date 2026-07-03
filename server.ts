import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { Prisma, ContractType as PrismaContractType, JobStatus, SkillCategory, PipelineStage as PrismaPipelineStage, UserRole as PrismaUserRole } from "@prisma/client";
import { prisma } from "./src/lib/prisma.js";
import type { User as PrismaUser } from "@prisma/client";
import { mapCompany, mapUser, mapJob, jobInclude, mapCandidate, mapPipelineStage, candidateInclude, toPrismaPipelineStage, mapEmail, mapAuditLog, toPrismaUserRole } from "./src/lib/mappers.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// ==========================================
// AUTH CONFIG
// ==========================================
// In production these MUST come from real secrets management, never hardcoded.
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me";
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";
const REFRESH_COOKIE_NAME = "nexus_refresh_token";

// Initialize GoogleGenAI server-side with key
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Appel Gemini avec retry automatique sur 503/429 uniquement : 3 tentatives max,
// 2 s d'attente entre chaque. Toute autre erreur — ou l'échec de la 3e tentative —
// propage l'erreur originale. Réutilisé par /analyze et /ai-search.
const isRetryable = (err: any): boolean => {
  const status = err?.status ?? err?.code ?? err?.response?.status;
  if (status === 503 || status === 429) return true;
  return /\b(503|429)\b/.test(String(err?.message ?? ""));
};

const callGeminiWithRetry = async (params: Parameters<typeof ai.models.generateContent>[0]) => {
  const MAX_ATTEMPTS = 3;
  const RETRY_DELAY_MS = 2000;
  for (let attempt = 1; ; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err) {
      if (attempt >= MAX_ATTEMPTS || !isRetryable(err)) throw err;
      console.warn(`[gemini] Tentative ${attempt}/${MAX_ATTEMPTS} — retry dans ${RETRY_DELAY_MS}ms`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
};

// ==========================================
// AUTHENTICATION (JWT + Refresh Token + bcrypt)
// ==========================================

interface AccessTokenPayload {
  userId: string;
  companyId: string;
  role: string; // clé d'enum Prisma (ex. "AdminEntreprise") ; non utilisé pour l'autorisation
}

const signAccessToken = (payload: AccessTokenPayload) =>
  jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

const signRefreshToken = (userId: string) =>
  jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL });

const setRefreshCookie = (res: express.Response, token: string) => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: "/api/auth"
  });
};

// Express middleware : vérifie l'access token puis charge l'utilisateur en base.
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentification requise. Token manquant." });
  }

  let payload: AccessTokenPayload;
  try {
    payload = jwt.verify(token, JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch (err) {
    return res.status(401).json({ error: "Token invalide ou expiré." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ error: "Utilisateur introuvable." });
    }
    (req as any).authUser = user;
    (req as any).authCompanyId = user.companyId; // companyId autoritatif depuis la base
    next();
  } catch (err) {
    console.error("[requireAuth]", err);
    return res.status(500).json({ error: "Erreur base de données." });
  }
};

// Helper: derive request context from the authenticated JWT (replaces the old
// global in-memory "activeUserId" approach, which was not actually secure —
// it leaked state across all clients of the process).
const getContext = (req: express.Request) => {
  const user = (req as any).authUser as PrismaUser;
  const companyId = (req as any).authCompanyId as string;
  return { companyId, userId: user.id, user };
};

// Helper: lit ?page & ?limit d'une requête (défauts 1 / 20), les normalise
// (entiers positifs, limit plafonnée) et calcule skip pour prisma.findMany.
const getPagination = (req: express.Request, defaultLimit = 20, maxLimit = 100) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? ""), 10) || 1);
  const rawLimit = parseInt(String(req.query.limit ?? ""), 10) || defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, rawLimit));
  return { page, limit, skip: (page - 1) * limit };
};

// Construit l'enveloppe paginée { data, meta } commune aux routes listées.
const paginated = <T>(data: T[], total: number, page: number, limit: number) => ({
  data,
  meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
});

// Log action helper — [Prisma] écrit en base en fire-and-forget : on n'attend
// PAS la promesse (comportement identique aux appels existants, non bloquant
// pour la réponse HTTP). Une erreur d'écriture est loggée, jamais propagée.
// ctx.user.role vient du store mémoire (libellé FR) → converti en clé Prisma.
const logActionFor = (ctx: { companyId: string; userId: string; user?: { name: string; role: string } }, action: string, details: string) => {
  const userRole = (ctx.user ? toPrismaUserRole(ctx.user.role) : undefined) ?? PrismaUserRole.RH;
  const userName = ctx.user ? ctx.user.name : "Système";
  prisma.auditLog
    .create({
      data: {
        companyId: ctx.companyId,
        userId: ctx.userId || null,
        userName,
        userRole: userRole as PrismaUserRole,
        action,
        details,
      },
    })
    .catch((err) => console.error("[audit-log]", err));
};

// --- Routes ---

// POST /api/auth/login — verify credentials, issue access + refresh tokens
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (!user) {
      // Same generic error whether the user exists or not, to avoid user enumeration.
      return res.status(401).json({ error: "Identifiants invalides." });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Identifiants invalides." });
    }

    const accessToken = signAccessToken({ userId: user.id, companyId: user.companyId, role: user.role });
    const refreshToken = signRefreshToken(user.id);
    setRefreshCookie(res, refreshToken);

    logActionFor({ companyId: user.companyId, userId: user.id, user }, "Connexion", `${user.name} s'est connecté(e).`);

    res.json({ accessToken, user: mapUser(user) });
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// POST /api/auth/refresh — exchange a valid refresh token (httpOnly cookie) for a new access token
app.post("/api/auth/refresh", async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    return res.status(401).json({ error: "Aucun refresh token fourni." });
  }

  let payload: { userId: string };
  try {
    payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
    return res.status(401).json({ error: "Refresh token invalide ou expiré." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ error: "Utilisateur introuvable." });
    }

    const accessToken = signAccessToken({ userId: user.id, companyId: user.companyId, role: user.role });

    // Rotate the refresh token on every use (mitigates replay if a token leaks).
    const newRefreshToken = signRefreshToken(user.id);
    setRefreshCookie(res, newRefreshToken);

    res.json({ accessToken, user: mapUser(user) });
  } catch (err) {
    console.error("[POST /api/auth/refresh]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// POST /api/auth/logout — revoke the refresh token cookie
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
  res.json({ success: true });
});

// GET /api/auth/me — return the currently authenticated user (requires access token)
app.get("/api/auth/me", requireAuth, (req, res) => {
  const ctx = getContext(req);
  res.json({ user: mapUser(ctx.user) });
});

// ==========================================
// REST API ENDPOINTS
// ==========================================
// Every route below requires a valid access token (requireAuth).

// 1. TENANT CONTEXT
// [Prisma] Migré vers la base. companies/users ne sont jamais mutés par l'app
// (uniquement par le seed) → aucune divergence avec le store mémoire restant.
app.get("/api/companies", requireAuth, async (req, res) => {
  try {
    const rows = await prisma.company.findMany({ orderBy: { createdAt: "asc" } });
    res.json(rows.map(mapCompany));
  } catch (err) {
    console.error("[GET /api/companies]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

app.get("/api/users", requireAuth, async (req, res) => {
  try {
    const rows = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    res.json(rows.map(mapUser));
  } catch (err) {
    console.error("[GET /api/users]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

app.get("/api/context", requireAuth, async (req, res) => {
  const ctx = getContext(req);
  try {
    const [company, allCompanies, allUsers] = await Promise.all([
      prisma.company.findUnique({ where: { id: ctx.companyId } }),
      prisma.company.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.user.findMany({ where: { companyId: ctx.companyId }, orderBy: { createdAt: "asc" } }),
    ]);
    res.json({
      activeCompany: company ? mapCompany(company) : null,
      activeUser: mapUser(ctx.user),
      allCompanies: allCompanies.map(mapCompany),
      allUsers: allUsers.map(mapUser),
    });
  } catch (err) {
    console.error("[GET /api/context]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// Demo-only convenience: switch the active tenant/user without a full re-login.
// In a real product this would be a proper "impersonate" admin action, audited
// and restricted to platform admins — here it simply re-issues tokens for the
// target seed user so the multi-tenant workspace switcher keeps working.
app.post("/api/switch-context", requireAuth, async (req, res) => {
  const { companyId, userId } = req.body;

  // Contrôle de rôle : seuls les administrateurs (plateforme ou entreprise)
  // peuvent changer de contexte. Le rôle de l'appelant est la clé d'enum Prisma.
  const callerRole = getContext(req).user.role;
  if (callerRole !== PrismaUserRole.AdminPlateforme && callerRole !== PrismaUserRole.AdminEntreprise) {
    return res.status(403).json({ error: "Accès refusé. Rôle insuffisant pour changer de contexte." });
  }

  try {
    const targetUser = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : (companyId ? await prisma.user.findFirst({ where: { companyId }, orderBy: { createdAt: "asc" } }) : null);

    if (!targetUser) {
      return res.status(404).json({ error: "Utilisateur cible introuvable." });
    }

    const accessToken = signAccessToken({ userId: targetUser.id, companyId: targetUser.companyId, role: targetUser.role });
    const refreshToken = signRefreshToken(targetUser.id);
    setRefreshCookie(res, refreshToken);

    const company = await prisma.company.findUnique({ where: { id: targetUser.companyId }, select: { name: true } });
    logActionFor(
      { companyId: targetUser.companyId, userId: targetUser.id, user: targetUser },
      "Changement Tenant",
      `Switch vers l'espace de travail: ${company?.name}`
    );

    res.json({ success: true, accessToken, user: mapUser(targetUser) });
  } catch (err) {
    console.error("[POST /api/switch-context]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// 2. DASHBOARD KPIS & CHARTS
app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
  const { companyId } = getContext(req);
  try {
    // Agrégations Prisma, toutes scopées au tenant, exécutées en parallèle.
    const [totalJobs, activeJobs, totalCandidates, hiredCandidates, scoreAgg, candidateRows, recentJobRows, sourcingRows] =
      await Promise.all([
        prisma.job.count({ where: { companyId } }),
        prisma.job.count({ where: { companyId, status: JobStatus.Active } }),
        prisma.candidate.count({ where: { companyId } }),
        prisma.candidate.count({ where: { companyId, stage: PrismaPipelineStage.Hired } }),
        prisma.candidateScore.aggregate({ _avg: { globalScore: true }, where: { candidate: { companyId } } }),
        prisma.candidate.findMany({ where: { companyId }, include: candidateInclude, orderBy: { appliedAt: "desc" } }),
        prisma.job.findMany({ where: { companyId }, include: jobInclude, orderBy: { createdAt: "desc" }, take: 4 }),
        // Sourcing trend : candidatures par mois sur les 6 derniers mois (SQL PostgreSQL).
        prisma.$queryRaw<Array<{ name: string; candidatures: number }>>`
          SELECT TO_CHAR(DATE_TRUNC('month', "appliedAt"), 'Mon') AS name,
                 COUNT(*)::int AS candidatures
          FROM "Candidate"
          WHERE "companyId" = ${companyId}
            AND "appliedAt" >= NOW() - INTERVAL '6 months'
          GROUP BY DATE_TRUNC('month', "appliedAt"), name
          ORDER BY DATE_TRUNC('month', "appliedAt") ASC
        `,
      ]);

    const avgMatchingScore = scoreAgg._avg.globalScore != null ? Math.round(scoreAgg._avg.globalScore) : 0;

    const candidates = candidateRows.map(mapCandidate);

    // Sourcing trend : agrégation réelle des candidatures par mois. Si la base
    // est vide (aucune candidature sur 6 mois), fallback = 0 pour les 6 derniers mois.
    const sourcingTrend = sourcingRows.length > 0
      ? sourcingRows.map((r) => ({ name: r.name, candidatures: Number(r.candidatures) }))
      : Array.from({ length: 6 }, (_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - (5 - i));
          return { name: d.toLocaleString("en-US", { month: "short" }), candidatures: 0 };
        });

    // Distribution des compétences (depuis analysis.skills : languages+frameworks+tools+cloud), top 7.
    const skillCounts: Record<string, number> = {};
    for (const c of candidates) {
      const s = c.analysis?.skills;
      if (s) {
        for (const name of [...(s.languages || []), ...(s.frameworks || []), ...(s.tools || []), ...(s.cloud || [])]) {
          skillCounts[name] = (skillCounts[name] || 0) + 1;
        }
      }
    }
    const skillDistribution = Object.entries(skillCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);

    // Distribution par niveau d'expérience (analysis.yearsOfExperience).
    const expRanges = {
      "Junior (0-2 ans)": 0,
      "Intermédiaire (3-5 ans)": 0,
      "Senior (5-8 ans)": 0,
      "Expert (8 ans +)": 0,
    };
    for (const c of candidates) {
      const years = c.analysis?.yearsOfExperience || 0;
      if (years <= 2) expRanges["Junior (0-2 ans)"]++;
      else if (years <= 5) expRanges["Intermédiaire (3-5 ans)"]++;
      else if (years <= 8) expRanges["Senior (5-8 ans)"]++;
      else expRanges["Expert (8 ans +)"]++;
    }
    const expDistribution = Object.entries(expRanges).map(([name, value]) => ({ name, value }));

    res.json({
      kpis: { totalJobs, activeJobs, totalCandidates, hiredCandidates, avgMatchingScore },
      sourcingTrend,
      skillDistribution: skillDistribution.length > 0 ? skillDistribution : [
        { name: "React", count: 4 },
        { name: "TypeScript", count: 3 },
        { name: "AWS", count: 2 },
        { name: "Kubernetes", count: 2 },
        { name: "Docker", count: 3 },
        { name: "Node.js", count: 3 },
      ],
      expDistribution,
      recentCandidates: candidates.slice(0, 5),
      recentJobs: recentJobRows.map(mapJob),
    });
  } catch (err) {
    console.error("[GET /api/dashboard/stats]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// 3. JOB OFFERS (Offres d'emploi) — [Prisma] lecture + écriture sur la base.
// skillsRequired (string[] côté front) est normalisé dans la relation JobSkill.

// -- Helpers jobs --------------------------------------------------------------

const isValidContractType = (v: unknown): v is PrismaContractType =>
  typeof v === "string" && (Object.values(PrismaContractType) as string[]).includes(v);

const isValidJobStatus = (v: unknown): v is JobStatus =>
  typeof v === "string" && (Object.values(JobStatus) as string[]).includes(v);

const toStringArray = (v: unknown, sep: string): string[] =>
  Array.isArray(v)
    ? v.map((x) => String(x).trim()).filter(Boolean)
    : (v ? String(v).split(sep).map((s) => s.trim()).filter(Boolean) : []);

// Réconcilie les compétences d'un job : upsert du référentiel Skill (par nom
// unique ; catégorie Tool par défaut pour une compétence encore inconnue, comme
// le fallback du seed) puis création des liens JobSkill. À exécuter dans une
// transaction (tx) pour rester atomique avec la création/màj du Job.
const replaceJobSkills = async (
  tx: Prisma.TransactionClient,
  jobId: string,
  skillNames: string[]
) => {
  const clean = [...new Set(skillNames.map((s) => s.trim()).filter(Boolean))];
  for (const name of clean) {
    const skill = await tx.skill.upsert({
      where: { name },
      update: {},
      create: { name, category: SkillCategory.Tool },
    });
    await tx.jobSkill.create({ data: { jobId, skillId: skill.id, required: true } });
  }
};

// -- Routes --------------------------------------------------------------------

app.get("/api/jobs", requireAuth, async (req, res) => {
  const { companyId } = getContext(req);
  try {
    const rows = await prisma.job.findMany({
      where: { companyId },
      include: jobInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json(rows.map(mapJob));
  } catch (err) {
    console.error("[GET /api/jobs]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

app.post("/api/jobs", requireAuth, async (req, res) => {
  const ctx = getContext(req);
  const { companyId } = ctx;
  const b = req.body ?? {};
  try {
    const skills = toStringArray(b.skillsRequired, ",");
    const full = await prisma.$transaction(async (tx) => {
      const created = await tx.job.create({
        data: {
          companyId,
          title: b.title || "Nouvelle offre d'emploi",
          description: b.description || "",
          missions: toStringArray(b.missions, "\n"),
          educationRequired: b.educationRequired || "Non spécifié",
          languagesRequired: toStringArray(b.languagesRequired, ","),
          minExperienceYears: Number(b.minExperienceYears) || 0,
          salaryRange: b.salaryRange || "",
          deadline: b.deadline ? new Date(b.deadline) : null,
          location: b.location || "Télé-travail / Hybride",
          contractType: isValidContractType(b.contractType) ? b.contractType : PrismaContractType.CDI,
          status: JobStatus.Active,
        },
      });
      await replaceJobSkills(tx, created.id, skills);
      return tx.job.findUniqueOrThrow({ where: { id: created.id }, include: jobInclude });
    });
    logActionFor(ctx, "Création d'offre", `Création de l'offre '${full.title}'`);
    res.json(mapJob(full));
  } catch (err) {
    console.error("[POST /api/jobs]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

app.put("/api/jobs/:id", requireAuth, async (req, res) => {
  const ctx = getContext(req);
  const { companyId } = ctx;
  const { id } = req.params;
  const b = req.body ?? {};
  try {
    // Scoping tenant : on ne modifie que si l'offre appartient à la company.
    const existing = await prisma.job.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ error: "Offre introuvable" });

    // Whitelist des champs modifiables (évite d'écraser id/companyId/createdAt).
    const data: Prisma.JobUpdateInput = {};
    if (b.title !== undefined) data.title = b.title;
    if (b.description !== undefined) data.description = b.description;
    if (b.missions !== undefined) data.missions = toStringArray(b.missions, "\n");
    if (b.educationRequired !== undefined) data.educationRequired = b.educationRequired;
    if (b.languagesRequired !== undefined) data.languagesRequired = toStringArray(b.languagesRequired, ",");
    if (b.minExperienceYears !== undefined) data.minExperienceYears = Number(b.minExperienceYears) || 0;
    if (b.salaryRange !== undefined) data.salaryRange = b.salaryRange;
    if (b.deadline !== undefined) data.deadline = b.deadline ? new Date(b.deadline) : null;
    if (b.location !== undefined) data.location = b.location;
    if (isValidContractType(b.contractType)) data.contractType = b.contractType;
    if (isValidJobStatus(b.status)) data.status = b.status;

    const full = await prisma.$transaction(async (tx) => {
      await tx.job.update({ where: { id }, data });
      if (b.skillsRequired !== undefined) {
        await tx.jobSkill.deleteMany({ where: { jobId: id } });
        await replaceJobSkills(tx, id, toStringArray(b.skillsRequired, ","));
      }
      return tx.job.findUniqueOrThrow({ where: { id }, include: jobInclude });
    });
    logActionFor(ctx, "Mise à jour d'offre", `Modification de l'offre '${full.title}'`);
    res.json(mapJob(full));
  } catch (err) {
    console.error("[PUT /api/jobs/:id]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// Suppression = archivage (soft delete), fidèle au comportement d'origine.
app.delete("/api/jobs/:id", requireAuth, async (req, res) => {
  const ctx = getContext(req);
  const { companyId } = ctx;
  const { id } = req.params;
  try {
    const existing = await prisma.job.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ error: "Offre introuvable" });

    await prisma.job.update({ where: { id }, data: { status: JobStatus.Archived } });
    logActionFor(ctx, "Archivage d'offre", `L'offre '${existing.title}' a été archivée.`);
    res.json({ success: true, id });
  } catch (err) {
    console.error("[DELETE /api/jobs/:id]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// 4. CANDIDATES — [Prisma] lecture + écriture sur la base.
// scores → table 1-1 CandidateScore ; analysis/recommendation → Json.

app.get("/api/candidates", requireAuth, async (req, res) => {
  const { companyId } = getContext(req);
  const { page, limit, skip } = getPagination(req);
  try {
    const [total, rows] = await Promise.all([
      prisma.candidate.count({ where: { companyId } }),
      prisma.candidate.findMany({
        where: { companyId },
        include: candidateInclude,
        orderBy: { appliedAt: "desc" },
        skip,
        take: limit,
      }),
    ]);
    res.json(paginated(rows.map(mapCandidate), total, page, limit));
  } catch (err) {
    console.error("[GET /api/candidates]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

app.post("/api/candidates", requireAuth, async (req, res) => {
  const ctx = getContext(req);
  const { companyId } = ctx;
  const b = req.body ?? {};
  try {
    // Rattachement à une offre : jobId fourni (scopé tenant) sinon 1re offre du
    // tenant, sinon null — fidèle au fallback jobs[0] de l'origine.
    let jobId: string | null = null;
    if (b.jobId) {
      const j = await prisma.job.findFirst({ where: { id: b.jobId, companyId }, select: { id: true } });
      jobId = j?.id ?? null;
    }
    if (!jobId) {
      const first = await prisma.job.findFirst({ where: { companyId }, orderBy: { createdAt: "asc" }, select: { id: true } });
      jobId = first?.id ?? null;
    }

    const created = await prisma.candidate.create({
      data: {
        companyId,
        jobId,
        name: b.name || "Candidat anonyme",
        email: b.email || "",
        phone: b.phone || "",
        location: b.location || "Non spécifiée",
        linkedinUrl: b.linkedinUrl || null,
        stage: PrismaPipelineStage.Received,
        cvText: b.cvText || "",
        letterText: b.letterText || "",
      },
      include: candidateInclude,
    });
    logActionFor(ctx, "Ajout de candidat", `Ajout manuel du candidat '${created.name}'`);
    res.json(mapCandidate(created));
  } catch (err) {
    console.error("[POST /api/candidates]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

app.put("/api/candidates/:id/stage", requireAuth, async (req, res) => {
  const ctx = getContext(req);
  const { companyId } = ctx;
  const { id } = req.params;
  try {
    const existing = await prisma.candidate.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ error: "Candidat introuvable" });

    // Le front envoie le libellé FR ("Entretien RH") → clé Prisma ("HRInterview").
    const prismaStage = toPrismaPipelineStage(String(req.body?.stage ?? ""));
    if (!prismaStage) return res.status(400).json({ error: "Stage invalide." });

    const oldStageLabel = mapPipelineStage(existing.stage);
    const updated = await prisma.candidate.update({
      where: { id },
      data: { stage: prismaStage as PrismaPipelineStage },
      include: candidateInclude,
    });
    logActionFor(ctx, "Transition Pipeline", `Candidat '${updated.name}' déplacé de '${oldStageLabel}' vers '${mapPipelineStage(updated.stage)}'`);
    res.json(mapCandidate(updated));
  } catch (err) {
    console.error("[PUT /api/candidates/:id/stage]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// Mise à jour du profil candidat (édition du CV depuis la fiche, entre autres).
// Chemin distinct de "/:id/stage" → pas de collision de route Express.
app.put("/api/candidates/:id", requireAuth, async (req, res) => {
  const ctx = getContext(req);
  const { companyId } = ctx;
  const { id } = req.params;
  const b = req.body ?? {};
  try {
    const existing = await prisma.candidate.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ error: "Candidat introuvable" });

    // Whitelist des champs éditables (évite d'écraser id/companyId/stage/scores).
    const data: Prisma.CandidateUpdateInput = {};
    if (b.name !== undefined) data.name = b.name;
    if (b.email !== undefined) data.email = b.email;
    if (b.phone !== undefined) data.phone = b.phone;
    if (b.location !== undefined) data.location = b.location;
    if (b.linkedinUrl !== undefined) data.linkedinUrl = b.linkedinUrl || null;
    if (b.cvText !== undefined) data.cvText = b.cvText;
    if (b.letterText !== undefined) data.letterText = b.letterText;

    const updated = await prisma.candidate.update({
      where: { id },
      data,
      include: candidateInclude,
    });
    logActionFor(ctx, "Mise à jour candidat", `Modification du profil de '${updated.name}'`);
    res.json(mapCandidate(updated));
  } catch (err) {
    console.error("[PUT /api/candidates/:id]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// Suppression DÉFINITIVE (fidèle à l'origine). Cascade : CandidateScore + CandidateSkill.
app.delete("/api/candidates/:id", requireAuth, async (req, res) => {
  const ctx = getContext(req);
  const { companyId } = ctx;
  const { id } = req.params;
  try {
    const existing = await prisma.candidate.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ error: "Candidat introuvable" });

    await prisma.candidate.delete({ where: { id } });
    logActionFor(ctx, "Suppression candidat", `Candidat '${existing.name}' supprimé définitivement.`);
    res.json({ success: true, id });
  } catch (err) {
    console.error("[DELETE /api/candidates/:id]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// ==========================================
// 5. SERVER-SIDE GEMINI AI ACTIONS
// ==========================================

// Parse and evaluate resume with Gemini!
app.post("/api/candidates/:id/analyze", requireAuth, async (req, res) => {
  const ctx = getContext(req);
  const { companyId } = ctx;
  const { id } = req.params;

  try {
    // [Prisma] Accès données migré ; la logique Gemini ci-dessous est inchangée.
    const candidate = await prisma.candidate.findFirst({ where: { id, companyId } });
    if (!candidate) return res.status(404).json({ error: "Candidat introuvable" });

    // Offre liée (pour le prompt) : skillsRequired reconstruit depuis JobSkill.
    const job = candidate.jobId
      ? await prisma.job.findUnique({ where: { id: candidate.jobId }, include: jobInclude })
      : null;

    if (!candidate.cvText) {
      return res.status(400).json({ error: "Aucun CV textuel disponible à analyser." });
    }

    const jobPromptInfo = job
      ? `Poste : ${job.title}\nDescription : ${job.description}\nCompétences requises : ${job.skills.map((js) => js.skill.name).join(", ")}\nExpérience requise : ${job.minExperienceYears} ans`
      : "Poste : Développeur Web Généraliste";

    const prompt = `Tu es un expert d'un système ATS de recrutement RH intelligent.
Analyse le CV ci-dessous par rapport au descriptif du poste proposé. Extrais de manière structurée les informations au format JSON respectant EXACTEMENT la structure spécifiée.

POSTE DE RÉFÉRENCE :
${jobPromptInfo}

CV DU CANDIDAT :
${candidate.cvText}

REQUIS DE SORTIE - FORMAT JSON UNIQUEMENT :
Tu dois renvoyer un objet JSON valide contenant exactement les clés suivantes :
1. "analysis" : contenant :
   - "personalInfo" : { "name", "email", "phone", "location", "linkedin" } (S'ils ne sont pas trouvés, laisse vide)
   - "skills" : { "languages": [], "frameworks": [], "databases": [], "tools": [], "cloud": [], "softSkills": [] } (Répartis les compétences extraites du CV)
   - "educations" : un tableau d'objets { "degree", "school", "year" }
   - "experiences" : un tableau d'objets { "years", "company", "role", "description" }
   - "languages" : un tableau de chaînes de caractères (les langues parlées, ex: ["Français", "Anglais"])
   - "yearsOfExperience" : un entier représentant le nombre total d'années d'expérience calculé
2. "scores" : un objet { "skillsScore", "experienceScore", "educationScore", "softSkillsScore", "languagesScore", "globalScore" } (Tous les scores doivent être des entiers entre 0 et 100 fondés sur la compatibilité avec le poste proposé)
3. "recommendation" : un objet contenant :
   - "summary" : un court résumé professionnel (3-4 phrases en français) du candidat.
   - "strengths" : un tableau des 3-4 points forts majeurs pour ce poste.
   - "weaknesses" : un tableau de 1-2 points plus faibles ou limites.
   - "attentionPoints" : un tableau de points de vigilance pour l'entretien.
   - "compatibilityExplanation" : un paragraphe expliquant le calcul de la compatibilité.
   - "suggestedDecision" : une chaîne de caractères qui DOIT être strictement l'un des trois : "Entretien", "Réserve", "Rejet".

Réponds uniquement avec le bloc JSON brut, sans enrobage markdown (sans \`\`\`json). Ta réponse doit être directement parsable en JSON.`;

    // Call Gemini API server-side (retry 503/429 via l'utilitaire partagé).
    const response = await callGeminiWithRetry({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text || "{}";
    const parsedData = JSON.parse(resultText);

    // [Prisma] Persistance : analysis/recommendation en Json, scores en table 1-1.
    const analysis = parsedData.analysis || {};
    const scores = parsedData.scores || {
      skillsScore: 70, experienceScore: 70, educationScore: 70,
      softSkillsScore: 70, languagesScore: 70, globalScore: 70,
    };
    const recommendation = parsedData.recommendation || {
      summary: "Analyse automatisée complétée.",
      strengths: [], weaknesses: [], attentionPoints: [],
      compatibilityExplanation: "Calculé automatiquement.",
      suggestedDecision: "Réserve",
    };
    const pi = parsedData.analysis?.personalInfo ?? {};
    const scoreData = {
      skillsScore: Number(scores.skillsScore) || 0,
      experienceScore: Number(scores.experienceScore) || 0,
      educationScore: Number(scores.educationScore) || 0,
      softSkillsScore: Number(scores.softSkillsScore) || 0,
      languagesScore: Number(scores.languagesScore) || 0,
      globalScore: Number(scores.globalScore) || 0,
    };
    // Passe "Reçu" → "Analysé" si le candidat n'avait pas encore été traité.
    const nextStage = candidate.stage === PrismaPipelineStage.Received
      ? PrismaPipelineStage.Analyzed
      : candidate.stage;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.candidate.update({
        where: { id },
        data: {
          analysis,
          recommendation,
          name: pi.name || candidate.name,
          email: pi.email || candidate.email,
          phone: pi.phone || candidate.phone,
          location: pi.location || candidate.location,
          stage: nextStage,
        },
      });
      await tx.candidateScore.upsert({
        where: { candidateId: id },
        update: scoreData,
        create: { candidateId: id, ...scoreData },
      });
      return tx.candidate.findUniqueOrThrow({ where: { id }, include: candidateInclude });
    });

    logActionFor(ctx, "Analyse IA complète", `Le CV de '${updated.name}' a été analysé avec succès par l'IA. Score global calculé : ${updated.score?.globalScore}/100.`);

    res.json(mapCandidate(updated));
  } catch (error: any) {
    console.error("Gemini Parse Error:", error);
    res.status(500).json({ error: "Erreur lors de l'analyse avec Gemini: " + error.message });
  }
});

// AI Search candidates using natural language query
app.post("/api/candidates/ai-search", requireAuth, async (req, res) => {
  const ctx = getContext(req);
  const { companyId } = ctx;
  const { query } = req.body;

  if (!query) return res.status(400).json({ error: "Requête vide." });

  try {
    // [Prisma] Candidats du tenant (score 1-1 + CandidateSkill inclus). La
    // sérialisation ci-dessous reste basée sur analysis (logique IA inchangée).
    const rows = await prisma.candidate.findMany({
      where: { companyId },
      include: { score: true, skills: { include: { skill: true } } },
    });
    const tenantCandidates = rows.map(mapCandidate);

    const serializedCandidates = tenantCandidates.map(c => ({
      id: c.id,
      name: c.name,
      location: c.location,
      stage: c.stage,
      yearsOfExperience: c.analysis?.yearsOfExperience || 0,
      skills: c.analysis?.skills ? [
        ...(c.analysis.skills.languages || []),
        ...(c.analysis.skills.frameworks || []),
        ...(c.analysis.skills.tools || []),
        ...(c.analysis.skills.cloud || [])
      ] : [],
      scores: c.scores
    }));

    const prompt = `Tu es l'intelligence artificielle de recrutement du système ATS "Nexus Talent System".
Le recruteur formule la recherche naturelle suivante : "${query}"

Voici la liste des candidats indexés pour son entreprise en JSON :
${JSON.stringify(serializedCandidates, null, 2)}

Analyse la requête naturelle et sélectionne les candidats pertinents par rapport aux mots-clés, années d'expérience ou exigences décrits dans la requête.
Tu dois renvoyer un objet JSON contenant exactement deux clés :
1. "matchedIds" : un tableau contenant les IDs des candidats qui correspondent le mieux (peut être vide s'il n'y a aucune correspondance).
2. "explanation" : une explication rédigée de manière professionnelle et fluide en français (3-4 phrases) détaillant pourquoi ces profils ont été retenus par rapport à la demande du recruteur, et comment la sélection a été opérée.

Réponds uniquement avec le bloc JSON brut. Pas de markdown.`;

    const response = await callGeminiWithRetry({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsedResponse = JSON.parse(response.text || "{}");
    logActionFor(ctx, "Recherche IA", `Recherche naturelle formulée : "${query}". Profils trouvés : ${parsedResponse.matchedIds?.length || 0}`);
    res.json(parsedResponse);
  } catch (error: any) {
    console.error("AI Search Error:", error);
    res.status(500).json({ error: "Erreur lors de la recherche intelligente: " + error.message });
  }
});

// 6. EMAIL IMPORT & AUTOMATIC CREATION
app.get("/api/emails", requireAuth, async (req, res) => {
  const { companyId } = getContext(req);
  const { page, limit, skip } = getPagination(req);
  try {
    const [total, rows] = await Promise.all([
      prisma.email.count({ where: { companyId } }),
      prisma.email.findMany({
        where: { companyId },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
    ]);
    res.json(paginated(rows.map(mapEmail), total, page, limit));
  } catch (err) {
    console.error("[GET /api/emails]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// Import : crée un candidat depuis l'email (→ Prisma, ce qui résorbe la
// divergence candidates) et marque l'email comme importé, en transaction.
app.post("/api/emails/:id/import", requireAuth, async (req, res) => {
  const ctx = getContext(req);
  const { companyId } = ctx;
  const { id } = req.params;
  const b = req.body ?? {};
  try {
    const email = await prisma.email.findFirst({ where: { id, companyId } });
    if (!email) return res.status(404).json({ error: "Email introuvable" });

    // Rattachement à une offre : jobId fourni (scopé tenant) sinon 1re offre du
    // tenant, sinon null — même logique que POST /api/candidates.
    let jobId: string | null = null;
    if (b.jobId) {
      const j = await prisma.job.findFirst({ where: { id: b.jobId, companyId }, select: { id: true } });
      jobId = j?.id ?? null;
    }
    if (!jobId) {
      const first = await prisma.job.findFirst({ where: { companyId }, orderBy: { createdAt: "asc" }, select: { id: true } });
      jobId = first?.id ?? null;
    }

    const candidate = await prisma.$transaction(async (tx) => {
      const created = await tx.candidate.create({
        data: {
          companyId,
          jobId,
          name: email.from.split("@")[0].replace(".", " "), // défaut, avant analyse IA
          email: email.from,
          phone: "",
          location: "En attente d'analyse",
          stage: PrismaPipelineStage.Received,
          cvText: email.attachmentContent || email.body,
          letterText: email.body,
        },
      });
      await tx.email.update({ where: { id }, data: { status: "Imported" } });
      return created;
    });

    logActionFor(ctx, "Import d'Email", `Candidat importé automatiquement depuis l'email de '${email.from}'`);
    res.json({ success: true, candidateId: candidate.id });
  } catch (err) {
    console.error("[POST /api/emails/:id/import]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// 7. AUDIT LOGS — [Prisma] lecture sur la base (écriture via logActionFor).
app.get("/api/audit-logs", requireAuth, async (req, res) => {
  const { companyId } = getContext(req);
  const { page, limit, skip } = getPagination(req);
  try {
    const [total, rows] = await Promise.all([
      prisma.auditLog.count({ where: { companyId } }),
      prisma.auditLog.findMany({
        where: { companyId },
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
      }),
    ]);
    res.json(paginated(rows.map(mapAuditLog), total, page, limit));
  } catch (err) {
    console.error("[GET /api/audit-logs]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// ==========================================
// VITE INTEGRATION / SERVER LISTEN
// ==========================================

async function startServer() {
  // Integrate Vite Dev Server in dev mode, else static assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Nexus Server] running on http://localhost:${PORT}`);
  });
}

startServer();
