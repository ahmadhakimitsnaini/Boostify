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
        $allModels: {
          $allOperations({ model, operation, args, query }) {
            // Kita kecualikan model 'tenant' karena ia berada di root
            if (model === 'Tenant') {
              return query(args);
            }

            // Operasi create menyisipkan tenant_id ke dalam `data`
            if (operation === 'create') {
              args.data = { ...args.data, tenant_id: tenantId } as any;
              return query(args);
            }

            if (operation === 'createMany') {
              if (Array.isArray(args.data)) {
                args.data = args.data.map((d) => ({ ...d, tenant_id: tenantId })) as any;
              } else {
                args.data = { ...args.data, tenant_id: tenantId } as any;
              }
              return query(args);
            }

            // Operasi baca, update, delete menyisipkan tenant_id ke dalam `where`
            if (
              ['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany', 'count', 'aggregate', 'groupBy'].includes(operation)
            ) {
              // @ts-ignore - Type abstraction override
              args.where = { ...args.where, tenant_id: tenantId };
            }

            return query(args);
          },
        },
      },
    });
  }
}
