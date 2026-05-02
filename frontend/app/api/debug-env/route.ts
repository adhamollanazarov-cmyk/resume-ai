export async function GET() {
  return Response.json({
    hasGoogleId: Boolean(process.env.AUTH_GOOGLE_ID),
    hasGoogleSecret: Boolean(process.env.AUTH_GOOGLE_SECRET),
    googleIdLength: (process.env.AUTH_GOOGLE_ID ?? "").length,
    // Добавь это:
    hasGithubId: Boolean(process.env.GITHUB_CLIENT_ID),
    hasGithubSecret: Boolean(process.env.GITHUB_CLIENT_SECRET),
    githubIdLength: (process.env.GITHUB_CLIENT_ID ?? "").length,
    githubIdFirst4: (process.env.GITHUB_CLIENT_ID ?? "").slice(0, 4),
    // Проверим все варианты имён:
    hasGithubIdAlt: Boolean(process.env.GITHUB_ID),
    hasGithubSecretAlt: Boolean(process.env.GITHUB_SECRET),
  });
}