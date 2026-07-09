/* Applique des changements ponctuels de données sur la base pointée par
   DATABASE_URL (locale OU production Neon) :
     1. Supprime les utilisateurs de démo Sarah Jenkins et Marc Antoine.
        (AuditLog.userId est onDelete:SetNull → leurs logs sont conservés, détachés.)
     2. Uniformise le salaire de TOUTES les offres à "3 000 000 Ariary".
   Idempotent : peut être relancé sans effet de bord.
   Usage :  node scripts/apply-data-changes.cjs
   Prod  :  définir DATABASE_URL (chaîne Neon) avant de lancer. */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const SALARY = "3 000 000 Ariary";
const USERS_TO_DELETE = ["user-sarah", "user-marc"];

(async () => {
  // 1. Suppression des utilisateurs de démo.
  const del = await prisma.user.deleteMany({ where: { id: { in: USERS_TO_DELETE } } });
  console.log(`Utilisateurs supprimés : ${del.count} (${USERS_TO_DELETE.join(", ")})`);

  // 2. Uniformisation des salaires.
  const upd = await prisma.job.updateMany({ data: { salaryRange: SALARY } });
  console.log(`Offres mises à jour (salaire = "${SALARY}") : ${upd.count}`);

  console.log("✅ Changements appliqués.");
})()
  .catch((e) => { console.error("❌ Échec :", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
