import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    res.on('finish', () => {
      this.logger.log(
        JSON.stringify({
          time: new Date(startTime).toISOString(),
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseTime: Date.now() - startTime,
        }),
      );
    });

    next();
  }
}