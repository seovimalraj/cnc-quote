import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';

export class SendInviteDto {
  @ApiProperty({ description: 'Email address to send invite to' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ description: 'Organization ID (optional, defaults to prospects)' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Custom message for the invite email' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class AcceptInviteDto {
  @ApiProperty({ description: 'Invitation token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'Password for the new account' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ description: 'Enable MFA for the account' })
  @IsOptional()
  @IsString()
  enableMfa?: boolean;
}

export class ResendInviteDto {
  @ApiProperty({ description: 'Email address of the user to resend invite to' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class InviteResponseDto {
  @ApiProperty({ description: 'Invite ID' })
  @IsUUID()
  inviteId: string;

  @ApiProperty({ description: 'Email address invited' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'When the invite expires' })
  @IsString()
  expiresAt: Date;

  @ApiProperty({ description: 'Session token for immediate access' })
  @IsString()
  sessionToken: string;

  @ApiProperty({ description: 'Message indicating success' })
  @IsString()
  message: string;
}

export class AcceptInviteResponseDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Organization ID' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ description: 'Session token for immediate access' })
  @IsString()
  sessionToken: string;

  @ApiProperty({ description: 'Message indicating success' })
  @IsString()
  message: string;
}

export class VerifyInviteResponseDto {
  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Organization name' })
  @IsString()
  organizationName: string;

  @ApiProperty({ description: 'Whether the token is valid' })
  @IsString()
  valid: boolean;
}
