import Handlebars from 'handlebars';
import { HttpError } from '../../utils/httpError';
import { renderSignatureImg, type SignatureImageInput } from './signature.renderer';

export const TEMPLATE_PLACEHOLDER_REGEX = /\{\{\s*([A-Z0-9_]+)\s*\}\}/g;

const LOGO_PLACEHOLDERS = ['[[LOGO]]', '[[LOGO_SOCIETA]]', '[[COMPANY_LOGO]]'];
const STAMP_PLACEHOLDERS = ['[[TIMBRO]]', '[[TIMBRO_SOCIETA]]', '[[COMPANY_STAMP]]'];

export function extractPlaceholders(html: string): string[] {
  const result = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = TEMPLATE_PLACEHOLDER_REGEX.exec(html)) !== null) result.add(match[1]);
  return Array.from(result);
}

function escapeHtml(value: unknown): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function renderStaticAsset(dataUrl: string | undefined, alt: string, maxHeight: string): string {
  if (!dataUrl) return '';
  return `<img src="${dataUrl}" alt="${escapeHtml(alt)}" style="display:block;max-width:100%;max-height:${maxHeight};width:auto;height:auto;object-fit:contain;" />`;
}

function replaceAssetPlaceholders(html: string, placeholders: string[], dataUrl: string | undefined, alt: string, maxHeight: string): string {
  const standaloneHtml = renderStaticAsset(dataUrl, alt, maxHeight);
  let result = html;
  for (const placeholder of placeholders) {
    result = result
      .replaceAll(`src="${placeholder}"`, dataUrl ? `src="${dataUrl}"` : 'src=""')
      .replaceAll(`src='${placeholder}'`, dataUrl ? `src='${dataUrl}'` : "src=''")
      .replaceAll(placeholder, standaloneHtml);
  }
  return result;
}

export function renderHtml(input: {
  html: string;
  placeholder: Record<string, unknown>;
  logoUrl?: string;
  stampUrl?: string;
  clientSignature?: SignatureImageInput;
  clientSignatureAreaHtml?: string;
  clientSignaturePlaceholder?: string;
  defaultClientSignatureWidth?: string;
  defaultClientSignatureHeight?: string;
  strictPlaceholders?: boolean;
  sanitizeHtmlValues?: boolean;
}): { html: string; missingPlaceholders: string[] } {
  const clientSignaturePlaceholder = input.clientSignaturePlaceholder ?? '[[FIRMA_CLIENTE]]';
  let html = input.html;

  html = replaceAssetPlaceholders(html, LOGO_PLACEHOLDERS, input.logoUrl, 'Logo societa', '110px');
  html = replaceAssetPlaceholders(html, STAMP_PLACEHOLDERS, input.stampUrl, 'Timbro societa', '130px');
  html = html.replaceAll(clientSignaturePlaceholder, input.clientSignatureAreaHtml ?? renderSignatureImg(typeof input.clientSignature === 'object' && input.clientSignature !== null ? {
    width: input.defaultClientSignatureWidth ?? '180px',
    height: input.defaultClientSignatureHeight ?? '70px',
    ...input.clientSignature
  } : input.clientSignature));

  const placeholders = extractPlaceholders(html);
  const missingPlaceholders = placeholders.filter((key) => input.placeholder[key] === undefined || input.placeholder[key] === null);
  if ((input.strictPlaceholders ?? true) && missingPlaceholders.length > 0) throw new HttpError(400, `Missing placeholders: ${missingPlaceholders.join(', ')}`, { missingPlaceholders });

  html = html.replace(TEMPLATE_PLACEHOLDER_REGEX, (_match, key: string) => {
    const value = input.placeholder[key];
    if (value === undefined || value === null) return '';
    return input.sanitizeHtmlValues === false ? String(value) : escapeHtml(value);
  });

  Handlebars.compile(html)({});
  return { html, missingPlaceholders };
}
