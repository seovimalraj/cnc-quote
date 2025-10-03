import { SetMetadata } from '@nestjs/common';
import { Role } from '../../../../packages/shared/src/rbac.types';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
