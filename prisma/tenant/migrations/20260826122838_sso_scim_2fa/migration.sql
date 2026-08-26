-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN     "require2fa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scimBearerToken" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totpSecret" TEXT;

-- CreateTable
CREATE TABLE "PendingLogin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingLogin_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PendingLogin" ADD CONSTRAINT "PendingLogin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
