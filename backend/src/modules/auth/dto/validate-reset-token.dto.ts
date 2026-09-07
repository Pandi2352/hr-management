import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateResetTokenDto {
  @ApiProperty({ example: '6f2a74c1...', description: 'Secret reset token sent via email link' })
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  token: string;
}
