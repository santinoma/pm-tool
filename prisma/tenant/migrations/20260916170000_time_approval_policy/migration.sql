-- Configurable, per-budget Time (and Expense) Approval Policy, matching
-- Productive's real model: an org-level "Time Approval" toggle, and named,
-- reusable approver policies (budget owner / project manager / submitter's
-- manager / a specific person, with an any-of/all-of/no-approval-needed
-- mode) assignable to budgets. Purely additive: a budget with no policy
-- assigned keeps today's behavior (any owner/admin can approve, single
-- decision), and the org-level toggle defaults to true so nothing changes
-- for existing tenants until an admin actually configures a policy.

-- CreateEnum
CREATE TYPE "ApprovalMode" AS ENUM ('any', 'all', 'none');
CREATE TYPE "ApproverRoleType" AS ENUM ('budget_owner', 'project_manager', 'submitter_manager', 'specific_person');
CREATE TYPE "ApprovalKind" AS ENUM ('time', 'expense');
CREATE TYPE "ApprovalDecisionStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN "timeApprovalEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Budget" ADD COLUMN "approvalPolicyId" TEXT;

-- CreateTable
CREATE TABLE "ApprovalPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "timeApprovalMode" "ApprovalMode" NOT NULL DEFAULT 'any',
    "expenseApprovalMode" "ApprovalMode" NOT NULL DEFAULT 'any',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovalPolicyApprover" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "kind" "ApprovalKind" NOT NULL,
    "roleType" "ApproverRoleType" NOT NULL,
    "specificUserId" TEXT,

    CONSTRAINT "ApprovalPolicyApprover_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeEntryApproverDecision" (
    "id" TEXT NOT NULL,
    "timeEntryId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" "ApprovalDecisionStatus" NOT NULL DEFAULT 'pending',
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeEntryApproverDecision_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_approvalPolicyId_fkey" FOREIGN KEY ("approvalPolicyId") REFERENCES "ApprovalPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalPolicyApprover" ADD CONSTRAINT "ApprovalPolicyApprover_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ApprovalPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalPolicyApprover" ADD CONSTRAINT "ApprovalPolicyApprover_specificUserId_fkey" FOREIGN KEY ("specificUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeEntryApproverDecision" ADD CONSTRAINT "TimeEntryApproverDecision_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeEntryApproverDecision" ADD CONSTRAINT "TimeEntryApproverDecision_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntryApproverDecision_timeEntryId_approverId_key" ON "TimeEntryApproverDecision"("timeEntryId", "approverId");
CREATE INDEX "ApprovalPolicyApprover_policyId_idx" ON "ApprovalPolicyApprover"("policyId");
CREATE INDEX "TimeEntryApproverDecision_timeEntryId_idx" ON "TimeEntryApproverDecision"("timeEntryId");
