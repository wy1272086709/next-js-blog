/**
 * Public interaction features are enabled by default for backward compatibility.
 * Set NEXT_PUBLIC_INTERACTIONS_ENABLED=false to run the blog in read-only mode.
 */
export const interactionsEnabled =
  process.env.NEXT_PUBLIC_INTERACTIONS_ENABLED !== "false"
