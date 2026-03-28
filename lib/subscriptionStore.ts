// In-memory subscription store (replace with D1 in production)
// Shape: email -> { tier, expiresAt (ms) }
export const userSubscriptions = new Map<string, { tier: 'pro'; expiresAt: number }>();
