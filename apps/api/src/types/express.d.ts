import { RequestUser } from "../../auth/jwt.strategy";

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
      logger?: any; // TODO: Add proper logger type
      requestId?: string;
    }
  }
}
