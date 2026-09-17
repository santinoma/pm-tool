-- Lets invoices actually include approved billable expenses, not just time
-- entries, matching what "uninvoiced_time_expenses" always claimed to do.

-- Expense gets the same invoiceId marker TimeEntry already has.
ALTER TABLE "Expense" ADD COLUMN "invoiceId" TEXT;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- InvoiceLineItem.budgetSectionId becomes optional: an expense-based line
-- item has no budget section (Expense has no per-section FK in this schema),
-- and gets an expenseId instead.
ALTER TABLE "InvoiceLineItem" ALTER COLUMN "budgetSectionId" DROP NOT NULL;
ALTER TABLE "InvoiceLineItem" ADD COLUMN "expenseId" TEXT;
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
