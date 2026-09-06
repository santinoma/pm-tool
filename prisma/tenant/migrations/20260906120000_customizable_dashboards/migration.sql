-- CreateTable Dashboard
CREATE TABLE "Dashboard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dashboard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Dashboard_ownerId_name_key" ON "Dashboard"("ownerId", "name");

ALTER TABLE "Dashboard" ADD CONSTRAINT "Dashboard_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable DashboardWidget
CREATE TABLE "DashboardWidget" (
    "id" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "widgetType" TEXT NOT NULL,
    "title" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,
    "span" INTEGER NOT NULL DEFAULT 1,
    "filterProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardWidget_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DashboardWidget" ADD CONSTRAINT "DashboardWidget_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "Dashboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DashboardWidget" ADD CONSTRAINT "DashboardWidget_filterProjectId_fkey" FOREIGN KEY ("filterProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: create one default Dashboard per user who had widget preferences, carry position/enabled over
INSERT INTO "Dashboard" ("id", "name", "ownerId", "isDefault", "position", "createdAt")
SELECT gen_random_uuid(), 'Mein Dashboard', "userId", true, 0, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "userId" FROM "DashboardWidgetPreference") AS distinct_users;

INSERT INTO "DashboardWidget" ("id", "dashboardId", "widgetType", "enabled", "position", "span", "createdAt")
SELECT gen_random_uuid(), d."id", p."widgetType", p."enabled", p."position", 1, CURRENT_TIMESTAMP
FROM "DashboardWidgetPreference" p
JOIN "Dashboard" d ON d."ownerId" = p."userId" AND d."isDefault" = true;

-- DropTable
DROP TABLE "DashboardWidgetPreference";
