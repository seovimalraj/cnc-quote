import { SetMetadata } from '@nestjs/common';
import { Role } from '@cnc-quote/shared';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
