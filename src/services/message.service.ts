import { env } from '../config/env.js';

type Channel = 'sms' | 'whatsapp' | 'email';

interface Message {
  channel: Channel;
  to: string;
  subject?: string;
  text: string;
}

class MessageService {
  send(msg: Message) {
    if (env.nodeEnv === 'production') {
      void this.sendProduction(msg);
      return;
    }
    console.log(`\n--- [dev-message:${msg.channel}] to=${msg.to} ---`);
    if (msg.subject) console.log(`subject: ${msg.subject}`);
    console.log(msg.text);
    console.log('----------------------------------------\n');
  }

  sendVerificationCode(to: string, code: string) {
    this.send({
      channel: 'sms',
      to,
      text: `Your taxi app verification code is: ${code}. It expires in 15 minutes.`,
    });
  }

  sendOtp(to: string, code: string, channel: 'sms' | 'whatsapp' = 'sms') {
    this.send({
      channel,
      to,
      text: `Your DRMTaxi login code is: ${code}. It expires in 5 minutes. Never share it with anyone.`,
    });
  }

  private async sendProduction(_msg: Message) {
    // TODO(integration): plug an SMS gateway (e.g. Twilio / local Syrian provider) here.
    console.warn('[message] production transport not configured, message skipped');
  }
}

export const messageService = new MessageService();

export function generateVerificationCode(): string {
  return '000000';
}
