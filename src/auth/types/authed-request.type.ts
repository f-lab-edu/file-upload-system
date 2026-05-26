export type AuthedRequest = {
  user: { id: string; loginId: string; email: string; name: string | null };
};
