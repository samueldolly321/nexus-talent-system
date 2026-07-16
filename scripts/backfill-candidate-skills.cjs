/* Backfill de la table normalisée CandidateSkill (Niveau 2).
 *
 * Recopie analysis.skills (JSON) vers la table CandidateSkill (+ référentiel
 * Skill) pour les candidats DÉJÀ analysés. Les nouvelles analyses remplissent
 * la table automatiquement (POST /api/candidates/:id/analyze).
 *
 * Idempotent : ne traite QUE les candidats qui n'ont ENCORE aucun lien de
 * compétence (les candidats du seed en ont déjà). Relançable sans risque.
 *
 * Prérequis : DATABASE_URL doit pointer sur la base cible.
 *
 * Usage :
 *   node scripts/backfill-candidate-skills.cjs
 */
try { require("dotenv").config(); } catch { /* dotenv optionnel */ }
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Mêmes buckets que server.ts (analysis.skills → catégorie du référentiel).
const SKILL_BUCKETS = [
  ["languages", "Language"],
  ["frameworks", "Framework"],
  ["databases", "Database"],
  ["tools", "Tool"],
  ["cloud", "Cloud"],
  ["softSkills", "SoftSkill"],
  ["domain", "Domain"],
  ["certifications", "Certification"],
];

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL manquant (renseignez-le dans .env ou l'environnement).");
    process.exit(1);
  }
  try {
    const candidates = await prisma.candidate.findMany({
      where: { analysis: { not: null } },
      select: { id: true, analysis: true },
    });

    let processed = 0;
    let linksCreated = 0;
    for (const c of candidates) {
      // On saute ceux qui ont déjà des liens (seed / analyse récente) : idempotent.
      const existing = await prisma.candidateSkill.count({ where: { candidateId: c.id } });
      if (existing > 0) continue;

      const skillsObj = c.analysis && typeof c.analysis === "object" ? c.analysis.skills : null;
      if (!skillsObj || typeof skillsObj !== "object") continue;

      const seen = new Set();
      for (const [key, category] of SKILL_BUCKETS) {
        const list = Array.isArray(skillsObj[key]) ? skillsObj[key] : [];
        for (const raw of list) {
          const name = String(raw).trim();
          if (!name) continue;
          const dedup = name.toLowerCase();
          if (seen.has(dedup)) continue;
          seen.add(dedup);
          const skill = await prisma.skill.upsert({
            where: { name },
            update: {},
            create: { name, category },
          });
          await prisma.candidateSkill.create({ data: { candidateId: c.id, skillId: skill.id } });
          linksCreated++;
        }
      }
      processed++;
    }
    console.log(`Backfill terminé : ${processed} candidat(s) traités, ${linksCreated} lien(s) de compétence créés.`);
  } catch (e) {
    console.error("Échec du backfill :", e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
