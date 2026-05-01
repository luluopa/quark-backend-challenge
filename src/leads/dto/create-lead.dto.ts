import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { LeadSource } from '@prisma/client';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  companyName: string;

  @IsString()
  @IsNotEmpty()
  companyCnpj: string;

  @IsUrl()
  @IsOptional()
  companyWebsite?: string;

  @IsNumber()
  @IsOptional()
  estimatedValue?: number;

  @IsEnum(LeadSource)
  @IsNotEmpty()
  source: LeadSource;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
