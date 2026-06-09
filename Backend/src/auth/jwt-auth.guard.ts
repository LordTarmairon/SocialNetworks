import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guard reutilizable: protege rutas exigiendo un JWT válido en el header. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
