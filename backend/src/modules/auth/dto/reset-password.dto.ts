import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

// Complexity (length + character classes) is validated dynamically against the
// live organization SecurityPolicy in AuthService, not statically here.
export class ResetPasswordDto {
  @ApiProperty({ example: 'admin@peopleos.internal', description: 'Account email' })
  @IsEmail({}, { message: 'Please enter a valid work email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP received via email' })
  @IsString()
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string;

  @ApiProperty({ example: 'NewSecret@12345', description: 'New password' })
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  newPassword: string;
}
