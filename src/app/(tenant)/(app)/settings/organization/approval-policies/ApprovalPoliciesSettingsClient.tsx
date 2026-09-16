"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import { Badge } from "@/ui/shadcn/components/badge";
import { Button } from "@/ui/shadcn/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/shadcn/components/card";
import { Input } from "@/ui/shadcn/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/components/select";

interface UserOption {
  id: string;
  label: string;
}

interface ApproverRow {
  id: string;
  kind: "time" | "expense";
  roleType: "budget_owner" | "project_manager" | "submitter_manager" | "specific_person";
  specificUserLabel: string | null;
}

interface PolicyRow {
  id: string;
  name: string;
  description: string | null;
  timeApprovalMode: "any" | "all" | "none";
  expenseApprovalMode: "any" | "all" | "none";
  isDefault: boolean;
  archived: boolean;
  budgetCount: number;
  approvers: ApproverRow[];
}

const MODE_LABELS: Record<string, string> = {
  any: "Ein Approver genügt",
  all: "Alle müssen genehmigen",
  none: "Keine Genehmigung nötig",
};

const ROLE_TYPE_LABELS: Record<string, string> = {
  budget_owner: "Budget Owner",
  project_manager: "Project Manager",
  submitter_manager: "Manager der einreichenden Person",
  specific_person: "Bestimmte Person",
};

export function ApprovalPoliciesSettingsClient({
  canManage,
  policies,
  users,
}: {
  canManage: boolean;
  policies: PolicyRow[];
  users: UserOption[];
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    const response = await fetch("/api/tenant/approval-policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Policy konnte nicht angelegt werden.");
      return;
    }
    setNewName("");
    router.refresh();
  }

  async function handlePatch(policyId: string, fields: Record<string, unknown>) {
    await fetch(`/api/tenant/approval-policies/${policyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    router.refresh();
  }

  async function handleDelete(policyId: string) {
    const response = await fetch(`/api/tenant/approval-policies/${policyId}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Policy konnte nicht gelöscht werden.");
      return;
    }
    router.refresh();
  }

  async function handleAddApprover(policyId: string, kind: "time" | "expense", roleType: string, specificUserId?: string) {
    await fetch(`/api/tenant/approval-policies/${policyId}/approvers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, roleType, specificUserId }),
    });
    router.refresh();
  }

  async function handleRemoveApprover(policyId: string, approverId: string) {
    await fetch(`/api/tenant/approval-policies/${policyId}/approvers/${approverId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Approval Policies</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Eine Policy legt fest, wer Zeit- und Ausgaben-Einträge auf einem Budget genehmigen muss, bevor sie anerkannt
        und abrechenbar werden. Weise eine Policy auf der Budget-Seite unter „Genehmigung” zu.
      </p>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {canManage && (
        <form onSubmit={handleCreate} className="mb-6 flex gap-2">
          <Input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Name der neuen Policy" className="max-w-xs" />
          <Button type="submit" disabled={!newName.trim()}>
            Add Policy
          </Button>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {policies.map((policy) => {
          const isExpanded = expandedId === policy.id;
          const timeApprovers = policy.approvers.filter((a) => a.kind === "time");
          const expenseApprovers = policy.approvers.filter((a) => a.kind === "expense");
          return (
            <Card key={policy.id}>
              <CardHeader
                className="cursor-pointer flex-row items-center justify-between gap-2 space-y-0"
                onClick={() => setExpandedId(isExpanded ? null : policy.id)}
              >
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                  {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  {policy.name}
                  {policy.isDefault && <Badge variant="successOutline">Standard für neue Budgets</Badge>}
                  {policy.archived && <Badge variant="outline">Archiviert</Badge>}
                  <span className="font-normal text-muted-foreground">{policy.budgetCount} Budget(s)</span>
                </CardTitle>
                {canManage && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handlePatch(policy.id, { archived: !policy.archived });
                    }}
                  >
                    {policy.archived ? "Reaktivieren" : "Archive"}
                  </Button>
                )}
              </CardHeader>
              {isExpanded && (
                <CardContent className="flex flex-col gap-5">
                  {canManage && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={policy.isDefault}
                        onChange={(event) => handlePatch(policy.id, { isDefault: event.target.checked })}
                      />
                      Als Standard-Policy für neue Budgets verwenden
                    </label>
                  )}

                  <ApproverKindSection
                    label="Zeit-Genehmigung"
                    kind="time"
                    mode={policy.timeApprovalMode}
                    approvers={timeApprovers}
                    canManage={canManage}
                    users={users}
                    onModeChange={(mode) => handlePatch(policy.id, { timeApprovalMode: mode })}
                    onAdd={(roleType, specificUserId) => handleAddApprover(policy.id, "time", roleType, specificUserId)}
                    onRemove={(approverId) => handleRemoveApprover(policy.id, approverId)}
                  />

                  <ApproverKindSection
                    label="Ausgaben-Genehmigung"
                    kind="expense"
                    mode={policy.expenseApprovalMode}
                    approvers={expenseApprovers}
                    canManage={canManage}
                    users={users}
                    onModeChange={(mode) => handlePatch(policy.id, { expenseApprovalMode: mode })}
                    onAdd={(roleType, specificUserId) => handleAddApprover(policy.id, "expense", roleType, specificUserId)}
                    onRemove={(approverId) => handleRemoveApprover(policy.id, approverId)}
                  />

                  {canManage && (
                    <Button type="button" variant="ghost" size="sm" className="self-start text-destructive" onClick={() => handleDelete(policy.id)}>
                      Policy löschen
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ApproverKindSection({
  label,
  mode,
  approvers,
  canManage,
  users,
  onModeChange,
  onAdd,
  onRemove,
}: {
  label: string;
  kind: "time" | "expense";
  mode: "any" | "all" | "none";
  approvers: ApproverRow[];
  canManage: boolean;
  users: UserOption[];
  onModeChange: (mode: string) => void;
  onAdd: (roleType: string, specificUserId?: string) => void;
  onRemove: (approverId: string) => void;
}) {
  const [roleType, setRoleType] = useState("budget_owner");
  const [specificUserId, setSpecificUserId] = useState(users[0]?.id ?? "");

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{label}</span>
        <Select value={mode} onValueChange={onModeChange}>
          <SelectTrigger className="h-8 w-56 text-xs" disabled={!canManage}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MODE_LABELS).map(([value, l]) => (
              <SelectItem key={value} value={value}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {mode !== "none" && (
        <>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {approvers.length === 0 && <span className="text-xs text-muted-foreground">Noch keine Approver zugewiesen.</span>}
            {approvers.map((approver) => (
              <Badge key={approver.id} variant="secondary" className="gap-1 pr-1">
                {ROLE_TYPE_LABELS[approver.roleType]}
                {approver.specificUserLabel ? `: ${approver.specificUserLabel}` : ""}
                {canManage && (
                  <button type="button" onClick={() => onRemove(approver.id)} className="rounded-sm hover:bg-muted">
                    <X className="size-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Select value={roleType} onValueChange={setRoleType}>
                <SelectTrigger className="h-8 w-56 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_TYPE_LABELS).map(([value, l]) => (
                    <SelectItem key={value} value={value}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {roleType === "specific_person" && (
                <Select value={specificUserId} onValueChange={setSpecificUserId}>
                  <SelectTrigger className="h-8 w-48 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onAdd(roleType, roleType === "specific_person" ? specificUserId : undefined)}
              >
                Approver hinzufügen
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
