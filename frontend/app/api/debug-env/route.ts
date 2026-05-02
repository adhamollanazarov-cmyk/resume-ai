export async function GET() {
  return Response.json({
    GITHUB_CLIENT_ID: Boolean(process.env.GITHUB_CLIENT_ID),
    GITHUB_CLIENT_SECRET: Boolean(process.env.GITHUB_CLIENT_SECRET),
    AUTH_GOOGLE_ID: Boolean(process.env.AUTH_GOOGLE_ID),
    AUTH_GOOGLE_SECRET: Boolean(process.env.AUTH_GOOGLE_SECRET),
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
    NEXTAUTH_SECRET: Boolean(process.env.NEXTAUTH_SECRET),
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "NOT SET",
    AUTH_URL: process.env.AUTH_URL ?? "NOT SET",
    VERCEL_URL: process.env.VERCEL_URL ?? "NOT SET",
  });
}