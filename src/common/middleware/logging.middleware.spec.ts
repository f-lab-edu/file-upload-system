import { Logger } from '@nestjs/common';
import { LoggingMiddleware } from './logging.middleware';

describe('LoggingMiddleware', () => {
  let middleware: LoggingMiddleware;
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    middleware = new LoggingMiddleware();
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createMockReq(overrides: Partial<{ method: string; url: string }> = {}) {
    return { method: 'GET', url: '/test', ...overrides };
  }

  function createMockRes(overrides: Partial<{ statusCode: number }> = {}) {
    const listeners: Record<string, (() => void)[]> = {};
    return {
      statusCode: 200,
      ...overrides,
      on: jest.fn((event: string, cb: () => void) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
      }),
      emit(event: string) {
        listeners[event]?.forEach((cb) => cb());
      },
    };
  }

  it('next()를 호출한다', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = jest.fn();

    middleware.use(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
  });

  it('finish 이벤트 발생 시 method, url, statusCode를 로깅한다', () => {
    const req = createMockReq({ method: 'POST', url: '/api/register' });
    const res = createMockRes({ statusCode: 201 });

    middleware.use(req as any, res as any, jest.fn());
    res.emit('finish');

    expect(loggerSpy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(loggerSpy.mock.calls[0][0] as string);
    expect(logged).toMatchObject({
      method: 'POST',
      url: '/api/register',
      statusCode: 201,
    });
  });

});
