import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import multer from "multer";
import fs from "fs";
import crypto from "crypto";
import { Prisma, ContractType as PrismaContractType, JobStatus, SkillCategory, PipelineStage as PrismaPipelineStage, UserRole as PrismaUserRole, EmailStatus } from "@prisma/client";
import { prisma } from "./src/lib/prisma.js";
import type { User as PrismaUser } from "@prisma/client";
import { mapCompany, mapUser, mapJob, jobInclude, mapCandidate, mapPipelineStage, candidateInclude, toPrismaPipelineStage, mapEmail, mapAuditLog, toPrismaUserRole } from "./src/lib/mappers.js";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { Resend } from "resend";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

// Load environment variables
dotenv.config();

// Envoi d'emails transactionnels via Resend. Sans clé configurée, l'envoi est
// désactivé silencieusement (l'app fonctionne normalement, aucun email n'est
// envoyé). sendEmail ne propage jamais d'erreur → ne fait pas échouer la requête.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.EMAIL_FROM || "onboarding@resend.dev";

async function sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY non configurée — email non envoyé.");
    return;
  }
  try {
    await resend.emails.send({ from: FROM_EMAIL, to: params.to, subject: params.subject, html: params.html });
    console.log(`[email] Envoyé à ${params.to} : ${params.subject}`);
  } catch (err) {
    console.error("[email] Erreur Resend :", err);
    // Volontairement silencieux : ne pas faire échouer la requête principale.
  }
}

const app = express();
// Port injecté par l'hébergeur (Render, Railway…) en production ; 3000 en local.
const PORT = Number(process.env.PORT) || 3000;

// ==========================================
// FILET DE SÉCURITÉ GLOBAL (anti-crash)
// Empêche qu'une erreur asynchrone non capturée ne termine le process entier.
// Choix assumé : on LOGUE sans quitter, pour maximiser la disponibilité (une
// requête ratée → 500, pas un serveur mort). Les erreurs restent visibles dans
// les logs (Render) pour investigation.
// ==========================================
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

// Middleware d'erreur Express (4 args) : renvoie un 500 JSON propre pour toute
// erreur synchrone remontée par une route (au lieu d'une page HTML par défaut).
// Enregistré en DERNIER dans startServer(). Les erreurs async sont déjà couvertes
// par les try/catch des routes + les handlers process ci-dessus.
const errorHandler: express.ErrorRequestHandler = (err, _req, res, next) => {
  console.error("[express error]", err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Erreur interne du serveur." });
};

// ==========================================
// SÉCURITÉ (Helmet, CORS restreint, rate limiting)
// ==========================================
// Helmet : headers de sécurité HTTP. CSP élargie aux sources réellement
// utilisées par l'app (Google Fonts + images externes type avatars), sinon
// polices et photos seraient bloquées.
app.use(helmet({
  crossOriginEmbedderPolicy: false, // nécessaire pour Vite en dev
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Vite HMR
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"], // avatars/photos externes
      connectSrc: ["'self'", "ws:", "wss:"], // WebSocket Vite
    },
  },
}));

// CORS restreint aux origines autorisées (le front est servi par ce même
// serveur → même origine ; la liste couvre aussi le dev Vite sur 5173).
// Normalise agressivement : retire espaces/retours à la ligne (invisibles collés
// au copier-coller d'une variable), les slashs de fin, et met en minuscules.
// Tolère ainsi FRONTEND_URL saisie avec "/" final ou espace parasite.
const normalizeOrigin = (u: string) => u.trim().replace(/\/+$/, "").toLowerCase();
const allowedOrigins = (process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ["http://localhost:3000", "http://localhost:5173"]).map(normalizeOrigin);
console.log("[CORS] Origines autorisées :", JSON.stringify(allowedOrigins));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Postman, curl, requêtes serveur
    if (allowedOrigins.includes(normalizeOrigin(origin))) return callback(null, true);
    console.warn(`[CORS] Origine refusée: "${origin}" — autorisées: ${JSON.stringify(allowedOrigins)}`);
    callback(new Error(`Origine non autorisée : ${origin}`));
  },
  credentials: true, // cookies (refresh token JWT)
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Rate limiting : limite générale sur l'API + limites strictes login/candidature.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requêtes. Réessayez dans 15 minutes." },
  skip: (req) => req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1",
});
app.use("/api", globalLimiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives de connexion. Réessayez dans 15 minutes." },
});
app.use("/api/auth/login", loginLimiter);
// Même plafond strict pour la demande de réinitialisation (anti-abus / email-bombing).
app.use("/api/auth/forgot-password", loginLimiter);

const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de candidatures. Réessayez dans 1 heure." },
});
app.use("/api/public/apply", applyLimiter);

app.use(express.json());
app.use(cookieParser());

// ==========================================
// UPLOADS (photos candidats)
// ==========================================
// Dossier de stockage des fichiers uploadés (créé au démarrage si absent).
// La desserte statique de /uploads est configurée dans vite.config.ts (dev).
const avatarDir = path.join(process.cwd(), "uploads", "avatars");
fs.mkdirSync(avatarDir, { recursive: true });

// Types d'images acceptés (photos de profil + CV lus par OCR).
const IMAGE_MIME_RE = /^image\/(jpe?g|png|webp)$/i;
const IMAGE_EXT_RE = /\.(jpe?g|png|webp)$/i;
// Taille max d'une photo de profil : stockée en base64 dans la fiche (base Neon),
// on la garde légère pour ne pas gonfler la base.
const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 Mo

// Photo de profil : stockée EN MÉMOIRE puis encodée en base64 (data URL). Le
// disque de l'hébergeur (plan gratuit) est éphémère et non servi en prod : une
// data URL persiste dans la fiche candidat et s'affiche partout (CSP autorise data:).
const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIME_RE.test(file.mimetype)) cb(null, true);
    else cb(new Error("Seules les images JPG, PNG ou WebP sont acceptées."));
  },
});

// ==========================================
// AUTH CONFIG
// ==========================================
// In production these MUST come from real secrets management, never hardcoded.
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me";
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";
const REFRESH_COOKIE_NAME = "nexus_refresh_token";

// URL publique de base : sert à construire les redirect_uri OAuth et les liens
// de réinitialisation. En dev, le serveur écoute sur localhost:3000.
const BASE_URL = process.env.FRONTEND_URL || `http://localhost:${PORT}`;

// OAuth Google + SSO (OIDC générique). Tous OPTIONNELS : si les identifiants ne
// sont pas fournis, les boutons correspondants restent désactivés côté front
// (voir GET /api/auth/providers). Aucun code externe requis — échanges en HTTP.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const SSO_ISSUER = (process.env.SSO_ISSUER || "").replace(/\/$/, ""); // ex. https://votre-tenant.okta.com
const SSO_CLIENT_ID = process.env.SSO_CLIENT_ID || "";
const SSO_CLIENT_SECRET = process.env.SSO_CLIENT_SECRET || "";
const googleConfigured = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
const ssoConfigured = Boolean(SSO_ISSUER && SSO_CLIENT_ID && SSO_CLIENT_SECRET);

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
  const MAX_ATTEMPTS = 4;
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

// Traduit une erreur Gemini en message clair et actionnable pour l'utilisateur
// (surcharge temporaire = 503 « high demand » ; quota = 429). Renvoie null si
// l'erreur n'est pas un cas transitoire connu → l'appelant met son message par défaut.
const aiTransientMessage = (err: any): string | null => {
  const raw = `${err?.status ?? ""} ${err?.code ?? ""} ${err?.message ?? ""}`;
  if (/\b503\b|UNAVAILABLE|overloaded|high demand/i.test(raw))
    return "Le service IA est momentanément surchargé (pic de demande côté fournisseur). Réessayez dans quelques instants.";
  if (/\b429\b|RESOURCE_EXHAUSTED|quota/i.test(raw))
    return "Le quota du service IA est atteint pour le moment. Réessayez un peu plus tard.";
  return null;
};

// OCR d'une image de CV (JPG/PNG/WebP) via Gemini (multimodal, déjà utilisé pour
// l'analyse). Renvoie le texte transcrit ; aucune dépendance OCR supplémentaire.
async function ocrImageToText(buffer: Buffer, mimeType: string): Promise<string> {
  const response = await callGeminiWithRetry({
    model: "gemini-3.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: buffer.toString("base64") } },
          {
            text:
              "Transcris fidèlement et INTÉGRALEMENT tout le texte visible sur cette image de CV, " +
              "en conservant la structure (sections, listes, coordonnées). Ne résume pas, ne commente pas : " +
              "renvoie uniquement le texte brut du document.",
          },
        ],
      },
    ],
  });
  return (response.text ?? "").trim();
}

// Extraction du texte d'un CV quel que soit le format : image (OCR Gemini),
// Word .docx (mammoth) ou PDF (pdf-parse). Réutilisé par l'import recruteur
// (POST /api/candidates/:id/cv) et la candidature publique (POST /api/public/apply).
async function extractCvText(file: { buffer: Buffer; mimetype: string; originalname: string }): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase();
  if (IMAGE_MIME_RE.test(file.mimetype) || IMAGE_EXT_RE.test(ext)) {
    return ocrImageToText(file.buffer, file.mimetype);
  }
  const isDocx =
    ext === ".docx" ||
    file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (isDocx) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value || "";
  }
  const parser = new PDFParse({ data: file.buffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text || "";
}

// Parse "tolérant" d'une réponse JSON du modèle : enlève un éventuel bloc ```json
// et, à défaut, extrait le premier objet { ... } présent. Lève si rien d'exploitable.
function parseAiJsonLoose<T = any>(text: string): T {
  const cleaned = (text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Réponse IA illisible");
  }
}

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
// Extrait l'IP réelle du client et le navigateur. L'app est derrière
// Cloudflare + Render : l'en-tête `cf-connecting-ip` porte l'IP d'origine ;
// à défaut on prend le 1er maillon de `x-forwarded-for`, puis la socket.
const getClientMeta = (req: express.Request): { ip: string | null; userAgent: string | null } => ({
  ip:
    (req.headers["cf-connecting-ip"] as string) ||
    ((req.headers["x-forwarded-for"] as string) || "").split(",")[0].trim() ||
    req.socket.remoteAddress ||
    null,
  userAgent: (req.headers["user-agent"] as string) || null,
});

const logActionFor = (
  ctx: { companyId: string; userId: string; user?: { name: string; role: string } },
  action: string,
  details: string,
  meta?: { ip?: string | null; userAgent?: string | null }
) => {
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
        ip: meta?.ip ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    })
    .catch((err) => console.error("[audit-log]", err));
};

