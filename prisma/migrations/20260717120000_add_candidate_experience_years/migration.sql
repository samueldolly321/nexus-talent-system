-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "experienceYears" INTEGER;

-- CreateIndex
CREATE INDEX "Candidate_experienceYears_idx" ON "Candidate"("experienceYears");
