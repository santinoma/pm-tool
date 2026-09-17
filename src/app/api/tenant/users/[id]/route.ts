import { NextResponse } from "next/server";
import { getTenantContext } from "@/tenant/context";
import { wouldRemoveLastOwner, type RoleName } from "@/tenant/auth/roleGuard";
import { hasEffectivePermission } from "@/tenant/permissions/resolvePermissions";
import { recordAuditEntry } from "@/tenant/auditLog/recordAuditEntry";
import { wouldCreateManagerCycle } from "@/tenant/org/managerHierarchy";
import { isRoleAllowedForEmploymentType, type EmploymentTypeName } from "@/tenant/auth/employmentType";

const VALID_ROLES: RoleName[] = ["owner", "admin", "member"];
const VALID_EMPLOYMENT_TYPES: EmploymentTypeName[] = ["employee", "contractor"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!context?.currentUser) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const canManageRoles = await hasEffectivePermission(
    context.tenantDb,
    context.currentUser,
    context.entitledFeatures,
    "members_manage_roles",
  );
  if (!canManageRoles) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const hasRole = body.role !== undefined;
  const hasHolidayCalendarId = body.holidayCalendarId !== undefined;
  const hasManagerId = body.managerId !== undefined;
  const hasEmploymentType = body.employmentType !== undefined;
  if (!hasRole && !hasHolidayCalendarId && !hasManagerId && !hasEmploymentType) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  if (hasRole && !VALID_ROLES.includes(body.role)) {
    return NextResponse.json({ error: "Ungültige Rolle." }, { status: 400 });
  }
  if (hasEmploymentType && !VALID_EMPLOYMENT_TYPES.includes(body.employmentType)) {
    return NextResponse.json({ error: "Ungültiger employmentType." }, { status: 400 });
  }
  if (hasRole || hasEmploymentType) {
    const target = await context.tenantDb.user.findUnique({ where: { id }, select: { role: true, employmentType: true } });
    if (!target) {
      return NextResponse.json({ error: "Nutzer nicht gefunden." }, { status: 404 });
    }
    const effectiveRole = hasRole ? body.role : target.role;
    const effectiveEmploymentType = hasEmploymentType ? body.employmentType : target.employmentType;
    if (!isRoleAllowedForEmploymentType(effectiveRole, effectiveEmploymentType)) {
      return NextResponse.json(
        { error: "Contractors können nicht Admin oder Owner sein — nur ein festes Berechtigungsprofil (member)." },
        { status: 400 },
      );
    }
  }
  if (hasHolidayCalendarId && body.holidayCalendarId !== null && typeof body.holidayCalendarId !== "string") {
    return NextResponse.json({ error: "holidayCalendarId muss ein String oder null sein." }, { status: 400 });
  }
  if (hasManagerId && body.managerId !== null && typeof body.managerId !== "string") {
    return NextResponse.json({ error: "managerId muss ein String oder null sein." }, { status: 400 });
  }
  if (hasManagerId && body.managerId !== null) {
    if (body.managerId === id) {
      return NextResponse.json(
        { error: "Ein Mitglied kann nicht sein eigener Manager sein." },
        { status: 400 },
      );
    }
    if (await wouldCreateManagerCycle(context.tenantDb, id, body.managerId)) {
      return NextResponse.json(
        { error: "Diese Zuweisung würde einen Zyklus in der Management-Kette erzeugen." },
        { status: 400 },
      );
    }
  }

  if (hasRole) {
    const allUsers = await context.tenantDb.user.findMany({ select: { id: true, role: true } });
    if (wouldRemoveLastOwner(allUsers, id, body.role)) {
      return NextResponse.json(
        { error: "Der letzte Owner kann nicht degradiert werden." },
        { status: 409 },
      );
    }
  }

  const previous = hasRole
    ? await context.tenantDb.user.findUnique({ where: { id }, select: { role: true } })
    : null;

  const updated = await context.tenantDb.user.update({
    where: { id },
    data: {
      role: hasRole ? body.role : undefined,
      employmentType: hasEmploymentType ? body.employmentType : undefined,
      holidayCalendarId: hasHolidayCalendarId ? body.holidayCalendarId : undefined,
      managerId: hasManagerId ? body.managerId : undefined,
    },
  });

  if (hasRole && previous && previous.role !== updated.role) {
    try {
      await recordAuditEntry(context.tenantDb, {
        actorId: context.currentUser.id,
        action: "user_role_changed",
        entityType: "User",
        entityId: updated.id,
        summary: `Rolle von ${updated.email} geändert: ${previous.role} → ${updated.role}`,
      });
    } catch {
      // Audit-Logging darf die eigentliche Aktion nie blockieren.
    }
  }

  return NextResponse.json({ user: updated });
}
