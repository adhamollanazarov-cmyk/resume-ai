import { requestOptimizedResumeDownload } from "@/lib/backend";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const optimizedResume =
    body && typeof body.optimized_resume === "string" ? body.optimized_resume : "";

  if (!optimizedResume.trim()) {
    return Response.json({ detail: "Optimized resume is required" }, { status: 400 });
  }

  try {
    const backendResponse = await requestOptimizedResumeDownload(optimizedResume);
    const fileBuffer = await backendResponse.arrayBuffer();

    return new Response(fileBuffer, {
      status: backendResponse.status,
      headers: {
        "Content-Type": backendResponse.headers.get("Content-Type") ?? "text/plain; charset=utf-8",
        "Content-Disposition":
          backendResponse.headers.get("Content-Disposition") ?? 'attachment; filename="optimized-resume.txt"',
      },
    });
  } catch {
    return Response.json({ detail: "Cannot connect to backend." }, { status: 502 });
  }
}
