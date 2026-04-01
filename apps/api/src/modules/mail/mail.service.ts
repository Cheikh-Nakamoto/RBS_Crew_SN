import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Mail;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', 'localhost'),
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });
  }

  async sendOrderConfirmation(order: {
    id: string;
    userEmail: string;
    userName: string;
    total: number;
    currency: string;
  }) {
    const amount = order.total.toFixed(0);
    await this.send({
      to: order.userEmail,
      subject: `Confirmation de commande #${order.id.slice(0, 8).toUpperCase()}`,
      html: `
        <h2>Merci pour votre commande, ${order.userName} !</h2>
        <p>Votre commande <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> a bien été reçue.</p>
        <p>Montant total : <strong>${amount} ${order.currency}</strong></p>
        <p>Nous vous contacterons dès que votre commande sera traitée.</p>
        <br />
        <p>— L'équipe RBS Crew</p>
      `,
    });
  }

  async sendPasswordReset(user: { email: string; firstName: string }, token: string) {
    const resetUrl = `${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${token}`;
    await this.send({
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <h2>Bonjour ${user.firstName},</h2>
        <p>Vous avez demandé une réinitialisation de mot de passe.</p>
        <p><a href="${resetUrl}">Cliquez ici pour réinitialiser votre mot de passe</a></p>
        <p>Ce lien expire dans 1 heure. Si vous n'avez pas effectué cette demande, ignorez cet email.</p>
        <br />
        <p>— L'équipe RBS Crew</p>
      `,
    });
  }

  private async send(options: { to: string; subject: string; html: string }) {
    const from = this.config.get('MAIL_FROM', 'RBS Crew <noreply@rbsakademya.com>');
    try {
      await this.transporter.sendMail({ from, ...options });
    } catch (err) {
      this.logger.error(`Failed to send email to ${options.to}: ${(err as Error).message}`);
    }
  }
}
