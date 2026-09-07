import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

// Complexity (length + character classes) is validated dynamically against the
// live organization SecurityPolicy in AuthService, not statically here.
export class ChangePasswordDto {
  @ApiProperty({ example: 'Current@123', description: 'Current account password' })
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @ApiProperty({ example: 'SecureNewP@ss2026', description: 'New password' })
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  newPassword: string;
}
