export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { applyProviderEnvAliases } = await import("@/lib/bootstrap-env");
    applyProviderEnvAliases();
  }
}
