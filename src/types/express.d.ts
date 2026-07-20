import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    auth?: {
      userId: string;
      accountId: string;
      companyId: string;
      email: string;
      ruolo: string;
      permessi: string[];
    };
  }
}
