import { chromium, type Browser } from 'playwright';

export class PdfGenerator {
  private browser: Browser | null = null;

  async generate(html: string, options: Record<string, unknown> = {}): Promise<Buffer> {
    if (!this.browser) this.browser = await chromium.launch({ headless: true });
    const page = await this.browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'networkidle' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true, ...options });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  async destroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const pdfGenerator = new PdfGenerator();
