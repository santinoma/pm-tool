import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/platform/schema.prisma",
  migrations: {
    path: "prisma/platform/migrations",
  },
  datasource: {
    url: env("PLATFORM_DATABASE_URL"),
  },
});
