import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTokenEntity } from '../entities/api-token.entity';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { ApiTestTokenEntity } from '../entities/api-test-token.entity';

@Injectable()
export class ApiTokensService {

  constructor(
    @InjectRepository(ApiTokenEntity) private readonly repository: Repository<ApiTokenEntity>,
    @InjectRepository(ApiTestTokenEntity) private readonly repositoryTest: Repository<ApiTestTokenEntity>,
  ) {}

  async getTokenByUserId(userId: number, production = true) {
    return this.getRepository(production)
      .findOne({ userId });
  }

  async getByToken(token: string, production = true) {
    return this.getRepository(production)
      .findOne({ token });
  }

  async generateToken(user: number | UserEntity, production = true) {
    let userId: number;
    switch (typeof user) {
      case 'number':
        userId = user;
        break;
      case 'string':
        userId = parseInt(user, 10);
        break;
      default:
        userId = user.id;
        break;
    }
    return this.saveToken(userId, production);
  }

  async removeToken(token: string, production = true) {
    const tokenExists = await this.getRepository(production)
      .findOne({ token });
    if (tokenExists) {
      return this.getRepository(production)
        .remove(tokenExists);
    } else {
      throw new NotFoundException('Token wasn\'t found');
    }
  }

  private async saveToken(userId, production: boolean) {
    const apiToken = new ApiTokenEntity({ userId });
    return this.getRepository(production)
      .save(apiToken);
  }

  private getRepository(production: boolean): Repository<ApiTokenEntity | ApiTestTokenEntity> {
    return production ? this.repository : this.repositoryTest;
  }
}
