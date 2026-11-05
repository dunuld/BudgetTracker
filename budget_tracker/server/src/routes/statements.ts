import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import { HttpError, badRequest } from '../http-error.js';
import type { ImportService } from '../services/import.service.js';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5 },
});

/** multer-Fehler in verständliche HTTP-Fehler übersetzen. */
const singleFile: RequestHandler = (req, res, next) => {
  upload.single('file')(req, res, (error: unknown) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(new HttpError(413, 'Die Datei ist zu groß (maximal 10 MB).', 'FILE_TOO_LARGE'));
      }
      return next(badRequest(`Ungültiger Upload: ${error.message}`, 'INVALID_UPLOAD'));
    }
    next(error);
  });
};

export function parseId(value: unknown): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw badRequest('Ungültige ID');
  return id;
}

const isTrue = (value: unknown): boolean => value === 'true' || value === '1';

export function statementsRouter(imports: ImportService): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(imports.listStatements());
  });

  router.post('/', singleFile, async (req, res) => {
    if (!req.file) throw badRequest('Keine Datei hochgeladen (Feld "file").', 'NO_FILE');
    const result = await imports.importPdf(req.file.buffer, req.file.originalname, {
      replace: isTrue(req.query['replace']),
    });
    res.status(201).json(result);
  });

  router.get('/:id', (req, res) => {
    res.json(imports.getStatement(parseId(req.params['id'])));
  });

  router.delete('/:id', (req, res) => {
    imports.deleteStatement(parseId(req.params['id']));
    res.status(204).end();
  });

  return router;
}
