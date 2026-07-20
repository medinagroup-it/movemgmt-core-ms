declare module 'pino' {
  export type Logger = {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    fatal: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
  };

  export type LoggerOptions = Record<string, unknown>;

  export default function pino(options?: LoggerOptions): Logger;
}

declare module 'pino-http' {
  import type { Request, Response } from 'express';
  import type { Logger } from 'pino';

  export type Options = {
    logger?: Logger;
    genReqId?: (req: Request) => string;
    customProps?: (req: Request, res: Response) => Record<string, unknown>;
    customLogLevel?: (req: Request, res: Response, err?: Error) => 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';
    [key: string]: unknown;
  };

  export default function pinoHttp(options?: Options): import('express').RequestHandler;
}

declare module 'express-rate-limit' {
  import type { Request, Response, RequestHandler } from 'express';

  export type Options = {
    windowMs?: number;
    max?: number;
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
    handler?: (req: Request, res: Response) => void;
    [key: string]: unknown;
  };

  export default function rateLimit(options?: Options): RequestHandler;
}
