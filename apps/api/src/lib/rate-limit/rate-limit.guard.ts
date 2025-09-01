import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { Request } from "express";

interface RequestWithIps extends Request {
  ips: string[];
  ip: string;
}

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: RequestWithIps): Promise<string> {
    // Get the real IP if behind a proxy
    return req.ips.length ? req.ips[0] : req.ip;
  }
}
