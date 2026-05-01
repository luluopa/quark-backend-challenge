import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Limpar banco antes de rodar o seed
  await prisma.aiClassification.deleteMany();
  await prisma.enrichment.deleteMany();
  await prisma.lead.deleteMany();

  const lead1 = await prisma.lead.create({
    data: {
      fullName: 'João da Silva',
      email: 'joao.silva@techcorp.com',
      phone: '+5511999991111',
      companyName: 'Tech Corp',
      companyCnpj: '12345678000199', // CNPJ que a Mock API conhece
      source: 'WEBSITE',
      status: 'PENDING',
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      fullName: 'Maria Souza',
      email: 'maria.souza@outraempresa.com',
      phone: '+5511988882222',
      companyName: 'Outra Empresa',
      companyCnpj: '98765432000199', // Outro CNPJ para testes
      source: 'REFERRAL',
      status: 'PENDING',
    },
  });

  console.log(`Created leads: ${lead1.id}, ${lead2.id}`);
  console.log('Seed finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
