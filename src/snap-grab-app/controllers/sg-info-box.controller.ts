import { Body, Controller, Post, Put, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { CrudController } from '../../cms/content/controllers/crud-controller';
import { Repository } from 'typeorm';
import { RolesAndPermissionsService } from '../../cms/roles-and-permissions/services/roles-and-permissions.service';
import { ContentPermissionHelper, ContentPermissionsKeys } from '../../cms/roles-and-permissions/misc/content-permission-helper';
import { SgInfoBoxEntity } from '../entities/sg-info-box.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CrudEntity } from '../../cms/content/decorators/crud-controller.decorator';
import { ContentPermissionsGuard } from '../../cms/content/guards/content-permissions.guard';
import { MenuItemEntity } from '../../merchants/entities/menu-item.entity';
import { User } from '../../cms/users/decorators/user.decorator';
import { UserEntity } from '../../cms/users/entities/user.entity';
import { ContentEntityNotFoundGuard } from '../../cms/content/guards/content-entity-not-found.guard';
import { ContentEntityParam } from '../../cms/content/decorators/content-entity-param.decorator';
import * as fs from 'fs';

@Controller('sg-info-box')
@CrudEntity(SgInfoBoxEntity)
export class SgInfoBoxController extends CrudController {

  constructor(
    @InjectRepository(SgInfoBoxEntity)
    protected readonly repository: Repository<SgInfoBoxEntity>,
    protected rolesAndPermissions: RolesAndPermissionsService,
    protected contentPermissionsHelper: ContentPermissionHelper,
  ) {
    super(rolesAndPermissions, contentPermissionsHelper);
  }

  @Post('')
  @UseGuards(ContentPermissionsGuard(isOwner => ContentPermissionsKeys[ContentPermissionsKeys.ContentAdd]))
  async createContentEntity(@Body() entity: MenuItemEntity, @User() user: UserEntity) {
    let image;
    if (entity.image) {
      image = entity.image;
      entity.image = null;
    }
    const newEntity = await super.createContentEntity(entity, user) as MenuItemEntity;
    if (image) {
      newEntity.image = image;
      newEntity.image = this.createImage(entity);
      return await this.repository.save(newEntity);
    }
    return newEntity;
  }

  @Put(':id')
  @UseGuards(ContentPermissionsGuard(isOwner => {
    if (isOwner) {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentEditOwn];
    } else {
      return ContentPermissionsKeys[ContentPermissionsKeys.ContentEdit];
    }
  }))
  @UseGuards(ContentEntityNotFoundGuard)
  async updateContentEntity(
    @User() user: UserEntity,
    @ContentEntityParam() currentEntity: MenuItemEntity,
    @Body() newEntity: MenuItemEntity,
  ) {
    if (newEntity.image) {
      newEntity.image = this.createImage(newEntity);
    } else if (newEntity.image === null) {
      if (currentEntity.image) {
        const imgPath = currentEntity.image.replace('/', '');
        fs.unlink(imgPath, () => {});
      }
    }
    return super.updateContentEntity(user, currentEntity, newEntity);
  }

  private createImage(entity: MenuItemEntity) {
    const jpegStartStr = 'data:image/jpeg;base64,';
    const pngStartStr = 'data:image/png;base64,';
    const isJpeg = entity.image.startsWith(jpegStartStr);
    const isPng = entity.image.startsWith(pngStartStr);
    if (!isJpeg && !isPng) {
      throw new UnprocessableEntityException('Image format is wrong');
    }
    const ext = isJpeg ? '.jpg' : '.png';
    const { path, fileName } = this.getFileName(entity.id, ext);
    const data = isJpeg ? entity.image.replace(jpegStartStr, '') : entity.image.replace(pngStartStr, '');
    try {
      fs.readdirSync(path);
    } catch (e) {
      fs.mkdirSync(path, { recursive: true });
    }
    const filePath = `${path}/${fileName}`;
    fs.writeFileSync(filePath, data, 'base64');
    return `/${filePath}`;
  }

  private getFileName(id: number | string, ext: string) {
    const path = 'uploads/sg-info-box/image';
    const fileName = 'sg-info-box-' + id + ext;
    return { path, fileName };
  }
}
