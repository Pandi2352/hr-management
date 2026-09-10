import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';






/**
 * Provider credentials entered in the settings UI.
 *
 * `apiKey` is three-state on purpose. Omit it to leave the stored key alone, so
 * changing the model does not require re-typing the credential. Send an empty
 * string to clear it. Anything else replaces it.
 */
export class SaveProviderSettingsDto {
  @ApiPropertyOptional({ description: 'Omit to keep the stored key; empty string to clear it.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;

  @ApiPropertyOptional({ example: 'gpt-oss:120b' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @ApiPropertyOptional({ example: 'https://ollama.com' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  host?: string;

  @ApiPropertyOptional({ description: 'Switch the provider off without removing its key.' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
