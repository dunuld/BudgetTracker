import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { badRequest } from '../http-error.js';
import { ReportService } from '../services/report.service.js';

export function reportsRouter(db: DatabaseSync): Router {
  const router = Router();
  const reportService = new ReportService(db);

  router.get('/monthly', (req, res) => {
    const year = Number(req.query['year']);
    const month = Number(req.query['month']);
    if (!Number.isInteger(year) || !Number.isInteger(month)) {
      throw badRequest('year und month sind erforderlich (z. B. ?year=2026&month=10)');
    }
    if (month < 1 || month > 12) throw badRequest('month muss zwischen 1 und 12 liegen');
    res.json(reportService.monthly(year, month));
  });

  router.get('/trend', (req, res) => {
    const from = String(req.query['from'] ?? '');
    const to = String(req.query['to'] ?? '');
    if (!/^\d{4}-\d{2}$/.test(from)) throw badRequest('from ist erforderlich (Format YYYY-MM)');
    if (!/^\d{4}-\d{2}$/.test(to)) throw badRequest('to ist erforderlich (Format YYYY-MM)');
    if (from > to) throw badRequest('from darf nicht größer als to sein');
    res.json(reportService.trend(from, to));
  });

  return router;
}
