-- CreateTable
CREATE TABLE "DashboardWidgetPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "widgetType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,

    CONSTRAINT "DashboardWidgetPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DashboardWidgetPreference_userId_widgetType_key" ON "DashboardWidgetPreference"("userId", "widgetType");

-- AddForeignKey
ALTER TABLE "DashboardWidgetPreference" ADD CONSTRAINT "DashboardWidgetPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
