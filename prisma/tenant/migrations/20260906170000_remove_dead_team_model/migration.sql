-- DropTable: Team/TeamMember were never wired to any route or UI (confirmed via full source grep) — remove the dead schema instead of carrying it further.
DROP TABLE "TeamMember";
DROP TABLE "Team";
