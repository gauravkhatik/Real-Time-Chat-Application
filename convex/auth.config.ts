const rawDomain =
  process.env.CLERK_JWT_ISSUER_DOMAIN ?? process.env.CLERK_FRONTEND_API_URL;
if (!rawDomain) {
  throw new Error(
    "Set CLERK_JWT_ISSUER_DOMAIN (or CLERK_FRONTEND_API_URL) in Convex env vars. Get it from Clerk Dashboard → JWT Templates → convex template → Issuer URL."
  );
}
const domain = rawDomain.replace(/\/$/, "");
// Clerk issuer formats sometimes differ by a `clerk.` prefix; accept both.
const domainVariants = Array.from(
  new Set([
    domain,
    domain.includes("://clerk.")
      ? domain.replace("://clerk.", "://")
      : domain.replace("https://", "https://clerk."),
  ])
);

const authConfig = {
  providers: domainVariants.map((d) => ({
    // Set CLERK_JWT_ISSUER_DOMAIN in Convex env vars (Dashboard or `npx convex env set`)
    domain: d,
    applicationID: "convex",
  })),
};

export default authConfig;


