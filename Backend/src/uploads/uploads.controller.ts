import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/** Carpeta de subidas (en disco, junto al proyecto del backend). */
export const UPLOADS_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) =>
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
      fileFilter: (_req, file, cb) => {
        if (ALLOWED.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Tipo no permitido (solo imágenes JPG, PNG, WEBP o GIF)',
            ),
            false,
          );
        }
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    return { url: `/uploads/${file.filename}` };
  }
}
