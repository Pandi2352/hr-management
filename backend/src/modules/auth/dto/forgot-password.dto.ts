import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@peopleos.internal', description: 'Registered account work email' })
  @IsEmail({}, { message: 'Please enter a valid work email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;
}
