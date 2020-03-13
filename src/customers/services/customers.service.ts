import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerEntity } from '../entities/customer.entity';
import { CustomerMetadataEntity } from '../entities/customer-metadata.entity';

@Injectable()
export class CustomersService {

  constructor(
    @InjectRepository(CustomerEntity)
    protected readonly repository: Repository<CustomerEntity>,
    @InjectRepository(CustomerMetadataEntity)
    protected readonly repositoryMetadata: Repository<CustomerMetadataEntity>,
  ) {}

  get(params) {
    return this.repository.findOne(params);
  }

  saveMetadata(metadata: CustomerMetadataEntity) {
    return this.repositoryMetadata.save(metadata);
  }

}
