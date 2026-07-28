-- CreateTable
CREATE TABLE "DemoCredential" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoCredential_pkey" PRIMARY KEY ("id")
);
