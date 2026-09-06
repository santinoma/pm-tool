import { NextResponse } from "next/server";
import { authenticateApiKey, authFailureResponse } from "@/tenant/apiKeys/authenticateApiKey";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return authFailureResponse(auth);

  const projects = await auth.tenantDb.project.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({
    projects: projects.map((project) => ({ id: project.id, name: project.name, description: project.description })),
  });
}
