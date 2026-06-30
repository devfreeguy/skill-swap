/**
 * Pusher channel names, shared by the server (publish) and client (subscribe)
 * so they never drift. Both are private channels - the /api/pusher/auth route
 * authorizes a subscription only for the owning user or a swap's participants.
 */
export const userChannel = (userId: string) => `private-user-${userId}`;
export const swapChannel = (swapId: string) => `private-swap-${swapId}`;
