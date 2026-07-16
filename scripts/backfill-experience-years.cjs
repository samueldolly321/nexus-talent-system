/* Backfill de Candidate.experienceYears (Niveau 1).
 *
 * Recopie analysis.yearsOfExperience (JSON) vers la vraie colonne indexée
 * experienceYears pour les candidats DÉJÀ analysés (nouvelles analyses : la
 * colonne est renseignée automatiquement par POST /api/candidates/:id/analyze).
 *
 * Idempotent : ne touche QUE les lignes où experienceYears est encore NULL et
 * dont le JSON contient un entier valide. Peut être relancé sans risque.
 *
 * Prérequis : la migration add_candidate_experience_years doit être appliquée
 * (colonne présente) et DATABASE_URL doit pointer sur la base cible.
 *
 * Usage :
 *   node scripts/backfill-experience-years.cjs
 */
try { require("dotenv").config(); } catch { /* dotenv optionnel : DATABASE_URL peut venir de l'environnement */ }
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL manquant (renseignez-le dans .env ou l'environnement).");
    process.exit(1);
  }
  try {
    // Un seul UPDATE SQL : extrait l'entier du JSON, uniquement là où c'est pertinent.
    const affected = await prisma.$executeRawUnsafe(`
      UPDATE "Candidate"
      SET "experienceYears" = (("analysis"->>'yearsOfExperience'))::int
      WHERE "experienceYears" IS NULL
        AND "analysis" IS NOT NULL
        AND ("analysis"->>'yearsOfExperience') ~ '^[0-9]+$'
    `);
    console.log(`Backfill terminé : ${affected} candidat(s) mis à jour.`);
  } catch (e) {
    console.error("Échec du backfill :", e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