// Tente d'extraire une prétention salariale d'un texte libre (lettre de motivation).
// Reconnaît les montants suivis d'une devise malgache (Ar/Ariary/MGA) et renvoie
// toujours un format normalisé : "1 300 000 Ar" (espaces comme séparateurs de milliers).
function extractSalaryExpectation(text: string): string | null {
  if (!text) return null;

  const match = text.match(/(\d[\d\s.,]*)\s*(?:ar(?:iary)?|mga)\b/i);
  if (!match) return null;

  // Nettoyer le nombre : supprimer espaces, points et virgules
  const raw = match[1].replace(/[\s.,]/g, "");
  const amount = parseInt(raw, 10);
  if (isNaN(amount) || amount < 10000) return null; // sanity check

  // Formater avec espaces comme séparateurs de milliers (fr-FR utilise U+202F,
  // l'espace insécable fine → on la remplace par une espace normale).
  const formatted = amount.toLocaleString("fr-FR").replace(/[  ]/g, " ");

  return `${formatted} Ar`;
}

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

    logActionFor({ companyId: user.companyId, userId: user.id, user }, "Connexion", `${user.name} s'est connecté(e).`, getClientMeta(req));

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
// MOT DE PASSE OUBLIÉ (flux email via Resend)
// ==========================================

// POST /api/auth/forgot-password — envoie un lien de réinitialisation si l'email
// correspond à un compte. Réponse TOUJOURS générique (aucune énumération d'users).
app.post("/api/auth/forgot-password", async (req, res) => {
  const email = String(req.body?.email ?? "").toLowerCase().trim();
  if (!email) return res.status(400).json({ error: "Email requis." });

  // Réponse identique que l'utilisateur existe ou non.
  const generic = () => res.json({ success: true });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (user) {
      // Token en clair envoyé par email ; seul son hash SHA-256 est stocké.
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

      await prisma.user.update({
        where: { id: user.id },
        data: { resetTokenHash: tokenHash, resetTokenExpiry: expiry },
      });

      const appName = user.company?.appName || "Nexus Talent";
      const link = `${BASE_URL}/reset-password?token=${rawToken}`;

      await sendEmail({
        to: user.email,
        subject: `Réinitialisation de votre mot de passe — ${appName}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;color:#0f172a">
            <h2 style="color:#0f172a">Réinitialisation de mot de passe</h2>
            <p>Bonjour ${user.name},</p>
            <p>Vous avez demandé à réinitialiser votre mot de passe sur <strong>${appName}</strong>.
            Cliquez sur le bouton ci-dessous. Ce lien expire dans <strong>1 heure</strong>.</p>
            <p style="text-align:center;margin:28px 0">
              <a href="${link}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block">Réinitialiser mon mot de passe</a>
            </p>
            <p style="font-size:13px;color:#64748b">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
            <a href="${link}" style="color:#2563eb;word-break:break-all">${link}</a></p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
            <p style="font-size:12px;color:#64748b">Vous n'êtes pas à l'origine de cette demande ? Ignorez cet email, votre mot de passe reste inchangé.</p>
          </div>`,
      });
    }

    return generic();
  } catch (err) {
    console.error("[POST /api/auth/forgot-password]", err);
    // Ne rien divulguer : réponse générique même en cas d'erreur interne.
    return generic();
  }
});

// POST /api/auth/reset-password — consomme le token et fixe le nouveau mot de passe.
app.post("/api/auth/reset-password", async (req, res) => {
  const token = String(req.body?.token ?? "");
  const newPassword = String(req.body?.password ?? "");

  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token et nouveau mot de passe requis." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères." });
  }

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await prisma.user.findFirst({
      where: { resetTokenHash: tokenHash, resetTokenExpiry: { gt: new Date() } },
    });

    if (!user) {
      return res.status(400).json({ error: "Lien invalide ou expiré. Veuillez refaire une demande." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetTokenHash: null, resetTokenExpiry: null },
    });

    logActionFor({ companyId: user.companyId, userId: user.id, user }, "Mot de passe réinitialisé", `${user.name} a réinitialisé son mot de passe.`);

    res.json({ success: true });
  } catch (err) {
    console.error("[POST /api/auth/reset-password]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// ==========================================
// OAuth GOOGLE + SSO (OIDC générique)
// ==========================================
// Modèle de LIAISON DE COMPTE : un login OAuth/SSO ne réussit que si l'email
// vérifié correspond à un utilisateur déjà provisionné (pas d'auto-inscription,
// car en multi-tenant il n'y aurait aucune société à rattacher).

// GET /api/auth/providers — indique au front quels boutons activer.
app.get("/api/auth/providers", (_req, res) => {
  res.json({ google: googleConfigured, sso: ssoConfigured });
});

// GET /api/auth/demo — identifiants du compte démo affichés sur la page de
// connexion (public, comme /api/auth/providers). N'expose rien si masqué. Ne
// bloque jamais la page de connexion en cas d'erreur base.
// ⚠️ Le mot de passe n'est PLUS renvoyé ici (endpoint public) : la page de
// connexion affiche « contactez Samuel » à la place. Le mot de passe reste
// consultable/éditable par un admin via /api/demo-credential (route gated).
app.get("/api/auth/demo", async (_req, res) => {
  try {
    const demo = await prisma.demoCredential.findUnique({ where: { id: "singleton" } });
    if (!demo || !demo.visible) return res.json({ visible: false });
    res.json({ visible: true, email: demo.email });
  } catch (err) {
    console.error("[GET /api/auth/demo]", err);
    res.json({ visible: false });
  }
});

// State anti-CSRF : JWT court-vécu qui lie le provider au cycle OAuth.
const signOAuthState = (provider: string) =>
  jwt.sign({ provider, n: crypto.randomBytes(8).toString("hex") }, JWT_ACCESS_SECRET, { expiresIn: "10m" });

const verifyOAuthState = (state: unknown, provider: string): boolean => {
  try {
    const s = jwt.verify(String(state), JWT_ACCESS_SECRET) as { provider?: string };
    return s.provider === provider;
  } catch {
    return false;
  }
};

// Finalise un login OAuth : retrouve l'utilisateur par email vérifié, pose le
// cookie de session et redirige vers l'app (connectée). Redirige vers le login
// avec un code d'erreur explicite en cas d'échec.
async function completeOAuthLogin(
  res: express.Response,
  p: { email?: string; emailVerified?: boolean | string; name?: string; picture?: string; provider: string },
  meta?: { ip?: string | null; userAgent?: string | null }
) {
  const email = String(p.email ?? "").toLowerCase().trim();
  // Google renvoie email_verified en booléen ; certains IdP en chaîne "true".
  const verified = p.emailVerified === undefined || p.emailVerified === true || p.emailVerified === "true";
  if (!email || !verified) return res.redirect("/?authError=oauth_email");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Aucun compte pour cet email → pas d'auto-inscription.
    return res.redirect("/?authError=compte_introuvable");
  }

  // Récupère la photo de profil du fournisseur si l'utilisateur n'en a pas.
  if (!user.avatarUrl && p.picture) {
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: p.picture } }).catch(() => {});
  }

  const refreshToken = signRefreshToken(user.id);
  setRefreshCookie(res, refreshToken);
  logActionFor({ companyId: user.companyId, userId: user.id, user }, "Connexion", `${user.name} s'est connecté(e) via ${p.provider}.`, meta);
  return res.redirect("/?auth=success");
}

// --- Google ---
app.get("/api/auth/google", (_req, res) => {
  if (!googleConfigured) return res.redirect("/?authError=google_indisponible");
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${BASE_URL}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state: signOAuthState("google"),
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

app.get("/api/auth/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!verifyOAuthState(state, "google")) return res.redirect("/?authError=oauth_state");
    if (!code) return res.redirect("/?authError=oauth_code");

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${BASE_URL}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return res.redirect("/?authError=oauth_token");
    const tokens = (await tokenRes.json()) as { access_token?: string };

    const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) return res.redirect("/?authError=oauth_userinfo");
    const profile = (await profileRes.json()) as any;

    return await completeOAuthLogin(res, {
      email: profile.email,
      emailVerified: profile.email_verified,
      name: profile.name,
      picture: profile.picture,
      provider: "Google",
    }, getClientMeta(req));
  } catch (err) {
    console.error("[GET /api/auth/google/callback]", err);
    return res.redirect("/?authError=oauth_error");
  }
});

// --- SSO (OIDC générique via découverte .well-known) ---
let ssoDiscoveryCache: { authorization_endpoint: string; token_endpoint: string; userinfo_endpoint: string } | null = null;
async function getSsoDiscovery() {
  if (ssoDiscoveryCache) return ssoDiscoveryCache;
  const r = await fetch(`${SSO_ISSUER}/.well-known/openid-configuration`);
  if (!r.ok) throw new Error(`SSO discovery ${r.status}`);
  ssoDiscoveryCache = (await r.json()) as typeof ssoDiscoveryCache;
  return ssoDiscoveryCache!;
}

app.get("/api/auth/sso", async (_req, res) => {
  if (!ssoConfigured) return res.redirect("/?authError=sso_indisponible");
  try {
    const disco = await getSsoDiscovery();
    const params = new URLSearchParams({
      client_id: SSO_CLIENT_ID,
      redirect_uri: `${BASE_URL}/api/auth/sso/callback`,
      response_type: "code",
      scope: "openid email profile",
      state: signOAuthState("sso"),
    });
    res.redirect(`${disco.authorization_endpoint}?${params.toString()}`);
  } catch (err) {
    console.error("[GET /api/auth/sso]", err);
    res.redirect("/?authError=sso_config");
  }
});

