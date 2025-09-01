import { RequestUser } from "../auth/jwt.strategy";
import { LoggerService } from "../observability/logger.types";

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
      logger?: LoggerService;
      requestId?: string;
    }
  }
}
