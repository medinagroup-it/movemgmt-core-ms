export const CLIENT_SIGNATURE_PLACEHOLDER = '[[FIRMA_CLIENTE]]';

export type SignatureImageInput = string | {
  dataUrl?: string;
  base64?: string;
  url?: string;
  mimeType?: string;
  alt?: string;
  width?: string;
  height?: string;
  className?: string;
  style?: string;
};

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function resolveSignatureSrc(signature?: SignatureImageInput): string | undefined {
  if (!signature) return undefined;
  if (typeof signature === 'string') return signature;
  if (signature.dataUrl) return signature.dataUrl;
  if (signature.url) return signature.url;
  if (signature.base64) return `data:${signature.mimeType ?? 'image/png'};base64,${signature.base64}`;
  return undefined;
}

export function renderSignatureImg(signature?: SignatureImageInput): string {
  const src = resolveSignatureSrc(signature);
  if (!src) return '';
  const signatureObject = typeof signature === 'string' || !signature ? {} : signature;
  const width = signatureObject.width ?? '180px';
  const height = signatureObject.height ?? '70px';
  const alt = signatureObject.alt ?? 'Firma cliente';
  const baseStyle = ['display:inline-block', 'object-fit:contain', `width:${width}`, `height:${height}`, 'max-width:100%'];
  const style = signatureObject.style ? `${baseStyle.join(';')};${signatureObject.style}` : baseStyle.join(';');
  return `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}"${signatureObject.className ? ` class="${escapeAttribute(signatureObject.className)}"` : ''} style="${escapeAttribute(style)}" />`;
}
