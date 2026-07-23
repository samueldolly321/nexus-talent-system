-- CreateTable
CREATE TABLE "RolePermission" (
    "action" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("action","role")
);
