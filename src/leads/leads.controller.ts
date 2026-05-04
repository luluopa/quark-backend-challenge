import { Controller, Post, Body, Get, Param, Query, Patch } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadSource } from '@prisma/client';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  async create(@Body() createLeadDto: CreateLeadDto) {
    return this.leadsService.create(createLeadDto);
  }

  @Get('export')
  async exportData() {
    return this.leadsService.exportData();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto) {
    return this.leadsService.update(id, updateLeadDto);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('source') source?: LeadSource,
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    
    return this.leadsService.findAll(pageNumber, limitNumber, search, source);
  }

  @Post(':id/enrichment')
  async requestEnrichment(@Param('id') id: string) {
    return this.leadsService.requestEnrichment(id);
  }

  @Post(':id/classification')
  async requestClassification(@Param('id') id: string) {
    return this.leadsService.requestClassification(id);
  }
}
