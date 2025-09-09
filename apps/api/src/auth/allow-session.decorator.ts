import { SetMetadata } from '@nestjs/common';

export const AllowSession = () => SetMetadata('allowSession', true);
