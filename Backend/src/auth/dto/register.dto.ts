import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  // El alta admite email (Mellon) o teléfono (Palantír): al menos uno.
  @IsOptional()
  @IsEmail({}, { message: 'El email no es válido' })
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{6,15}$/, { message: 'El teléfono no es válido' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'El usuario debe tener al menos 3 caracteres' })
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'El usuario solo puede contener letras, números y guion bajo',
  })
  username?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(100)
  password: string;
}
