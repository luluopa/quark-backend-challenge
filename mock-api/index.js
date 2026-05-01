const express = require('express');
const app = express();
const port = 4000;

app.use(express.json());

app.get('/enrich/:cnpj', (req, res) => {
  const { cnpj } = req.params;
  
  // Simula um atraso de rede
  setTimeout(() => {
    // Simula uma falha aleatória (10% de chance) para testar a resiliência
    if (Math.random() < 0.1) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.json({
      companyName: "Tech Corp",
      tradeName: "Tech Corp Soluções",
      cnpj: cnpj,
      industry: "SaaS",
      legalNature: "Sociedade Empresária Limitada",
      employeeCount: 120,
      annualRevenue: 1500000,
      foundedAt: "2015-03-10",
      address: {
        street: "Rua das Inovações",
        number: "500",
        complement: "Sala 42",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
        zipCode: "01001-000",
        country: "BR"
      },
      cnaes: [
        { code: "6201-5/00", description: "Desenvolvimento de programas de computador sob encomenda", isPrimary: true },
        { code: "6202-3/00", description: "Desenvolvimento e licenciamento de programas de computador customizáveis", isPrimary: false }
      ],
      partners: [
        {
          name: "Ana Souza",
          cpf: "***.456.789-**",
          role: "Sócia Administradora",
          joinedAt: "2015-03-10",
          phone: "+55 11 99999-1111",
          email: "ana.souza@techcorp.com"
        }
      ],
      phones: [
        { type: "commercial", number: "+55 11 3000-1234" }
      ],
      emails: [
        { type: "commercial", address: "contato@techcorp.com" }
      ]
    });
  }, 500);
});

app.listen(port, () => {
  console.log(`Mock API running at http://localhost:${port}`);
});