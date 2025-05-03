export {};

declare global {
  namespace Express {
    interface Request {
      user: {
        sub: string; // user id
        permissions: string[];
      };
    }
  }
}
