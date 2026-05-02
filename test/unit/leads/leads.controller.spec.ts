import { Test, TestingModule } from '@nestjs/testing';
import { LeadsController } from '../../../src/leads/leads.controller';
import { LeadsService } from '../../../src/leads/leads.service';

describe('LeadsController', () => {
  let controller: LeadsController;

  const mockLeadsService = {
    create: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadsController],
      providers: [
        { provide: LeadsService, useValue: mockLeadsService },
      ],
    }).compile();

    controller = module.get<LeadsController>(LeadsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
