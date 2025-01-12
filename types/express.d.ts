export {};

declare global {
  namespace Express {
    interface Request {
      user: {
        sub: string; // user id
        org_sub: string; // organisation id
      };
    }
  }
}
