import { auth } from "@/auth";
import { forwardAnalyzeRequest } from "@/lib/backend";

export async function POST(request: Request) {
  const session = await auth();
  const formData = await request.formData();

  try {
    const backendResponse = await forwardAnalyzeRequest(formData, session?.user?.id || undefined);
    const body = await backendResponse.text();

    return new Response(body, {
      status: backendResponse.status,
      headers: {
        "Content-Type": backendResponse.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch {
    return Response.json({ detail: "Cannot connect to backend." }, { status: 502 });
  }
}
