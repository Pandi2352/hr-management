import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  IsOptional,
  IsIn,
  IsBoolean,
  Equals,
  MinLength,
} from 'class-validator';

export class CreateInvitationDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  roles: string[];

  @IsOptional()
  @IsIn([24, 48, 168])
  expiryHours?: number;
}

export class InvitationTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsBoolean()
  @Equals(true, { message: 'You must accept the Terms of Service and Security Policy to continue' })
  acceptTerms: boolean;
}
