/**
 * Augment Express `Request` with our authenticated user payload.
 *
 * `req.user` is populated by the `authenticate` middleware after a successful
 * access-token verification. Routes that REQUIRE auth can rely on `user` being
 * non-undefined (handler ordering enforces this).
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'admin' | 'doctor' | 'patient';
      };
    }
  }
}

export {};
