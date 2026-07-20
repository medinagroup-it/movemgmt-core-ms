import { z } from 'zod';

export const registerSchema = z.object({
  nomeSocieta: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  datiFatturazione: z.object({
    partitaIva: z.string().min(5),
    codiceFiscaleSocieta: z.string().min(5),
    ragioneSociale: z.string().min(1),
    indirizzoSedeLegale: z.string().min(1),
    codiceUnivoco: z.string().min(1)
  })
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});
