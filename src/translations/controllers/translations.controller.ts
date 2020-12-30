import { Body, Controller, Get, Param, Post, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import * as fs from 'fs';
import { PermissionsGuard } from '../../cms/roles-and-permissions/guards/permissions.guard';
import { TranslationPermissionKeys } from '../providers/translations-config';

@Controller('translations')
export class TranslationsController {

  private readonly languages = ['fr', 'en'];
  private readonly path = 'locales';

  @Get('files-list')
  @UseGuards(PermissionsGuard(() => TranslationPermissionKeys.AllowEditWebTranslations))
  getFilesList() {
    try {
      fs.readdirSync(this.path);
    } catch (e) {
      fs.mkdirSync(this.path, { recursive: true });
    }
    const res = fs.readdirSync(this.path);
    const fileNames = res.reduce((result: string[], fullFileName) => {
      const fileName = fullFileName.slice(3);
      if (result.indexOf(fileName) === -1) {
        result.push(fileName);
      }
      return result;
    }, []);
    return fileNames;
  }

  @Post('save-data/:filename')
  @UseGuards(PermissionsGuard(() => TranslationPermissionKeys.AllowEditWebTranslations))
  saveFileFromData(
    @Body() json: {
      [key: string]: any,
    },
    @Param('filename') filename: string,
  ) {
    this.languages.forEach(lang => {
      const data = json[lang];
      if (data) {
        const fileName = `${this.path}/${lang}-${filename}`;
        fs.writeFileSync(fileName, JSON.stringify(data));
      }
    });
    return {
      success: true,
    };
  }

}
