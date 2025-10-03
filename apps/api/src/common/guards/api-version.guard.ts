/**
 * Step 20: API Version Guard
 * Enforce API versioning via Accept header
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotAcceptableException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

const SUPPORTED_VERSIONS = ['v1'];
const DEFAULT_VERSION = 'v1';

@Injectable()
export class ApiVersionGuard implements CanActivate {
  private readonly logger = new Logger(ApiVersionGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract version from Accept header
    const acceptHeader = request.headers.accept || '';
    const versionMatch = acceptHeader.match(/application\/vnd\.frigate\.(v\d+)\+json/);

    if (versionMatch) {
      const requestedVersion = versionMatch[1];

      if (!SUPPORTED_VERSIONS.includes(requestedVersion)) {
        this.logger.warn(`Unsupported API version requested: ${requestedVersion}`);
        throw new NotAcceptableException(
          `API version '${requestedVersion}' is not supported. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`,
        );
      }

      // Attach version to request for use in controllers
      (request as any).apiVersion = requestedVersion;
    } else {
      // Default to v1 if no version specified
      (request as any).apiVersion = DEFAULT_VERSION;
    }

    return true;
  }
}
