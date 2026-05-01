export async function GET() {
  return Response.json({
    hasGoogleId: Boolean(process.env.AUTH_GOOGLE_ID),
    hasGoogleSecret: Boolean(process.env.AUTH_GOOGLE_SECRET),
    googleIdLength: (process.env.AUTH_GOOGLE_ID ?? "").length,
  });
}