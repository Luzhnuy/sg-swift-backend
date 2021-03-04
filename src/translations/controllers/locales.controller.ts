import { Controller, Get, Param } from '@nestjs/common';
import * as fs from 'fs';

@Controller('locales')
export class LocalesController {

  private readonly path = 'locales';

  @Get(':filename')
  getFile(
    @Param('filename') filename: string,
  ) {
    const fileName = `${this.path}/${filename}`;
    return new Promise(resolve => {
      fs.readFile(fileName, (err, data) => {
        if (err) {
          resolve({});
        }
        resolve(JSON.parse(data.toString()));
      });
    });
  }

}
