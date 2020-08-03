import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTokenEntity } from '../entities/api-token.entity';
import { UserEntity } from '../../cms/users/entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class ApiTokensService {

  constructor(
    @InjectRepository(ApiTokenEntity) private readonly repository: Repository<ApiTokenEntity>,
  ) {}

  async getTokenByUserId(userId: number) {
    return this.repository
      .findOne({ userId });
  }

  async getUserIdByToken(token: string) {
    return this.repository
      .findOne({ token });
  }

  async generateToken(user: number | UserEntity) {
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
    return this.saveToken(userId);
  }

  async removeToken(token: string) {
    const tokenExists = await this.repository
      .findOne({ token });
    if (tokenExists) {
      return this.repository
        .remove(tokenExists);
    } else {
      throw new NotFoundException('Token wasn\'t found');
    }
  }

  private async saveToken(userId) {
    const apiToken = new ApiTokenEntity({ userId });
    return this.repository
      .save(apiToken);
    // const token = this.getRandToken();
    // console.log('saveToken', token, token.length);
    // const tokenExists = await this.repository
    //   .findOne({ token });
    // if (tokenExists) {
    //   return await this.saveToken(userId);
    // } else {
    //   const apiToken = new ApiTokenEntity({ userId, token });
    //   return await this.repository
    //     .save(apiToken);
    // }
  }

  private getRandToken() {
    return crypto.randomBytes(20).toString('hex');
  }
}
