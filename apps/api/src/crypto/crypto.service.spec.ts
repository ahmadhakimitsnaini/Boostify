import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    process.env.ENCRYPTION_SECRET = 'averysecretkeythatis32byteslong!'; // 32 bytes
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_SECRET;
  });

  it('should encrypt and decrypt a string correctly', () => {
    const plainText = 'EAAXXXXX_META_ACCESS_TOKEN';
    const encrypted = service.encrypt(plainText);

    expect(encrypted).not.toEqual(plainText);
    expect(encrypted).toContain(':'); // IV and auth tag separators

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toEqual(plainText);
  });

  it('should throw error if secret is missing', () => {
    delete process.env.ENCRYPTION_SECRET;
    expect(() => service.encrypt('test')).toThrow('ENCRYPTION_SECRET is not set');
  });
});
