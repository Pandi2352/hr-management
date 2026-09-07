import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

// Complexity (length + character classes) is validated dynamically against the
// live organization SecurityPolicy in AuthService, not statically here.
export class ResetPasswordWithTokenDto {
  @ApiProperty({ example: '6f2a74c1...', description: 'Cryptographic reset token' })
  @IsString()
  @IsNotEmpty({ message: 'Reset token is required' })
  token: string;

  @ApiProperty({ example: 'SecureP@ssw0rd2026', description: 'New password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
