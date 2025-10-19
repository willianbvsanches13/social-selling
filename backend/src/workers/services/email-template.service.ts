import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Handlebars from 'handlebars';
import * as fs from 'fs-extra';
import * as path from 'path';
import mjml2html from 'mjml';

export interface RenderedEmail {
  html: string;
  text: string;
  subject: string;
}

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);
  private templateCache = new Map<string, Handlebars.TemplateDelegate>();
  private readonly templateDir: string;

  constructor(private configService: ConfigService) {
    this.templateDir = path.join(process.cwd(), 'src', 'templates', 'emails');
    this.registerHelpers();
  }

  private registerHelpers() {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: Date) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // URL helper
    Handlebars.registerHelper('url', (urlPath: string) => {
      const baseUrl = this.configService.get('APP_URL');
      return `${baseUrl}${urlPath}`;
    });

    // Conditional helper
    Handlebars.registerHelper(
      'ifEquals',
      function (this: any, arg1: any, arg2: any, options: any) {
        return arg1 == arg2 ? options.fn(this) : options.inverse(this);
      },
    );

    // Truncate helper
    Handlebars.registerHelper('truncate', (str: string, length: number) => {
      if (!str) return '';
      if (str.length <= length) return str;
      return str.substring(0, length) + '...';
    });
  }

  async renderTemplate(
    templateName: string,
    context: Record<string, any>,
  ): Promise<RenderedEmail> {
    try {
      // Add global context
      const fullContext = {
        ...context,
        appName: 'Social Selling',
        appUrl: this.configService.get('APP_URL'),
        supportEmail: this.configService.get(
          'SUPPORT_EMAIL',
          'support@socialselling.com',
        ),
        currentYear: new Date().getFullYear(),
      };

      // Render HTML
      const html = await this.renderHtml(templateName, fullContext);

      // Render text version
      const text = await this.renderText(templateName, fullContext);

      // Get subject from template metadata
      const subject = await this.getSubject(templateName, fullContext);

      return { html, text, subject };
    } catch (error: any) {
      this.logger.error(
        `Failed to render template ${templateName}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  private async renderHtml(
    templateName: string,
    context: Record<string, any>,
  ): Promise<string> {
    // Load MJML template
    const mjmlPath = path.join(this.templateDir, templateName, 'template.mjml');
    const mjmlContent = await fs.readFile(mjmlPath, 'utf-8');

    // Compile with Handlebars first
    const mjmlTemplate = Handlebars.compile(mjmlContent);
    const compiledMjml = mjmlTemplate(context);

    // Convert MJML to HTML
    const { html, errors } = mjml2html(compiledMjml, {
      validationLevel: 'soft',
    });

    if (errors && errors.length > 0) {
      this.logger.warn(`MJML conversion warnings for ${templateName}:`, errors);
    }

    return html;
  }

  private async renderText(
    templateName: string,
    context: Record<string, any>,
  ): Promise<string> {
    const textPath = path.join(this.templateDir, templateName, 'template.txt');

    if (!(await fs.pathExists(textPath))) {
      // Generate simple text version from context
      return this.generatePlainText(context);
    }

    const textContent = await fs.readFile(textPath, 'utf-8');
    const textTemplate = Handlebars.compile(textContent);
    return textTemplate(context);
  }

  private async getSubject(
    templateName: string,
    context: Record<string, any>,
  ): Promise<string> {
    const metaPath = path.join(this.templateDir, templateName, 'metadata.json');

    if (!(await fs.pathExists(metaPath))) {
      return 'Notification from Social Selling';
    }

    const metadata = await fs.readJson(metaPath);
    const subjectTemplate = Handlebars.compile(metadata.subject);
    return subjectTemplate(context);
  }

  private generatePlainText(context: Record<string, any>): string {
    // Simple plain text generation
    return Object.entries(context)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }

  async previewTemplate(
    templateName: string,
    context: Record<string, any>,
  ): Promise<string> {
    const rendered = await this.renderTemplate(templateName, context);
    return rendered.html;
  }

  async validateTemplate(templateName: string): Promise<boolean> {
    try {
      const mjmlPath = path.join(
        this.templateDir,
        templateName,
        'template.mjml',
      );
      const metaPath = path.join(
        this.templateDir,
        templateName,
        'metadata.json',
      );

      const mjmlExists = await fs.pathExists(mjmlPath);
      const metaExists = await fs.pathExists(metaPath);

      if (!mjmlExists || !metaExists) {
        return false;
      }

      // Try to render with sample data
      const sampleContext = { userName: 'Test User', test: true };
      await this.renderTemplate(templateName, sampleContext);

      return true;
    } catch (error: any) {
      this.logger.error(
        `Template validation failed for ${templateName}: ${error.message}`,
      );
      return false;
    }
  }
}
