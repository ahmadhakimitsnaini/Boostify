import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Mengembalikan Prisma Client yang secara otomatis
   * menginjeksi filter `tenant_id` ke semua query model tenant.
   * Tidak boleh digunakan untuk registrasi Tenant baru.
   */
  getClient(tenantId: string) {
    if (!tenantId) {
      throw new Error('Tenant ID is required for multi-tenant operations');
    }

    return this.$extends({
      query: {
        channelIntegration: {
          $allOperations({ args, query }) {
            args.where = { ...args.where, tenant_id: tenantId };
            return query(args);
          },
        },
        flow: {
          $allOperations({ args, query }) {
            args.where = { ...args.where, tenant_id: tenantId };
            return query(args);
          },
        },
        contact: {
          $allOperations({ args, query }) {
            args.where = { ...args.where, tenant_id: tenantId };
            return query(args);
          },
        },
        messageHistory: {
          $allOperations({ args, query }) {
            args.where = { ...args.where, tenant_id: tenantId };
            return query(args);
          },
        },
      },
    });
  }
}
