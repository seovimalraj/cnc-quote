/**
 * @module InvitesPublicController
 * @ownership platform-identity
 * @description Exposes public invite introspection endpoints used by the Next.js auth flow.
 */
import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContractsVNext } from '@cnc-quote/shared';

import { InvitesService } from './invites.service';

@ApiTags('Invites')
@Controller('invites')
export class InvitesPublicController {
  constructor(private readonly invitesService: InvitesService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Retrieve public invite metadata by token' })
  @ApiResponse({ status: 200, description: 'Invite metadata resolved successfully' })
  async getInvite(@Param('token') token: string): Promise<ContractsVNext.OrgInviteDetails> {
    return this.invitesService.getInviteDetails(token);
  }
}
