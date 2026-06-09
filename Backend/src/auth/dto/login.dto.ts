import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  // Permitimos iniciar sesión con email o nombre de usuario.
  @IsString()
  identifier: string;

  @IsString()
  @MinLength(8)
  password: string;
}
