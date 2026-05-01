import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  RabbitmqService,
  ENRICHMENT_QUEUE,
} from '../rabbitmq/rabbitmq.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmqService: RabbitmqService,
  ) {}

  async create(dto: CreateLeadDto) {
    // Validação de unicidade
    const existingEmail = await this.prisma.lead.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) throw new ConflictException('Email already in use');

    const existingCnpj = await this.prisma.lead.findUnique({
      where: { companyCnpj: dto.companyCnpj },
    });
    if (existingCnpj) throw new ConflictException('CNPJ already in use');

    // Cria o lead com status PENDING
    const newLead = await this.prisma.lead.create({
      data: {
        ...dto,
        status: 'PENDING',
      },
    });

    // DISPARO ÚNICO: Apenas Enriquecimento (O encadeamento para Classificação será feito pelo Worker)
    await this.rabbitmqService.publish(ENRICHMENT_QUEUE, {
      leadId: newLead.id,
    });

    return newLead;
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        enrichments: { orderBy: { requestedAt: 'desc' } },
        classifications: { orderBy: { requestedAt: 'desc' } },
      },
    });
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);
    return lead;
  }
}
