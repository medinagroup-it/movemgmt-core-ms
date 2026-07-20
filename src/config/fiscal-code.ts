import { Gender } from '@prisma/client';
import { CADASTRAL_CODES } from './cities';
import { HttpError } from '../utils/httpError';

const months = ['A', 'B', 'C', 'D', 'E', 'H', 'L', 'M', 'P', 'R', 'S', 'T'];
const odd: Record<string, number> = { '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21, A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23 };
const even: Record<string, number> = { '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9, K: 10, L: 11, M: 12, N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19, U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25 };

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z]/gi, '').toUpperCase();
}

function codeForSurname(value: string) {
  const s = normalize(value);
  const consonants = s.replace(/[AEIOU]/g, '');
  const vowels = s.replace(/[^AEIOU]/g, '');
  return (consonants + vowels + 'XXX').slice(0, 3);
}

function codeForName(value: string) {
  const s = normalize(value);
  const consonants = s.replace(/[AEIOU]/g, '');
  const selected = consonants.length >= 4 ? consonants[0] + consonants[2] + consonants[3] : consonants;
  const vowels = s.replace(/[^AEIOU]/g, '');
  return (selected + vowels + 'XXX').slice(0, 3);
}

function controlChar(first15: string) {
  let sum = 0;
  for (let i = 0; i < first15.length; i++) {
    const ch = first15[i];
    sum += (i + 1) % 2 === 0 ? even[ch] : odd[ch];
  }
  return String.fromCharCode(65 + (sum % 26));
}

export function calculateFiscalCode(input: { nome: string; cognome: string; dataNascita: Date; luogoNascita: string; sesso: Gender }) {
  const key = input.luogoNascita.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const city = CADASTRAL_CODES[key];
  if (!city) throw new HttpError(400, 'Comune non censito per il calcolo codice fiscale. Aggiungerlo in src/config/cities.ts');
  const year = String(input.dataNascita.getFullYear()).slice(-2);
  const month = months[input.dataNascita.getMonth()];
  const day = input.dataNascita.getDate() + (input.sesso === 'F' ? 40 : 0);
  const first15 = `${codeForSurname(input.cognome)}${codeForName(input.nome)}${year}${month}${String(day).padStart(2, '0')}${city.code}`;
  return { codiceFiscale: `${first15}${controlChar(first15)}`, provincia: city.province, codiceCatastale: city.code };
}
