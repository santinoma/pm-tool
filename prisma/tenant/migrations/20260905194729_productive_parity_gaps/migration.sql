-- CreateEnum
CREATE TYPE "PurchaseOrderSentStatus" AS ENUM ('not_sent', 'sent');

-- CreateEnum
CREATE TYPE "PurchaseOrderPaymentStatus" AS ENUM ('not_received', 'partially_received', 'fully_received');

-- CreateEnum
CREATE TYPE "ExpenseApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterEnum (PurchaseOrderStatus: draft/sent/received/cancelled -> draft/finalized/cancelled)
CREATE TYPE "PurchaseOrderStatus_new" AS ENUM ('draft', 'finalized', 'cancelled');
ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" TYPE "PurchaseOrderStatus_new" USING (
  CASE "status"::text
    WHEN 'sent' THEN 'finalized'
    WHEN 'received' THEN 'finalized'
    ELSE "status"::text
  END
)::"PurchaseOrderStatus_new";
ALTER TYPE "PurchaseOrderStatus" RENAME TO "PurchaseOrderStatus_old";
ALTER TYPE "PurchaseOrderStatus_new" RENAME TO "PurchaseOrderStatus";
DROP TYPE "PurchaseOrderStatus_old";
ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" SET DEFAULT 'draft';

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN "sentStatus" "PurchaseOrderSentStatus" NOT NULL DEFAULT 'not_sent';
ALTER TABLE "PurchaseOrder" ADD COLUMN "paymentStatus" "PurchaseOrderPaymentStatus" NOT NULL DEFAULT 'not_received';

-- AlterTable
ALTER TABLE "WikiPage" ADD COLUMN "createdById" TEXT;
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "timeApprovalRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "expenseApprovalRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateSequence + AlterTable
CREATE SEQUENCE IF NOT EXISTS "Expense_number_seq";
ALTER TABLE "Expense" ADD COLUMN "number" INTEGER NOT NULL DEFAULT nextval('"Expense_number_seq"');
ALTER SEQUENCE "Expense_number_seq" OWNED BY "Expense"."number";
ALTER TABLE "Expense" ADD COLUMN "serviceTypeId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "billable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Expense" ADD COLUMN "approvalStatus" "ExpenseApprovalStatus" NOT NULL DEFAULT 'pending';
ALTER TABLE "Expense" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "Expense" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
