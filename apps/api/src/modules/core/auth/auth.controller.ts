import { Controller, Post, Body, Get, Query, HttpException, HttpStatus, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from "../auth/jwt.guard";
import { User } from "../auth/user.decorator";
import {
  SendInviteDto,
  AcceptInviteDto,
  InviteResponseDto,
  AcceptInviteResponseDto,
  ResendInviteDto,
} from './auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('invite/send')
  @ApiOperation({ summary: 'Send user invitation' })
  @ApiResponse({ status: 200, description: 'Invitation sent successfully', type: InviteResponseDto })
  async sendInvite(@Body() dto: SendInviteDto, @User() user: any) {
    try {
      const result = await this.authService.sendInvite(dto, user);
      return result;
    } catch (error) {
      throw new HttpException(
        { error: error.message || 'Failed to send invite' },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('invite/accept')
  @ApiOperation({ summary: 'Accept user invitation and set password' })
  @ApiResponse({ status: 200, description: 'Invitation accepted successfully', type: AcceptInviteResponseDto })
  async acceptInvite(@Body() dto: AcceptInviteDto, @Res() res: Response) {
    try {
      const result = await this.authService.acceptInvite(dto);

      // Set session cookie for immediate access
      res.cookie('session_token', result.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      res.json(result);
    } catch (error) {
      throw new HttpException(
        { error: error.message || 'Failed to accept invite' },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('invite/resend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend user invitation' })
  @ApiResponse({ status: 200, description: 'Invitation resent successfully' })
  async resendInvite(@Body() dto: ResendInviteDto, @User() user: any) {
    try {
      await this.authService.resendInvite(dto, user);
      return { message: 'Invitation resent successfully' };
    } catch (error) {
      throw new HttpException(
        { error: error.message || 'Failed to resend invite' },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('invite/verify')
  @ApiOperation({ summary: 'Verify invitation token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  async verifyInvite(@Query('token') token: string) {
    try {
      const result = await this.authService.verifyInviteToken(token);
      return result;
    } catch (error) {
      throw new HttpException(
        { error: error.message || 'Invalid or expired token' },
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
