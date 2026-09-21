import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Prisma Multi-Tenant Extension (e2e)', () => {
  let moduleFixture: TestingModule;
  let rootPrisma: PrismaService;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    rootPrisma = moduleFixture.get<PrismaService>(PrismaService);
    await rootPrisma.onModuleInit();

    // Cleanup DB for tests
    await rootPrisma.messageHistory.deleteMany();
    await rootPrisma.contact.deleteMany();
    await rootPrisma.flow.deleteMany();
    await rootPrisma.channelIntegration.deleteMany();
    await rootPrisma.tenant.deleteMany();
  });

  afterAll(async () => {
    await rootPrisma.onModuleDestroy();
    await moduleFixture.close();
  });

  it('should create and retrieve data scoped to a tenant', async () => {
    // 1. Setup two dummy tenants directly using root prisma (no extension)
    const tenantA = await rootPrisma.tenant.create({
      data: { name: 'Tenant A', email: 'a@example.com' },
    });
    const tenantB = await rootPrisma.tenant.create({
      data: { name: 'Tenant B', email: 'b@example.com' },
    });

    // 2. Get tenant-scoped clients
    const clientA = rootPrisma.getClient(tenantA.id);
    const clientB = rootPrisma.getClient(tenantB.id);

    // 3. Create items. Extension should automatically inject tenant_id
    // We cast data to any to bypass TS complaining about missing tenant_id
    // since the Prisma Extension injects it behind the scenes.
    await clientA.flow.create({
      data: { name: 'Flow A1', trigger_type: 'keyword', flow_data: {} } as any,
    });

    await clientA.flow.create({
      data: { name: 'Flow A2', trigger_type: 'keyword', flow_data: {} } as any,
    });

    await clientB.flow.create({
      data: { name: 'Flow B1', trigger_type: 'keyword', flow_data: {} } as any,
    });

    // 4. Verify isolation on read (findMany)
    const flowsA = await clientA.flow.findMany();
    expect(flowsA).toHaveLength(2);
    expect(flowsA.every((f: any) => f.tenant_id === tenantA.id)).toBe(true);

    const flowsB = await clientB.flow.findMany();
    expect(flowsB).toHaveLength(1);
    expect(flowsB[0].tenant_id).toBe(tenantB.id);

    // 5. Verify isolation on aggregate/count
    const countA = await clientA.flow.count();
    expect(countA).toBe(2);
  });

  it('should prevent deleting other tenant data', async () => {
      const tenantC = await rootPrisma.tenant.create({
        data: { name: 'Tenant C', email: 'c@example.com' },
      });
      const tenantD = await rootPrisma.tenant.create({
        data: { name: 'Tenant D', email: 'd@example.com' },
      });

      const clientC = rootPrisma.getClient(tenantC.id);
      const clientD = rootPrisma.getClient(tenantD.id);

      const flowC = await clientC.flow.create({
        data: { name: 'Flow C', trigger_type: 'keyword', flow_data: {} } as any,
      });

      // Attempt to delete Flow C using Tenant D's client
      await clientD.flow.deleteMany({
          where: { id: flowC.id }
      });

      // Ensure Flow C still exists in Tenant C
      const checkFlowC = await clientC.flow.findUnique({
          where: { id: flowC.id }
      });

      expect(checkFlowC).toBeDefined();
      expect(checkFlowC?.id).toBe(flowC.id);
  });
});
