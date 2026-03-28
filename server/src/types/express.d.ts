// Extend Express Request for Express 5
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Request } from 'express';

declare module 'express' {
  interface Request {
    user?: {
      id: string;
      role: string;
    };
  }
}
