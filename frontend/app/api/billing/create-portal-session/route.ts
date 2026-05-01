import { auth } from "@/auth";
import { createBillingPortalSession } from "@/lib/backend";

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return Response.json({ detail: "Unauthorized" }, { status: 401 });
  }

  try {
    const backendResponse = await createBillingPortalSession(userId);
    const body = await backendResponse.text();

    return new Response(body, {
      status: backendResponse.status,
      headers: {
        "Content-Type": backendResponse.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch {
    return Response.json({ detail: "Cannot connect to billing." }, { status: 502 });
  }
}
