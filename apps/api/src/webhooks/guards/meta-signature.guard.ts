import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Request } from 'express';

@Injectable()
export class MetaSignatureGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const signatureHeader = request.headers['x-hub-signature-256'] as string;

    if (!signatureHeader) {
      throw new ForbiddenException('Missing signature header');
    }

    const appSecret = this.configService.get<string>('META_APP_SECRET');
    if (!appSecret) {
      throw new Error('META_APP_SECRET is not configured');
    }

    // req.rawBody is available because we set { rawBody: true } in main.ts
    const rawBody = (request as any).rawBody;

    if (!rawBody) {
       throw new ForbiddenException('Raw body is missing');
    }

    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex')}`;

    if (signatureHeader !== expectedSignature) {
      throw new ForbiddenException('Invalid signature');
    }

    return true;
  }
}