app.get("/api/auth/sso/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!verifyOAuthState(state, "sso")) return res.redirect("/?authError=oauth_state");
    if (!code) return res.redirect("/?authError=oauth_code");

    const disco = await getSsoDiscovery();
    const tokenRes = await fetch(disco.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: SSO_CLIENT_ID,
        client_secret: SSO_CLIENT_SECRET,
        redirect_uri: `${BASE_URL}/api/auth/sso/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return res.redirect("/?authError=oauth_token");
    const tokens = (await tokenRes.json()) as { access_token?: string };

    const profileRes = await fetch(disco.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) return res.redirect("/?authError=oauth_userinfo");
    const profile = (await profileRes.json()) as any;

    return await completeOAuthLogin(res, {
      email: profile.email,
      emailVerified: profile.email_verified,
      name: profile.name,
      picture: profile.picture,
      provider: "SSO",
    }, getClientMeta(req));
  } catch (err) {
    console.error("[GET /api/auth/sso/callback]", err);
    return res.redirect("/?authError=oauth_error");
  }
});

// ==========================================
// REST API ENDPOINTS
// ==========================================
// Every route below requires a valid access token (requireAuth).

// Autorisation par rôle. `isCompanyAdmin` (Super admin / Admin) reste codé en
// DUR : il garde l'éditeur de permissions lui-même → un admin ne peut jamais
// se verrouiller dehors en décochant ses propres droits. Les autres barrières
// passent désormais par la matrice éditable `hasPermission` (voir ci-dessous).
const isCompanyAdmin = (role: string) =>
  role === PrismaUserRole.AdminPlateforme || role === PrismaUserRole.AdminEntreprise;

// ==========================================
// PERMISSIONS — grille "Rôles & permissions" (globale, éditable dans Paramètres)
// ==========================================
// Clés d'action stables = lignes de la grille. L'ordre pilote l'affichage.
const PERMISSION_ACTIONS: { key: string; label: string }[] = [
  { key: "dashboard", label: "Tableau de bord & Rapports" },
  { key: "jobs", label: "Offres — créer / éditer / archiver" },
  { key: "candidates", label: "Candidats — ajouter / analyser (IA)" },
  { key: "pipeline", label: "Pipeline, Calendrier & Emails" },
  { key: "ai_search", label: "Recherche IA" },
  { key: "manage_users", label: "Gérer les utilisateurs" },
  { key: "settings", label: "Accès aux Paramètres" },
  { key: "edit_company", label: "Modifier la société / l'application" },
  { key: "connections", label: "Journal des connexions (IP)" },
];
const PERMISSION_ACTION_KEYS = new Set(PERMISSION_ACTIONS.map((a) => a.key));

// Rôles en colonnes, du plus privilégié au moins (clés d'enum Prisma).
const PERMISSION_ROLES: { key: PrismaUserRole; label: string }[] = [
  { key: PrismaUserRole.AdminPlateforme, label: "Super admin" },
  { key: PrismaUserRole.AdminEntreprise, label: "Admin" },
  { key: PrismaUserRole.Manager, label: "Manager" },
  { key: PrismaUserRole.RH, label: "RH" },
  { key: PrismaUserRole.ConsultantRecrutement, label: "Consultant" },
];

// Matrice par défaut (repli si aucune ligne en base). allowed[] aligné sur
// PERMISSION_ROLES : [Super admin, Admin, Manager, RH, Consultant]. Reflète les
// droits historiques codés en dur avant que la grille ne devienne éditable.
const DEFAULT_PERMISSIONS: Record<string, boolean[]> = {
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

const defaultAllowed = (action: string, role: string): boolean => {
  const idx = PERMISSION_ROLES.findIndex((r) => r.key === role);
  const row = DEFAULT_PERMISSIONS[action];
  return idx >= 0 && row ? row[idx] : false;
};

// Cache mémoire : action -> role -> allowed. Rempli au démarrage (loadPermissions)
// et rechargé après chaque modification. Repli sur le défaut si non chargé.
let permissionCache: Record<string, Record<string, boolean>> | null = null;

async function loadPermissions(): Promise<void> {
  const cache: Record<string, Record<string, boolean>> = {};
  for (const { key: action } of PERMISSION_ACTIONS) {
    cache[action] = {};
    for (const { key: role } of PERMISSION_ROLES) cache[action][role] = defaultAllowed(action, role);
  }
  try {
    const rows = await prisma.rolePermission.findMany();
    for (const r of rows) if (cache[r.action]) cache[r.action][r.role] = r.allowed;
  } catch (err) {
    console.error("[loadPermissions] repli sur les défauts:", err);
  }
  permissionCache = cache;
}

// Autorisation effective. Le Super admin (AdminPlateforme) est omnipotent et NON
// éditable → toujours true (garde-fou anti-verrouillage). Les autres rôles lisent
// la matrice (repli sur le défaut tant que le cache n'est pas chargé).
const hasPermission = (role: string, action: string): boolean => {
  if (role === PrismaUserRole.AdminPlateforme) return true;
  const cached = permissionCache?.[action]?.[role];
  return cached !== undefined ? cached : defaultAllowed(action, role);
};

// Sérialise la matrice courante pour l'API : matrix[action][roleKey] = boolean.
const serializeMatrix = (): Record<string, Record<string, boolean>> =>
  Object.fromEntries(
    PERMISSION_ACTIONS.map(({ key: action }) => [
      action,
      Object.fromEntries(PERMISSION_ROLES.map(({ key: role }) => [role, hasPermission(role, action)])),
    ])
  );

// Middleware : exige une permission d'action. À placer APRÈS requireAuth.
const requirePermission = (action: string): express.RequestHandler => (req, res, next) => {
  const ctx = getContext(req);
  if (!hasPermission(ctx.user.role, action)) {
    return res.status(403).json({ error: "Accès refusé. Droit insuffisant pour cette action." });
  }
  next();
};

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

// Mise à jour de la société (nom + nom de l'application). Réservé aux
// administrateurs (plateforme ou entreprise) et à leur propre société.
app.put("/api/companies/:id", requireAuth, async (req, res) => {
  const ctx = getContext(req);
  const { id } = req.params;
  const b = req.body ?? {};
  if (!hasPermission(ctx.user.role, "edit_company")) {
    return res.status(403).json({ error: "Accès refusé. Droit insuffisant." });
  }
  if (id !== ctx.companyId) {
    return res.status(403).json({ error: "Vous ne pouvez modifier que votre propre société." });
  }
  try {
    const data: Prisma.CompanyUpdateInput = {};
    if (b.name !== undefined && String(b.name).trim()) data.name = String(b.name).trim();
    if (b.appName !== undefined) data.appName = String(b.appName).trim() || null;
    const updated = await prisma.company.update({ where: { id }, data });
    logActionFor(ctx, "Mise à jour société", `Paramètres de la société '${updated.name}' mis à jour.`);
    res.json(mapCompany(updated));
  } catch (err) {
    console.error("[PUT /api/companies/:id]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// Grille "Rôles & permissions" (globale). Lecture ouverte à tout utilisateur
// authentifié : le front en a besoin pour piloter la navigation (onglets visibles).
app.get("/api/permissions", requireAuth, (_req, res) => {
  res.json({ actions: PERMISSION_ACTIONS, roles: PERMISSION_ROLES, matrix: serializeMatrix() });
});

// Mise à jour de la grille. Réservé en DUR aux Super admin / Admin (isCompanyAdmin) :
// ce gardien N'EST PAS piloté par la matrice → impossible de se verrouiller dehors.
// La colonne Super admin est ignorée (toujours omnipotent, non éditable).
app.put("/api/permissions", requireAuth, async (req, res) => {
  const ctx = getContext(req);
  if (!isCompanyAdmin(ctx.user.role)) {
    return res.status(403).json({ error: "Accès refusé. Seuls les administrateurs peuvent modifier les permissions." });
  }
  const updates = Array.isArray(req.body?.updates) ? req.body.updates : null;
  if (!updates) {
    return res.status(400).json({ error: "Format invalide : 'updates' (tableau) attendu." });
  }
  // Valide + filtre : action connue, rôle connu, hors Super admin (verrouillé).
  const valid: { action: string; role: PrismaUserRole; allowed: boolean }[] = [];
  for (const u of updates) {
    const action = String(u?.action ?? "");
    const role = String(u?.role ?? "");
    if (!PERMISSION_ACTION_KEYS.has(action)) continue;
    if (!PERMISSION_ROLES.some((r) => r.key === role)) continue;
    if (role === PrismaUserRole.AdminPlateforme) continue; // omnipotent, non éditable
    valid.push({ action, role: role as PrismaUserRole, allowed: Boolean(u?.allowed) });
  }
  try {
    // Transaction interactive (timeout élargi en filet pour un réveil à froid
    // Neon). Le front n'envoie que les cases MODIFIÉES → nombre d'upserts borné.
    await prisma.$transaction(
      async (tx) => {
        for (const v of valid) {
          await tx.rolePermission.upsert({
            where: { action_role: { action: v.action, role: v.role } },
            update: { allowed: v.allowed },
            create: { action: v.action, role: v.role, allowed: v.allowed },
          });
        }
      },
      { timeout: 20000, maxWait: 15000 }
    );
    await loadPermissions();
    logActionFor(ctx, "Mise à jour permissions", `Grille rôles & permissions mise à jour (${valid.length} case(s)).`);
    res.json({ ok: true, matrix: serializeMatrix() });
  } catch (err) {
    console.error("[PUT /api/permissions]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// ── Compte de démonstration (identifiants affichés sur la page de connexion) ──
// Lecture + écriture réservées en DUR aux Super admin / Admin (isCompanyAdmin),
// comme /api/permissions. L'affichage public passe par GET /api/auth/demo.
const DEMO_CREDENTIAL_ID = "singleton";

app.get("/api/demo-credential", requireAuth, async (req, res) => {
  const ctx = getContext(req);
  if (!isCompanyAdmin(ctx.user.role)) {
    return res.status(403).json({ error: "Accès refusé. Seuls les administrateurs peuvent voir le compte de démonstration." });
  }
  try {
    const demo = await prisma.demoCredential.findUnique({ where: { id: DEMO_CREDENTIAL_ID } });
    if (!demo) return res.json({ email: "", password: "", visible: true });
    res.json({ email: demo.email, password: demo.password, visible: demo.visible });
  } catch (err) {
    console.error("[GET /api/demo-credential]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// Met à jour le VRAI compte démo (email + mot de passe hashé bcrypt sur l'user
// ancré) ET la ligne affichée au login. Transaction élargie (filet réveil à
// froid Neon). Refuse un email déjà pris par un autre compte (User.email @unique).
app.put("/api/demo-credential", requireAuth, async (req, res) => {
  const ctx = getContext(req);
  if (!isCompanyAdmin(ctx.user.role)) {
    return res.status(403).json({ error: "Accès refusé. Seuls les administrateurs peuvent modifier le compte de démonstration." });
  }
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const visible = Boolean(req.body?.visible);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Email invalide." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Le mot de passe démo doit contenir au moins 6 caractères." });
  }
  try {
    const demo = await prisma.demoCredential.findUnique({ where: { id: DEMO_CREDENTIAL_ID } });
    if (!demo) return res.status(404).json({ error: "Compte de démonstration introuvable." });
    // Contrainte User.email @unique : refuse un email déjà porté par un AUTRE user.
    const clash = await prisma.user.findUnique({ where: { email } });
    if (clash && clash.id !== demo.userId) {
      return res.status(409).json({ error: "Cet email est déjà utilisé par un autre compte." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.$transaction(
      async (tx) => {
        await tx.user.update({ where: { id: demo.userId }, data: { email, passwordHash } });
        await tx.demoCredential.update({ where: { id: DEMO_CREDENTIAL_ID }, data: { email, password, visible } });
      },
      { timeout: 20000, maxWait: 15000 }
    );
    logActionFor(ctx, "Mise à jour compte démo", `Identifiants du compte de démonstration mis à jour (${email}).`);
    res.json({ email, password, visible });
  } catch (err) {
    console.error("[PUT /api/demo-credential]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

app.get("/api/users", requireAuth, async (req, res) => {
  const ctx = getContext(req);
  // Réservé aux rôles autorisés par la grille (action "manage_users").
  if (!hasPermission(ctx.user.role, "manage_users")) {
    return res.status(403).json({ error: "Accès refusé. Droit insuffisant." });
  }
  try {
    // Isolation multi-entreprise : ne renvoyer que les utilisateurs de la société active.
    const rows = await prisma.user.findMany({ where: { companyId: ctx.companyId }, orderBy: { createdAt: "asc" } });
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
      // La liste des utilisateurs n'est exposée qu'aux rôles autorisés (manage_users).
      allUsers: hasPermission(ctx.user.role, "manage_users") ? allUsers.map(mapUser) : [],
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

// Création d'un utilisateur dans la company active (mot de passe hashé bcrypt).
app.post("/api/users", requireAuth, async (req, res) => {
  const ctx = getContext(req);
  const { companyId } = ctx;

  // Contrôle de rôle piloté par la grille (action "manage_users").
  if (!hasPermission(ctx.user.role, "manage_users")) {
    return res.status(403).json({ error: "Accès refusé. Droit insuffisant pour créer un utilisateur." });
  }

  const b = req.body ?? {};
  const name = String(b.name ?? "").trim();
  const email = String(b.email ?? "").trim();
  const password = String(b.password ?? "");
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nom, email et mot de passe sont requis." });
    }
    // Le front envoie le libellé FR ("Admin entreprise") ou la clé ("AdminEntreprise").
    const prismaRole = toPrismaUserRole(String(b.role ?? ""));
    if (!prismaRole) return res.status(400).json({ error: "Rôle invalide." });

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({
      data: {
        companyId,
        name,
        email,
        role: prismaRole as PrismaUserRole,
        passwordHash,
      },
    });
    logActionFor(ctx, "Ajout d'utilisateur", `Création de l'utilisateur '${created.name}'`);
    // mapUser n'expose jamais passwordHash.
    res.json(mapUser(created));
  } catch (err: any) {
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Un utilisateur avec cet email existe déjà." });
    }
    console.error("[POST /api/users]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// Changement de mot de passe : un utilisateur ne peut modifier que le sien.
app.put("/api/users/:id/password", requireAuth, async (req, res) => {
  const ctx = getContext(req);
  const { id } = req.params;
  const b = req.body ?? {};
  const currentPassword = String(b.currentPassword ?? "");
  const newPassword = String(b.newPassword ?? "");

  if (id !== ctx.userId) {
    return res.status(403).json({ error: "Vous ne pouvez modifier que votre propre mot de passe." });
  }
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Mot de passe actuel et nouveau mot de passe sont requis." });
  }
  try {
    const user = await prisma.user.findFirst({ where: { id, companyId: ctx.companyId } });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) return res.status(401).json({ error: "Mot de passe actuel incorrect." });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
    logActionFor(ctx, "Changement de mot de passe", `Mot de passe mis à jour pour '${user.name}'.`);
    res.json({ success: true });
  } catch (err) {
    console.error("[PUT /api/users/:id/password]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// 2. DASHBOARD KPIS & CHARTS
app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
  const { companyId } = getContext(req);
  try {
    // Agrégations Prisma, toutes scopées au tenant, exécutées en parallèle.
    const [totalJobs, activeJobs, totalCandidates, hiredCandidates, scoreAgg, recentCandidateRows, recentJobRows, sourcingRows, skillRows, expRow] =
      await Promise.all([
        prisma.job.count({ where: { companyId } }),
        prisma.job.count({ where: { companyId, status: JobStatus.Active } }),
        prisma.candidate.count({ where: { companyId } }),
        prisma.candidate.count({ where: { companyId, stage: PrismaPipelineStage.Hired } }),
        prisma.candidateScore.aggregate({ _avg: { globalScore: true }, where: { candidate: { companyId } } }),
        // Widget "Candidats récents" : 5 fiches complètes seulement (pas toute la base).
        prisma.candidate.findMany({ where: { companyId }, include: candidateInclude, orderBy: { appliedAt: "desc" }, take: 5 }),
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
        // Niveau 2 : top 7 compétences EN SQL depuis la table normalisée CandidateSkill
        // (plus besoin de charger tous les candidats ni leur JSON `analysis`).
        prisma.$queryRaw<Array<{ name: string; count: number }>>`
          SELECT s."name" AS name, COUNT(*)::int AS count
          FROM "CandidateSkill" cs
          JOIN "Skill" s ON s."id" = cs."skillId"
          JOIN "Candidate" c ON c."id" = cs."candidateId"
          WHERE c."companyId" = ${companyId}
          GROUP BY s."name"
          ORDER BY count DESC
          LIMIT 7
        `,
        // Niveau 1+2 : répartition par expérience EN SQL via la colonne indexée experienceYears.
        prisma.$queryRaw<Array<{ junior: number; inter: number; senior: number; expert: number }>>`
          SELECT
            COUNT(*) FILTER (WHERE COALESCE("experienceYears", 0) <= 2)::int AS junior,
            COUNT(*) FILTER (WHERE COALESCE("experienceYears", 0) BETWEEN 3 AND 5)::int AS inter,
            COUNT(*) FILTER (WHERE COALESCE("experienceYears", 0) BETWEEN 6 AND 8)::int AS senior,
            COUNT(*) FILTER (WHERE COALESCE("experienceYears", 0) > 8)::int AS expert
          FROM "Candidate"
          WHERE "companyId" = ${companyId}
        `,
      ]);

    const avgMatchingScore = scoreAgg._avg.globalScore != null ? Math.round(scoreAgg._avg.globalScore) : 0;

    const recentCandidates = recentCandidateRows.map(mapCandidate);

    // Sourcing trend : agrégation réelle des candidatures par mois. Si la base
    // est vide (aucune candidature sur 6 mois), fallback = 0 pour les 6 derniers mois.
    const sourcingTrend = sourcingRows.length > 0
      ? sourcingRows.map((r) => ({ name: r.name, candidatures: Number(r.candidatures) }))
      : Array.from({ length: 6 }, (_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - (5 - i));
          return { name: d.toLocaleString("en-US", { month: "short" }), candidatures: 0 };
        });

    // Top 7 compétences (agrégé en SQL — Niveau 2). Number() par sécurité si le
    // driver renvoie un BigInt.
    const skillDistribution = skillRows.map((r) => ({ name: r.name, count: Number(r.count) }));

    // Répartition par expérience (agrégée en SQL — Niveau 1+2), mêmes tranches.
    const e = expRow[0] ?? { junior: 0, inter: 0, senior: 0, expert: 0 };
    const expDistribution = [
      { name: "Junior (0-2 ans)", value: Number(e.junior) },
      { name: "Intermédiaire (3-5 ans)", value: Number(e.inter) },
      { name: "Senior (5-8 ans)", value: Number(e.senior) },
      { name: "Expert (8 ans +)", value: Number(e.expert) },
    ];

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
      recentCandidates,
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
//
// ⚠️ Perf/robustesse : on procède en **3 requêtes constantes** (createMany +
// findMany + createMany) au lieu de 2×N allers-retours (upsert + create par
// compétence). Sur Neon (plan gratuit, connexion parfois froide), une boucle de
// 10-16 round-trips dépassait le timeout de transaction (5 s par défaut) → 500
// "Erreur base de données" à la publication d'une offre.
const replaceJobSkills = async (
  tx: Prisma.TransactionClient,
  jobId: string,
  skillNames: string[]
) => {
  const clean = [...new Set(skillNames.map((s) => s.trim()).filter(Boolean))];
  if (clean.length === 0) return;
  // 1. Insère les compétences encore inconnues (ignore celles déjà au référentiel).
  await tx.skill.createMany({
    data: clean.map((name) => ({ name, category: SkillCategory.Tool })),
    skipDuplicates: true,
  });
  // 2. Récupère les ids (existantes + fraîchement créées).
  const skills = await tx.skill.findMany({
    where: { name: { in: clean } },
    select: { id: true },
  });
  // 3. Crée tous les liens JobSkill d'un coup.
  await tx.jobSkill.createMany({
    data: skills.map((s) => ({ jobId, skillId: s.id, required: true })),
    skipDuplicates: true,
  });
};

// -- Routes --------------------------------------------------------------------

app.get("/api/jobs", requireAuth, async (req, res) => {
  const { companyId } = getContext(req);
  // ?status=Archived pour la vue "Offres archivées" ; ?status=all = tous les
  // statuts ; par défaut (non fourni), on renvoie tout comme avant.
  const statusParam = req.query.status as string | undefined;
  const statusWhere =
    statusParam && statusParam !== "all" && isValidJobStatus(statusParam)
      ? { status: statusParam as JobStatus }
      : {};
  try {
    const rows = await prisma.job.findMany({
      where: { companyId, ...statusWhere },
      include: jobInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json(rows.map(mapJob));
  } catch (err) {
    console.error("[GET /api/jobs]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

app.post("/api/jobs", requireAuth, requirePermission("jobs"), async (req, res) => {
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
          softSkillsRequired: toStringArray(b.softSkillsRequired, ","),
          minExperienceYears: Number(b.minExperienceYears) || 0,
          salaryRange: b.salaryRange || "",
          deadline: b.deadline ? new Date(b.deadline) : null,
          location: b.location || "Télé-travail / Hybride",
          contractType: isValidContractType(b.contractType) ? b.contractType : PrismaContractType.CDI,
          status: JobStatus.Active,
          priority: b.priority || "Normal",
          domain: b.domain === "Autre" ? "Autre" : "IT",
        },
      });
      await replaceJobSkills(tx, created.id, skills);
      return tx.job.findUniqueOrThrow({ where: { id: created.id }, include: jobInclude });
    }, { timeout: 20000, maxWait: 15000 });
    logActionFor(ctx, "Création d'offre", `Création de l'offre '${full.title}'`);
    res.json(mapJob(full));
  } catch (err) {
    console.error("[POST /api/jobs]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

app.put("/api/jobs/:id", requireAuth, requirePermission("jobs"), async (req, res) => {
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
    if (b.softSkillsRequired !== undefined) data.softSkillsRequired = toStringArray(b.softSkillsRequired, ",");
    if (b.minExperienceYears !== undefined) data.minExperienceYears = Number(b.minExperienceYears) || 0;
    if (b.salaryRange !== undefined) data.salaryRange = b.salaryRange;
    if (b.deadline !== undefined) data.deadline = b.deadline ? new Date(b.deadline) : null;
    if (b.location !== undefined) data.location = b.location;
    if (isValidContractType(b.contractType)) data.contractType = b.contractType;
    if (isValidJobStatus(b.status)) data.status = b.status;
    if (b.priority !== undefined) data.priority = b.priority || "Normal";
    if (b.domain !== undefined) data.domain = b.domain === "Autre" ? "Autre" : "IT";

    const full = await prisma.$transaction(async (tx) => {
      await tx.job.update({ where: { id }, data });
      if (b.skillsRequired !== undefined) {
        await tx.jobSkill.deleteMany({ where: { jobId: id } });
        await replaceJobSkills(tx, id, toStringArray(b.skillsRequired, ","));
      }
      return tx.job.findUniqueOrThrow({ where: { id }, include: jobInclude });
    }, { timeout: 20000, maxWait: 15000 });
    logActionFor(ctx, "Mise à jour d'offre", `Modification de l'offre '${full.title}'`);
    res.json(mapJob(full));
  } catch (err) {
    console.error("[PUT /api/jobs/:id]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// Suppression = archivage (soft delete), fidèle au comportement d'origine.
app.delete("/api/jobs/:id", requireAuth, requirePermission("jobs"), async (req, res) => {
  const ctx = getContext(req);
  const { companyId } = ctx;
  const { id } = req.params;
  try {
    const existing = await prisma.job.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ error: "Offre introuvable" });

    // ?permanent=true → suppression réelle (depuis "Offres archivées"). Les
    // candidats liés voient leur jobId passé à null (relation onDelete: SetNull),
    // les JobSkill sont supprimés en cascade. Sinon : archivage (soft delete).
    if ((req.query.permanent as string) === "true") {
      await prisma.job.delete({ where: { id } });
      logActionFor(ctx, "Suppression d'offre", `L'offre '${existing.title}' a été supprimée définitivement.`);
      return res.json({ success: true, id, deleted: true });
    }

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
  // Tri serveur (porte sur toute la base, pas seulement la page courante).
  // "createdAt" est mappé sur appliedAt (le modèle Candidate n'a pas de createdAt).
  const sortOrder = (req.query.sortOrder as string) === "asc" ? "asc" : "desc";
  const sortField = (req.query.sortField as string) || "createdAt";
  const validSortFields: Record<string, Prisma.CandidateOrderByWithRelationInput> = {
    createdAt: { appliedAt: sortOrder },
    name: { name: sortOrder },
    score: { score: { globalScore: sortOrder } },
  };
  const orderBy = validSortFields[sortField] ?? { appliedAt: "desc" };
  // Recherche serveur : porte sur TOUTE la base (pas seulement la page affichée).
  // Sur nom / email / téléphone / localisation, insensible à la casse.
  const search = ((req.query.search as string) || "").trim();
  const where: Prisma.CandidateWhereInput = { companyId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
    ];
  }
  try {
    const [total, rows] = await Promise.all([
      prisma.candidate.count({ where }),
      prisma.candidate.findMany({
        where,
        include: candidateInclude,
        orderBy,
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

// Récupère un candidat par id (ouverture directe d'une fiche même hors page paginée).
app.get("/api/candidates/:id", requireAuth, async (req, res) => {
  const { companyId } = getContext(req);
  const { id } = req.params;
  try {
    const row = await prisma.candidate.findFirst({ where: { id, companyId }, include: candidateInclude });
    if (!row) return res.status(404).json({ error: "Candidat introuvable" });
    res.json(mapCandidate(row));
  } catch (err) {
    console.error("[GET /api/candidates/:id]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

app.post("/api/candidates", requireAuth, requirePermission("candidates"), async (req, res) => {
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

    const letterText = b.letterText || "";
    // Prétention salariale : valeur fournie (normalisée) sinon extraite de la lettre.
    let salaryExpectation: string | null = null;
    if (b.salaryExpectation) {
      salaryExpectation = extractSalaryExpectation(b.salaryExpectation) ?? b.salaryExpectation;
    } else if (letterText) {
      salaryExpectation = extractSalaryExpectation(letterText);
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
        letterText,
        salaryExpectation,
        source: b.source || "Manuel",
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

app.put("/api/candidates/:id/stage", requireAuth, requirePermission("pipeline"), async (req, res) => {
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
app.put("/api/candidates/:id", requireAuth, requirePermission("candidates"), async (req, res) => {
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
    if (b.avatarUrl !== undefined) data.avatarUrl = b.avatarUrl || null;
    if (b.cvText !== undefined) data.cvText = b.cvText;
    if (b.letterText !== undefined) {
      data.letterText = b.letterText;
      // Ré-extraction automatique de la prétention salariale à chaque mise à jour de la lettre.
      data.salaryExpectation = extractSalaryExpectation(b.letterText);
    }
    // Saisie / correction manuelle : prend le pas sur l'extraction auto si fournie
    // explicitement, et est normalisée au passage ("1500000Ar" → "1 500 000 Ar").
    if (b.salaryExpectation !== undefined) {
      data.salaryExpectation = b.salaryExpectation
        ? extractSalaryExpectation(b.salaryExpectation) ?? b.salaryExpectation
        : null;
    }
    if (b.source !== undefined) data.source = b.source || null;

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

// Upload de la photo d'un candidat (fichier image). Sauvegarde locale dans
// /uploads/avatars et renvoie l'URL publique. Le front enchaîne avec un
// PUT /api/candidates/:id pour persister avatarUrl.
app.post("/api/candidates/:id/avatar", requireAuth, requirePermission("candidates"), (req, res) => {
  uploadAvatar.single("avatar")(req, res, async (err: unknown) => {
    if (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : "Upload invalide." });
    }
    const { companyId } = getContext(req);
    const { id } = req.params;
    try {
      const existing = await prisma.candidate.findFirst({ where: { id, companyId } });
      if (!existing) return res.status(404).json({ error: "Candidat introuvable" });
      if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu." });

      // Data URL base64 : persiste dans la fiche (avatarUrl) et s'affiche en prod
      // sans dépendre du disque éphémère de l'hébergeur. Le front enchaîne le PUT.
      const url = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      res.json({ url });
    } catch (e) {
      console.error("[POST /api/candidates/:id/avatar]", e);
      res.status(500).json({ error: "Erreur lors de l'upload." });
    }
  });
});

// Import du CV d'un candidat existant depuis la fiche (PDF ou Word .docx).
// Extrait le texte et le renvoie ; la persistance se fait ensuite via
// PUT /api/candidates/:id (cvText), ce qui met aussi à jour l'état côté front.
const uploadCandidateCv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo max
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isPdf = file.mimetype === "application/pdf" || ext === ".pdf";
    const isDocx =
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      ext === ".docx";
    const isImage = IMAGE_MIME_RE.test(file.mimetype) || IMAGE_EXT_RE.test(ext);
    if (isPdf || isDocx || isImage) return cb(null, true);
    cb(new Error("Le CV doit être au format PDF, Word (.docx) ou image (JPG/PNG)."));
  },
});

app.post("/api/candidates/:id/cv", requireAuth, requirePermission("candidates"), (req, res) => {
  uploadCandidateCv.single("cv")(req, res, async (err: unknown) => {
    if (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : "Upload invalide." });
    }
    const { companyId } = getContext(req);
    const { id } = req.params;
    try {
      const existing = await prisma.candidate.findFirst({ where: { id, companyId } });
      if (!existing) return res.status(404).json({ error: "Candidat introuvable" });
      if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu." });

      let cvText = "";
      try {
        cvText = await extractCvText({
          buffer: req.file.buffer,
          mimetype: req.file.mimetype,
          originalname: req.file.originalname,
        });
      } catch (parseErr) {
        console.error("[candidate cv parse]", parseErr);
        return res.status(400).json({ error: "Impossible de lire le contenu du fichier." });
      }

      res.json({ cvText });
    } catch (e) {
      console.error("[POST /api/candidates/:id/cv]", e);
      res.status(500).json({ error: "Erreur lors de l'import du CV." });
    }
  });
});

// Extraction de texte "à la volée" (sans candidat existant) : utilisé par le
// formulaire "Ajouter un candidat" pour importer le CV (PDF/image) et la lettre
// (PDF/Word) avant que la fiche n'existe. Renvoie { text } ; le front remplit
// ensuite le champ correspondant. Réutilise extractCvText (image OCR/docx/PDF).
app.post("/api/extract-text", requireAuth, requirePermission("candidates"), (req, res) => {
  uploadCandidateCv.single("file")(req, res, async (err: unknown) => {
    if (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : "Upload invalide." });
    }
    try {
      if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu." });
      let text = "";
      try {
        text = await extractCvText({
          buffer: req.file.buffer,
          mimetype: req.file.mimetype,
          originalname: req.file.originalname,
        });
      } catch (parseErr) {
        console.error("[extract-text parse]", parseErr);
        return res.status(400).json({ error: "Impossible de lire le contenu du fichier." });
      }
      res.json({ text });
    } catch (e) {
      console.error("[POST /api/extract-text]", e);
      res.status(500).json({ error: "Erreur lors de l'extraction du texte." });
    }
  });
});

// Suppression DÉFINITIVE (fidèle à l'origine). Cascade : CandidateScore + CandidateSkill.
app.delete("/api/candidates/:id", requireAuth, requirePermission("candidates"), async (req, res) => {
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

// Niveau 2 — normalisation des compétences. Chaque case de analysis.skills est
// mappée sur une catégorie du référentiel Skill, ce qui permet d'agréger le
// "top compétences" du tableau de bord EN SQL (sans charger tous les candidats).
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

// Réécrit la table normalisée CandidateSkill depuis analysis.skills : upsert du
// référentiel Skill (name unique + catégorie) + liens candidat↔compétence.
// Idempotent : on remplace les liens existants du candidat à chaque analyse.
async function syncCandidateSkills(
  tx: Prisma.TransactionClient,
  candidateId: string,
  skillsObj: any,
): Promise<void> {
  await tx.candidateSkill.deleteMany({ where: { candidateId } });
  if (!skillsObj || typeof skillsObj !== "object") return;
  const seen = new Set<string>();
  for (const [key, category] of SKILL_BUCKETS) {
    const list = Array.isArray(skillsObj[key]) ? skillsObj[key] : [];
    for (const raw of list) {
      const name = String(raw).trim();
      if (!name) continue;
      const dedup = name.toLowerCase();
      if (seen.has(dedup)) continue;
      seen.add(dedup);
      const skill = await tx.skill.upsert({
        where: { name },
        update: {},
        create: { name, category },
      });
      await tx.candidateSkill.create({ data: { candidateId, skillId: skill.id } });
    }
  }
}

// Parse and evaluate resume with Gemini!
app.post("/api/candidates/:id/analyze", requireAuth, requirePermission("candidates"), async (req, res) => {
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
      ? `Poste : ${job.title}\nDescription : ${job.description}\nCompétences requises : ${job.skills.map((js) => js.skill.name).join(", ")}${job.softSkillsRequired.length ? `\nSoft skills souhaités : ${job.softSkillsRequired.join(", ")}` : ""}\nExpérience requise : ${job.minExperienceYears} ans`
      : "Poste : Développeur Web Généraliste";

    // Le domaine de l'offre pilote la grille de compétences : IT garde les cases
    // techniques (langages, frameworks…) ; "Autre" ouvre les compétences métier
    // et certifications pour les postes non-informatiques (compta, RH, juridique…).
    const isNonIt = job?.domain === "Autre";
    const skillsInstruction = isNonIt
      ? `- "skills" : { "languages": [], "frameworks": [], "databases": [], "tools": [], "cloud": [], "softSkills": [], "domain": [], "certifications": [] }
     Ce poste N'EST PAS informatique. Utilise EN PRIORITÉ :
       • "domain" pour les compétences métier/sectorielles (ex. comptabilité générale, fiscalité, paie, contrôle de gestion, droit social, gestion administrative…) ;
       • "tools" pour les logiciels et outils maîtrisés (ex. Sage, SAP, Excel, Cegid, EBP…) ;
       • "certifications" pour les diplômes et habilitations professionnels (ex. DSCG, DCG, CACES, TOEIC…) ;
       • "softSkills" pour le savoir-être.
     Laisse "languages", "frameworks", "databases", "cloud" VIDES (ils ne concernent que l'informatique).`
      : `- "skills" : { "languages": [], "frameworks": [], "databases": [], "tools": [], "cloud": [], "softSkills": [], "domain": [], "certifications": [] } (Répartis les compétences techniques extraites du CV dans les cases adéquates ; "domain" et "certifications" restent vides pour un poste informatique)`;

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
   ${skillsInstruction}
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
      model: "gemini-3.5-flash",
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

    // Dénormalise les années d'expérience dans la colonne indexée (Niveau 1) :
    // permet les agrégations/filtres SQL sans relire le JSON analysis.
    const yoe = Number(analysis.yearsOfExperience);
    const experienceYears = Number.isFinite(yoe) ? Math.round(yoe) : null;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.candidate.update({
        where: { id },
        data: {
          analysis,
          recommendation,
          experienceYears,
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
      // Niveau 2 : normalise les compétences dans CandidateSkill (agrégation SQL).
      await syncCandidateSkills(tx, id, analysis.skills);
      return tx.candidate.findUniqueOrThrow({ where: { id }, include: candidateInclude });
    }, { timeout: 20000 });

    logActionFor(ctx, "Analyse IA complète", `Le CV de '${updated.name}' a été analysé avec succès par l'IA. Score global calculé : ${updated.score?.globalScore}/100.`);

    res.json(mapCandidate(updated));
  } catch (error: any) {
    console.error("Gemini Parse Error:", error);
    const transient = aiTransientMessage(error);
    res.status(transient ? 503 : 500).json({ error: transient ?? "Erreur lors de l'analyse du CV par l'IA. Réessayez." });
  }
});

// AI Search candidates using natural language query
app.post("/api/candidates/ai-search", requireAuth, requirePermission("ai_search"), async (req, res) => {
  const ctx = getContext(req);
  const { companyId } = ctx;
  const { query } = req.body;

  if (!query) return res.status(400).json({ error: "Requête vide." });

  try {
    // Option A — "retrieve then rerank" : on PRÉ-FILTRE en SQL pour ne PAS envoyer
    // toute la base au modèle (fenêtre de contexte / coût / qualité se dégradent
    // avec le volume). On borne à MAX_CANDIDATES : d'abord ceux qui matchent les
    // mots-clés de la requête (compétences normalisées CandidateSkill / nom /
    // localisation), complétés par les mieux notés. Gemini ne fait ensuite que le
    // classement fin + l'explication sur cette pré-sélection.
    const MAX_CANDIDATES = 80;
    const STOPWORDS = new Set([
      "avec", "sans", "pour", "dans", "les", "des", "une", "un", "le", "la", "de", "du", "et",
      "ou", "en", "ans", "an", "annee", "annees", "année", "années", "experience", "expérience",
      "candidat", "profil", "cherche", "recherche", "qui", "que", "sur", "par", "plus", "tous",
      "toute", "toutes", "ayant", "type", "poste",
    ]);
    const keywords = [...new Set(
      String(query).toLowerCase()
        .split(/[^a-zà-ÿ0-9+#.]+/i)
        .map((w) => w.trim())
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
    )].slice(0, 8);

    const aiSearchInclude = { score: true, skills: { include: { skill: true } } };

    // 1) Retrieve : candidats correspondant aux mots-clés (plafonné, triés par score).
    const matched = keywords.length
      ? await prisma.candidate.findMany({
          where: {
            companyId,
            OR: keywords.flatMap((kw) => [
              { name: { contains: kw, mode: "insensitive" as const } },
              { location: { contains: kw, mode: "insensitive" as const } },
              { skills: { some: { skill: { name: { contains: kw, mode: "insensitive" as const } } } } },
            ]),
          },
          include: aiSearchInclude,
          orderBy: { score: { globalScore: "desc" } },
          take: MAX_CANDIDATES,
        })
      : [];

    // 2) Complément : si peu de correspondances, on remplit avec les mieux notés
    //    (pour ne pas passer à côté et garder une pré-sélection consistante).
    let rows = matched;
    if (matched.length < MAX_CANDIDATES) {
      const filler = await prisma.candidate.findMany({
        where: { companyId, id: { notIn: matched.map((c) => c.id) } },
        include: aiSearchInclude,
        orderBy: { score: { globalScore: "desc" } },
        take: MAX_CANDIDATES - matched.length,
      });
      rows = [...matched, ...filler];
    }
    const tenantCandidates = rows.map(mapCandidate);

    const serializedCandidates = tenantCandidates.map(c => ({
      id: c.id,
      name: c.name,
      location: c.location,
      stage: c.stage,
      salaryExpectation: c.salaryExpectation || null,
      yearsOfExperience: c.analysis?.yearsOfExperience || 0,
      skills: c.analysis?.skills ? [
        ...(c.analysis.skills.languages || []),
        ...(c.analysis.skills.frameworks || []),
        ...(c.analysis.skills.tools || []),
        ...(c.analysis.skills.cloud || []),
        ...(c.analysis.skills.domain || []),
        ...(c.analysis.skills.certifications || [])
      ] : [],
      scores: c.scores
    }));

    const prompt = `Tu es l'intelligence artificielle de recrutement du système ATS "Nexus Talent System".
Le recruteur formule la recherche naturelle suivante : "${query}"

Voici une pré-sélection de candidats de son entreprise (déjà filtrés en amont, les plus susceptibles de correspondre) en JSON :
${JSON.stringify(serializedCandidates, null, 2)}

Analyse la requête naturelle et sélectionne les candidats pertinents par rapport aux mots-clés, années d'expérience ou exigences décrits dans la requête.
Tu dois renvoyer un objet JSON contenant exactement deux clés :
1. "matchedIds" : un tableau contenant les IDs des candidats qui correspondent le mieux (peut être vide s'il n'y a aucune correspondance).
2. "explanation" : une explication rédigée de manière professionnelle et fluide en français (3-4 phrases) détaillant pourquoi ces profils ont été retenus par rapport à la demande du recruteur, et comment la sélection a été opérée.

Réponds uniquement avec le bloc JSON brut. Pas de markdown.`;

    const response = await callGeminiWithRetry({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    // Parsing robuste : le modèle renvoie parfois le JSON entouré de ```json,
    // ou avec du texte autour. On nettoie et on extrait le 1er objet { ... } ;
    // en dernier recours on renvoie un résultat vide propre (pas une 500).
    let parsedResponse: { matchedIds?: string[]; explanation?: string };
    try {
      const cleaned = (response.text || "{}").trim()
        .replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
      try {
        parsedResponse = JSON.parse(cleaned);
      } catch {
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        if (start === -1 || end <= start) throw new Error("pas d'objet JSON");
        parsedResponse = JSON.parse(cleaned.slice(start, end + 1));
      }
    } catch (parseErr) {
      console.error("[ai-search] réponse IA illisible:", parseErr);
      parsedResponse = { matchedIds: [], explanation: "La recherche n'a pas pu être interprétée. Reformulez votre requête plus simplement." };
    }
    logActionFor(ctx, "Recherche IA", `Recherche naturelle formulée : "${query}". Profils trouvés : ${parsedResponse.matchedIds?.length || 0}`);
    res.json(parsedResponse);
  } catch (error: any) {
    console.error("AI Search Error:", error);
    const transient = aiTransientMessage(error);
    res.status(transient ? 503 : 500).json({ error: transient ?? "Erreur lors de la recherche intelligente. Réessayez." });
  }
});

// Génération d'une offre d'emploi par IA à partir du seul intitulé. Renvoie un
// brouillon structuré (description, missions, compétences, soft skills, langues,
// formation, expérience, contrat, domaine) qui pré-remplit le formulaire ; le
// recruteur garde la main (tout reste éditable). Réutilise Gemini + parse tolérant.
app.post("/api/jobs/generate", requireAuth, requirePermission("jobs"), async (req, res) => {
  const ctx = getContext(req);
  const title = String(req.body?.title ?? "").trim();
  const domainHint = req.body?.domain === "Autre" ? "Autre" : req.body?.domain === "IT" ? "IT" : null;
  if (!title) return res.status(400).json({ error: "Intitulé du poste requis." });
  try {
    const prompt = `Tu es un expert RH qui rédige des offres d'emploi en français.
Génère une offre d'emploi complète et réaliste pour le poste suivant : "${title}".${domainHint ? `\nDomaine indiqué : ${domainHint}.` : ""}

Renvoie UNIQUEMENT un objet JSON valide (aucun markdown) avec EXACTEMENT ces clés :
- "description" : un paragraphe attractif de 3 à 5 phrases présentant le poste, la mission globale et le contexte.
- "missions" : un tableau de 4 à 6 missions principales (phrases courtes, à l'infinitif).
- "skillsRequired" : un tableau de 5 à 8 compétences techniques ou métier attendues (mots/expressions courts).
- "softSkillsRequired" : un tableau de 3 à 5 savoir-être souhaités.
- "languagesRequired" : un tableau de langues au format "Langue (Niveau)" (ex. "Français (Courant)"), ou [] si non pertinent.
- "educationRequired" : le niveau de formation requis (ex. "Bac+5 / Master en informatique").
- "minExperienceYears" : un entier (nombre d'années d'expérience minimum).
- "contractType" : une valeur EXACTE parmi "CDI", "CDD", "Freelance", "Alternance", "Stage".
- "domain" : "IT" si le poste est informatique/technique, sinon "Autre".

Adapte le contenu à l'intitulé. Réponds uniquement avec le JSON brut.`;

    const response = await callGeminiWithRetry({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    let gen: any;
    try {
      gen = parseAiJsonLoose(response.text || "{}");
    } catch (e) {
      console.error("[jobs/generate] réponse IA illisible:", e);
      return res.status(502).json({ error: "L'IA n'a pas renvoyé un résultat exploitable. Réessayez." });
    }

    const asStrArray = (v: unknown) =>
      Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
    const contractType = (Object.values(PrismaContractType) as string[]).includes(gen.contractType)
      ? gen.contractType
      : "CDI";
    const yoe = Number(gen.minExperienceYears);

    logActionFor(ctx, "Génération d'offre IA", `Brouillon d'offre généré par l'IA pour l'intitulé : "${title}".`);
    res.json({
      description: typeof gen.description === "string" ? gen.description : "",
      missions: asStrArray(gen.missions),
      skillsRequired: asStrArray(gen.skillsRequired),
      softSkillsRequired: asStrArray(gen.softSkillsRequired),
      languagesRequired: asStrArray(gen.languagesRequired),
      educationRequired: typeof gen.educationRequired === "string" ? gen.educationRequired : "",
      minExperienceYears: Number.isFinite(yoe) ? Math.max(0, Math.round(yoe)) : 0,
      contractType,
      domain: gen.domain === "Autre" ? "Autre" : "IT",
    });
  } catch (err: any) {
    console.error("[POST /api/jobs/generate]", err);
    const transient = aiTransientMessage(err);
    res.status(transient ? 503 : 500).json({ error: transient ?? "Erreur lors de la génération de l'offre." });
  }
});

// Backfill one-shot : renseigne salaryExpectation pour les candidats existants
// dont la lettre avait été importée avant l'ajout de l'extraction automatique.
// Scopé au tenant courant (isolation multi-tenant) ; réexécutable sans effet de bord.
app.post("/api/admin/backfill-salary-expectations", requireAuth, async (req, res) => {
  const ctx = getContext(req);
  const { companyId } = ctx;
  try {
    const rows = await prisma.candidate.findMany({
      // Cible les valeurs manquantes ET les valeurs mal formatées (sans espace,
      // suffixe collé…) issues d'une extraction antérieure — ex. "1300000Ar".
      where: {
        companyId,
        letterText: { not: null },
        OR: [
          { salaryExpectation: null },
          { salaryExpectation: { not: { contains: " " } } },
        ],
      },
      select: { id: true, name: true, salaryExpectation: true, letterText: true },
    });
    const results: { id: string; name: string; salaryExpectation: string }[] = [];
    for (const c of rows) {
      const salaryExpectation = extractSalaryExpectation(c.letterText || "");
      // On n'écrit que si l'extraction donne un résultat différent de l'existant.
      if (salaryExpectation && salaryExpectation !== c.salaryExpectation) {
        await prisma.candidate.update({ where: { id: c.id }, data: { salaryExpectation } });
        results.push({ id: c.id, name: c.name, salaryExpectation });
      }
    }
    logActionFor(ctx, "Backfill prétention salariale", `${results.length} candidat(s) mis à jour.`);
    res.json({ updated: results.length, results });
  } catch (err) {
    console.error("[POST /api/admin/backfill-salary-expectations]", err);
    res.status(500).json({ error: "Erreur base de données." });
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
app.post("/api/emails/:id/import", requireAuth, requirePermission("pipeline"), async (req, res) => {
  const ctx = getContext(req);
  const { companyId } = ctx;
  const { id } = req.params;
  const b = req.body ?? {};
  try {
    const email = await prisma.email.findFirst({ where: { id, companyId } });
    if (!email) return res.status(404).json({ error: "Email introuvable" });

    // L'expéditeur peut être au format "Nom <email>" (candidatures /postuler) ou
    // une adresse brute (emails de sourcing) → on extrait l'adresse réelle.
    const angle = (email.from || "").match(/<([^>]+)>/);
    const fromEmail = (angle ? angle[1] : email.from || "").trim();

    // Anti-doublon : ne pas recréer un candidat déjà présent (même email, même tenant).
    const existing = await prisma.candidate.findFirst({ where: { email: fromEmail, companyId } });
    if (existing) {
      return res.status(409).json({ error: "Un candidat avec cet email existe déjà.", candidateId: existing.id });
    }

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
          source: "Email",
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
  const ctx = getContext(req);
  const { companyId } = ctx;
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
    // IP et navigateur réservés aux rôles autorisés (action "connections") ; masqués sinon.
    const canSeeIp = hasPermission(ctx.user.role, "connections");
    const mapped = rows.map(mapAuditLog).map((r) => (canSeeIp ? r : { ...r, ip: null, userAgent: null }));
    res.json(paginated(mapped, total, page, limit));
  } catch (err) {
    console.error("[GET /api/audit-logs]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// Création d'une entrée d'audit depuis le front (traçage d'actions métier :
// planification d'entretien, partage de profil…). Écriture attendue (await).
app.post("/api/audit-logs", requireAuth, async (req, res) => {
  const ctx = getContext(req);
  const b = req.body ?? {};
  const action = String(b.action ?? "").trim();
  const details = String(b.details ?? "").trim();
  console.log("[audit-log]", { action, details });
  if (!action || !details) {
    return res.status(400).json({ error: "Les champs action et details sont requis." });
  }
  try {
    const userRole = (ctx.user ? toPrismaUserRole(ctx.user.role) : undefined) ?? PrismaUserRole.RH;
    const created = await prisma.auditLog.create({
      data: {
        companyId: ctx.companyId,
        userId: ctx.userId || null,
        userName: ctx.user ? ctx.user.name : "Système",
        userRole: userRole as PrismaUserRole,
        action,
        details,
      },
    });

    // Emails de partage (best-effort, ne bloque jamais la réponse).
    // Pipeline : "Pipeline (...) partagé à email. Message : ..."
    // Profil   : "Profil de {nom} partagé à email — message"
    if (action === "Pipeline partagé" || action === "Partage de profil") {
      // Extraction de l'email : "…partagé à email…" en priorité, sinon toute
      // adresse trouvée dans les details (robuste aux variations de format).
      const toEmail =
        details.match(/partagé à\s+([\w.+-]+@[\w.-]+\.[a-z]{2,})/i)?.[1] ||
        details.match(/([\w.+-]+@[\w.-]+\.[a-z]{2,})/i)?.[1];
      console.log("[email-share] toEmail extrait :", toEmail);
      if (toEmail) {
        const company = await prisma.company.findUnique({ where: { id: ctx.companyId }, select: { name: true, appName: true } });
        const appName = company?.appName || "Nexus Talent";
        const notes = (details.match(/Message\s*:\s*(.+)$/i) || details.match(/\s—\s(.+)$/))?.[1]?.trim();
        if (action === "Pipeline partagé") {
          await sendEmail({
            to: toEmail,
            subject: `${appName} — Pipeline de recrutement partagé`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:auto">
                <h2 style="color:#0f172a">${appName}</h2>
                <p>Bonjour,</p>
                <p>Le pipeline de recrutement de <strong>${company?.name ?? ""}</strong> vous a été partagé.</p>
                ${notes ? `<p><em>"${notes}"</em></p>` : ""}
                <p>Connectez-vous à la plateforme pour consulter les candidats.</p>
                <hr/>
                <p style="color:#64748b;font-size:12px">Cet email a été envoyé depuis ${appName}.</p>
              </div>`,
          });
        } else {
          const candidatName = details.match(/Profil de\s+(.+?)\s+partagé à/i)?.[1] || "un candidat";
          await sendEmail({
            to: toEmail,
            subject: `${appName} — Profil candidat partagé : ${candidatName}`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:auto">
                <h2 style="color:#0f172a">${appName}</h2>
                <p>Bonjour,</p>
                <p>Le profil de <strong>${candidatName}</strong> vous a été partagé par l'équipe RH de <strong>${company?.name ?? ""}</strong>.</p>
                ${notes ? `<p>Message : <em>"${notes}"</em></p>` : ""}
                <p>Connectez-vous à la plateforme pour consulter ce profil.</p>
                <hr/>
                <p style="color:#64748b;font-size:12px">Cet email a été envoyé depuis ${appName}.</p>
              </div>`,
          });
        }
      }
    }

    res.json(mapAuditLog(created));
  } catch (err) {
    console.error("[POST /api/audit-logs]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// Entonnoir de recrutement : nombre de candidats par stage (scopé tenant).
app.get("/api/reports/funnel", requireAuth, async (req, res) => {
  const { companyId } = getContext(req);
  try {
    const grouped = await prisma.candidate.groupBy({
      by: ["stage"],
      where: { companyId },
      _count: { _all: true },
    });
    const countByStage = new Map<string, number>();
    for (const g of grouped) countByStage.set(g.stage, g._count._all);
    // Ordre du pipeline = ordre de déclaration de l'enum Prisma ; libellé FR via mapPipelineStage.
    const funnel = Object.values(PrismaPipelineStage).map((stage) => ({
      stage: mapPipelineStage(stage),
      count: countByStage.get(stage) ?? 0,
    }));
    res.json({ funnel });
  } catch (err) {
    console.error("[GET /api/reports/funnel]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// Canaux de sourcing réels : répartition des candidats par champ "source".
app.get("/api/reports/sourcing", requireAuth, async (req, res) => {
  const { companyId } = getContext(req);
  try {
    const grouped = await prisma.candidate.groupBy({
      by: ["source"],
      where: { companyId },
      _count: { _all: true },
    });
    const channels = grouped
      .map((g) => ({ source: g.source ?? "Non précisé", count: g._count._all }))
      .sort((a, b) => b.count - a.count);
    res.json({ channels });
  } catch (err) {
    console.error("[GET /api/reports/sourcing]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// ==========================================
// INTERVIEWS (entretiens planifiés)
// ==========================================
app.post("/api/interviews", requireAuth, requirePermission("pipeline"), async (req, res) => {
  const ctx = getContext(req);
  const { companyId, userId } = ctx;
  const b = req.body ?? {};
  const candidateId = String(b.candidateId ?? "").trim();
  const date = String(b.date ?? "").trim();
  const time = String(b.time ?? "").trim();
  const type = String(b.type ?? "RH").trim();
  if (!candidateId || !date || !time) {
    return res.status(400).json({ error: "candidateId, date et time sont requis." });
  }
  try {
    const cand = await prisma.candidate.findFirst({ where: { id: candidateId, companyId }, select: { id: true } });
    if (!cand) return res.status(404).json({ error: "Candidat introuvable." });

    const interview = await prisma.interview.create({
      data: { companyId, candidateId, jobId: b.jobId || null, date, time, type, notes: b.notes || null, createdBy: userId || null },
    });
    logActionFor(ctx, "Entretien planifié", `Entretien ${type} planifié le ${date} à ${time}${b.notes ? " — " + b.notes : ""}`);
    res.json(interview);
  } catch (err) {
    console.error("[POST /api/interviews]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

app.get("/api/interviews", requireAuth, async (req, res) => {
  const { companyId } = getContext(req);
  const candidateId = req.query.candidateId as string | undefined;
  try {
    const where: Prisma.InterviewWhereInput = { companyId };
    if (candidateId) where.candidateId = candidateId;
    const rows = await prisma.interview.findMany({
      where,
      orderBy: [{ date: "asc" }, { time: "asc" }],
      include: { candidate: { select: { name: true, job: { select: { title: true } } } } },
    });
    // Aplati candidate.job.title → jobTitle (le front attend candidate.jobTitle).
    const interviews = rows.map((iv) => ({
      id: iv.id,
      candidateId: iv.candidateId,
      jobId: iv.jobId ?? undefined,
      date: iv.date,
      time: iv.time,
      type: iv.type,
      notes: iv.notes ?? undefined,
      createdAt: iv.createdAt.toISOString(),
      candidate: { name: iv.candidate.name, jobTitle: iv.candidate.job?.title ?? undefined },
    }));
    res.json(interviews);
  } catch (err) {
    console.error("[GET /api/interviews]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

app.delete("/api/interviews/:id", requireAuth, requirePermission("pipeline"), async (req, res) => {
  const ctx = getContext(req);
  const { companyId } = ctx;
  const { id } = req.params;
  try {
    const existing = await prisma.interview.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ error: "Entretien introuvable." });
    await prisma.interview.delete({ where: { id } });
    logActionFor(ctx, "Entretien annulé", `Entretien du ${existing.date} à ${existing.time} annulé.`);
    res.json({ success: true, id });
  } catch (err) {
    console.error("[DELETE /api/interviews/:id]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// Envoi d'un email au candidat depuis sa fiche (via Resend, best-effort).
app.post("/api/candidates/:id/send-email", requireAuth, requirePermission("pipeline"), async (req, res) => {
  const ctx = getContext(req);
  const { companyId } = ctx;
  const b = req.body ?? {};
  const subject = String(b.subject ?? "").trim();
  const body = String(b.body ?? "");
  if (!subject) return res.status(400).json({ error: "Le sujet est requis." });
  try {
    const candidate = await prisma.candidate.findFirst({
      where: { id: req.params.id, companyId },
      include: { job: { select: { title: true } } },
    });
    if (!candidate) return res.status(404).json({ error: "Candidat introuvable." });
    if (!candidate.email) return res.status(400).json({ error: "Ce candidat n'a pas d'adresse email." });

    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true, appName: true } });
    const appName = company?.appName || "Nexus Talent";

    await sendEmail({
      to: candidate.email,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#1A2744">${appName}</h2>
          <p>Bonjour <strong>${candidate.name}</strong>,</p>
          ${body}
          <hr/>
          <p style="color:#64748b;font-size:12px">Ce message a été envoyé par ${company?.name ?? appName} via ${appName}.</p>
        </div>`,
    });

    logActionFor(ctx, "Email envoyé", `Email "${subject}" envoyé à ${candidate.name} (${candidate.email})`);
    res.json({ success: true });
  } catch (err) {
    console.error("[POST /api/candidates/:id/send-email]", err);
    res.status(500).json({ error: "Erreur lors de l'envoi." });
  }
});

// ==========================================
// 8. PUBLIC APPLICATION (candidature en ligne, sans authentification)
// ==========================================
// Les fichiers reçus (CV, lettre, photo) sont traités EN MÉMOIRE : le CV/lettre
// sont extraits en texte, la photo encodée en base64 — rien n'est écrit sur le
// disque éphémère de l'hébergeur.
const uploadCv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo max
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isPdf = file.mimetype === "application/pdf" || ext === ".pdf";
    const isDocx =
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      ext === ".docx";
    const isImage = IMAGE_MIME_RE.test(file.mimetype) || IMAGE_EXT_RE.test(ext);
    // Le CV accepte PDF ou image (JPG/PNG, lue par OCR). La lettre : PDF ou Word.
    // La photo de profil : image uniquement.
    if (file.fieldname === "cv") {
      return isPdf || isImage
        ? cb(null, true)
        : cb(new Error("Le CV doit être au format PDF ou image (JPG/PNG)."));
    }
    if (file.fieldname === "letter") {
      return isPdf || isDocx
        ? cb(null, true)
        : cb(new Error("La lettre de motivation doit être au format PDF ou Word (.docx)."));
    }
    if (file.fieldname === "photo") {
      return isImage ? cb(null, true) : cb(new Error("La photo doit être une image (JPG/PNG)."));
    }
    cb(new Error("Champ de fichier inattendu."));
  },
});

// GET /api/public/jobs — offres actives visibles publiquement (sans données sensibles).
app.get("/api/public/jobs", async (req, res) => {
  try {
    const rows = await prisma.job.findMany({
      where: { status: JobStatus.Active },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, location: true, contractType: true, companyId: true },
    });
    res.json(rows);
  } catch (err) {
    console.error("[GET /api/public/jobs]", err);
    res.status(500).json({ error: "Erreur base de données." });
  }
});

// POST /api/public/apply — candidature en ligne avec upload de CV (PDF).
app.post("/api/public/apply", (req, res) => {
  uploadCv.fields([
    { name: "cv", maxCount: 1 },
    { name: "letter", maxCount: 1 },
    { name: "photo", maxCount: 1 },
  ])(req, res, async (err: unknown) => {
    if (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : "Upload invalide." });
    }
    const b = req.body ?? {};
    const name = String(b.name ?? "").trim();
    const email = String(b.email ?? "").trim();
    const jobId = String(b.jobId ?? "").trim();

    const cvFile = (req.files as any)?.["cv"]?.[0];
    const letterFile = (req.files as any)?.["letter"]?.[0];
    const photoFile = (req.files as any)?.["photo"]?.[0];

    if (!name || !email || !jobId) {
      return res.status(400).json({ error: "Nom, email et offre sont requis." });
    }
    if (!cvFile) {
      return res.status(400).json({ error: "Le CV (PDF) est requis." });
    }

    try {
      const job = await prisma.job.findFirst({ where: { id: jobId, status: JobStatus.Active } });
      if (!job) return res.status(404).json({ error: "Offre introuvable ou inactive." });

      // CV : PDF (pdf-parse) ou image JPG/PNG (OCR Gemini), via le helper partagé.
      let cvText = "";
      try {
        cvText = await extractCvText({
          buffer: cvFile.buffer,
          mimetype: cvFile.mimetype,
          originalname: cvFile.originalname,
        });
      } catch (parseErr) {
        console.error("[apply cv parse]", parseErr);
        return res.status(400).json({ error: "Impossible de lire le contenu du CV." });
      }

      // Lettre de motivation optionnelle : PDF (pdf-parse) ou Word .docx (mammoth).
      // Si l'extraction échoue, on n'interrompt pas la candidature.
      let letterText = "";
      if (letterFile) {
        try {
          letterText = await extractCvText({
            buffer: letterFile.buffer,
            mimetype: letterFile.mimetype,
            originalname: letterFile.originalname,
          });
        } catch (parseErr) {
          console.error("[letter parse]", parseErr);
        }
      }

      // Photo de profil optionnelle : encodée en base64 (data URL) et persistée
      // dans avatarUrl. Ignorée si > 2 Mo (le front valide déjà côté client).
      let avatarUrl: string | null = null;
      if (photoFile) {
        if (photoFile.size <= MAX_PHOTO_BYTES) {
          avatarUrl = `data:${photoFile.mimetype};base64,${photoFile.buffer.toString("base64")}`;
        } else {
          console.warn("[apply] photo ignorée (> 2 Mo)");
        }
      }

      const salaryExpectation = extractSalaryExpectation(letterText);

      const created = await prisma.candidate.create({
        data: {
          companyId: job.companyId,
          jobId: job.id,
          name,
          email,
          phone: String(b.phone ?? ""),
          location: String(b.location ?? "Non spécifiée"),
          linkedinUrl: b.linkedinUrl || null,
          avatarUrl,
          stage: PrismaPipelineStage.Received,
          cvText,
          letterText,
          salaryExpectation,
          source: "/postuler",
        },
      });

      // Trace la candidature dans la boîte de réception (module Emails) pour
      // qu'elle y soit visible. Statut "Pending" comme les emails de seed :
      // GET /api/emails ne filtre pas par statut, l'email apparaît donc en tête
      // (orderBy date desc). L'échec de cette création est loggé mais ne fait
      // pas échouer la candidature (le candidat, lui, est déjà enregistré).
      try {
        const createdEmail = await prisma.email.create({
          data: {
            companyId: job.companyId,
            from: `${name} <${email}>`,
            subject: `Candidature — ${job.title}`,
            body: `Nouvelle candidature reçue de ${name} pour le poste "${job.title}".\n\nPrétention salariale : ${created.salaryExpectation ?? "non renseignée"}\n\nExtrait CV :\n${cvText.slice(0, 500)}`,
            date: new Date(),
            status: EmailStatus.Pending,
          },
        });
        console.log(`[public/apply] Email de candidature créé: ${createdEmail.id} (candidat ${created.id}, company ${job.companyId})`);
      } catch (mailErr) {
        console.error("[public/apply] Échec création email de candidature:", mailErr);
      }

      logActionFor(
        { companyId: job.companyId, userId: "" },
        "Candidature en ligne",
        `Nouvelle candidature reçue de '${name}' pour l'offre '${job.title}'.`
      );

      // Emails transactionnels (best-effort). Confirmation au candidat +
      // notification aux recruteurs/admins de la company.
      const company = await prisma.company.findUnique({
        where: { id: job.companyId },
        select: { name: true, appName: true },
      });
      const appName = company?.appName || "Nexus Talent";

      // Recruteurs/admins de la company à notifier (requête avant l'envoi parallèle).
      const recruiters = await prisma.user.findMany({
        where: {
          companyId: job.companyId,
          role: { in: [PrismaUserRole.AdminEntreprise, PrismaUserRole.RH, PrismaUserRole.Manager, PrismaUserRole.ConsultantRecrutement] },
        },
        select: { email: true, name: true },
      });

      // Tous les emails partent en parallèle → latence = le plus lent (et non la
      // somme). sendEmail avale ses erreurs, donc aucun envoi ne rejette Promise.all.
      const sentDate = new Date().toLocaleDateString("fr-FR");
      await Promise.all([
        // 3. Confirmation au candidat.
        sendEmail({
          to: email,
          subject: `${company?.name ?? appName} — Candidature reçue pour "${job.title}"`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:auto">
              <h2 style="color:#0f172a">${appName}</h2>
              <p>Bonjour <strong>${name}</strong>,</p>
              <p>Nous avons bien reçu votre candidature pour le poste de <strong>${job.title}</strong> chez <strong>${company?.name ?? ""}</strong>.</p>
              <p>Notre équipe RH examinera votre dossier et vous recontactera dans les meilleurs délais.</p>
              <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0">
                <p style="margin:0;font-size:13px;color:#64748b">
                  <strong>Récapitulatif :</strong><br/>
                  Poste : ${job.title}<br/>
                  Entreprise : ${company?.name ?? ""}<br/>
                  Date : ${sentDate}
                </p>
              </div>
              <p>Cordialement,<br/>L'équipe ${company?.name ?? ""}</p>
              <hr/>
              <p style="color:#64748b;font-size:12px">Vous recevez cet email car vous avez postulé via ${appName}.</p>
            </div>`,
        }),
        // 4. Notification à chaque recruteur/admin.
        ...recruiters.map(recruiter => sendEmail({
          to: recruiter.email,
          subject: `${appName} — Nouvelle candidature : ${name} pour "${job.title}"`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:auto">
              <h2 style="color:#0f172a">${appName}</h2>
              <p>Bonjour <strong>${recruiter.name}</strong>,</p>
              <p>Une nouvelle candidature vient d'être reçue :</p>
              <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0">
                <p style="margin:0;font-size:13px;color:#0f172a">
                  <strong>Candidat :</strong> ${name}<br/>
                  <strong>Email :</strong> ${email}<br/>
                  <strong>Téléphone :</strong> ${b.phone || "Non renseigné"}<br/>
                  <strong>Poste :</strong> ${job.title}<br/>
                  <strong>Prétention salariale :</strong> ${created.salaryExpectation || "Non renseignée"}<br/>
                  <strong>Date :</strong> ${sentDate}
                </p>
              </div>
              <p>Connectez-vous à ${appName} pour consulter le dossier complet.</p>
              <hr/>
              <p style="color:#64748b;font-size:12px">Notification automatique ${appName}.</p>
            </div>`,
        })),
      ]);

      res.json({ success: true, candidateId: created.id });
    } catch (e) {
      console.error("[POST /api/public/apply]", e);
      res.status(500).json({ error: "Erreur lors de l'enregistrement de la candidature." });
    }
  });
});

// ==========================================
// VITE INTEGRATION / SERVER LISTEN
// ==========================================

async function startServer() {
  // Charge la matrice de permissions en cache dès le démarrage (repli sur les
  // défauts si la table est vide/injoignable). Rechargée après chaque édition.
  await loadPermissions();

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

  // Filet d'erreur Express, enregistré en dernier (après toutes les routes).
  app.use(errorHandler);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Nexus Server] running on http://localhost:${PORT}`);
  });
}

startServer();
