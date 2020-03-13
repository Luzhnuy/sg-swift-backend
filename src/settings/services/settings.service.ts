import { Injectable } from '@nestjs/common';
import { SettingsEntity } from '../entities/settings.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ReplaySubject } from 'rxjs';

@Injectable()
export class SettingsService {

  private $$inited = new ReplaySubject(1);
  public $inited = this.$$inited.asObservable();

  private $$loaded = new ReplaySubject(1);
  public $loaded = this.$$loaded.asObservable();

  private settings: SettingsEntity[];
  private settingsMap = new Map<string, SettingsEntity>();

  constructor(
    @InjectRepository(SettingsEntity) protected readonly repository: Repository<SettingsEntity>,
  ) {
    this.loadSettings()
      .then(() => {
        this.$$loaded.next(true);
      });
  }

  public all() {
    return this.settings;
  }

  public has(key: string) {
    return this.settingsMap.has(key);
  }

  public get(key: string) {
    return this.settingsMap.get(key);
  }
  public getValue(key: string) {
    const setting = this.settingsMap.get(key);
    return setting ? setting.value : null;
  }

  public async set(settingsItem: SettingsEntity) {
    const test = new SettingsEntity(settingsItem);
    settingsItem = await this.repository.save(test);
    this.loadSettings();
    return settingsItem;
  }

  public async remove(key: string) {
    await this.repository.delete({ key });
    this.settingsMap.delete(key);
  }

  public async init(settingsItems: SettingsEntity[]) {
    // await this.loadSettings();
    for (const settingsItem of settingsItems) {
      if (!this.has(settingsItem.key)) {
        await this.repository.save(settingsItem);
      }
    }
    await this.loadSettings();
    this.$$inited.next(true);
  }

  private async loadSettings() {
    this.settings = await this.repository.find();
    this.settings.forEach(settingsItem => {
      this.settingsMap.set(settingsItem.key, settingsItem);
    });
    return this.settings;
  }
}
