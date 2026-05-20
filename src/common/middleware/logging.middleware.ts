import { NestMiddleware } from '@nestjs/common';
import { NextFunction } from 'express';

export class LoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const log = {
      time: Date.now(),
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      responseTime: 0,
    };
    next();
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    log.responseTime = responseTime;
    console.log(JSON.stringify(log));
  }
}
