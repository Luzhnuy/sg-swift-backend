import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SchedulerTaskEntity } from '../entities/scheduler-task.entity';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import * as dateFormat from 'dateformat';

export const LessThanOrEqualDate = (date: Date) => LessThanOrEqual(dateFormat(date, 'isoDateTime'));

@Injectable()
export class SchedulerService {

  private tasksThread: Subject<SchedulerTaskEntity> = new Subject();

  constructor(
    @InjectRepository(SchedulerTaskEntity)
    private readonly repository: Repository<SchedulerTaskEntity>,
  ) {
    const now = new Date();
    const diff = (61 - now.getSeconds()) * 1000;
    setTimeout(() => {
      this.iterate();
      setInterval(() => this.iterate(), 60000);
    }, diff);
  }

  getById(id: number) {
    return this.repository
      .findOne(id);
  }

  getThread(key: string) {
    return this.tasksThread
      .pipe(
        filter(task => task.key === key),
      );
  }

  addTask(task: SchedulerTaskEntity) {
    // TODO validation
    return this.repository
      .save(task);
  }

  removeTask(task: SchedulerTaskEntity) {
    return this.repository.remove(task);
  }

  async runTask(task: SchedulerTaskEntity) {
    if (task.interval) {
      const newScheduledDate = new Date();
      newScheduledDate.setTime(newScheduledDate.getTime() + task.interval * 1000);
      task.scheduledAt = newScheduledDate;
      task.lastRunAt = undefined;
      await this.repository.save(task);
    } else {
      await this.repository.remove(task);
    }
    this.tasksThread.next(task);
  }

  getTasksByKey(key: string) {
    return this.repository.find({ key });
  }

  private async iterate() {
    try {
      const d = new Date();
      const tasks = await this.repository
        .find({
          scheduledAt: LessThanOrEqualDate(d),
        });
      for (const task of tasks) {
        await this.runTask(task);
      }
    } catch (e) {
      console.error(e);
    }
  }
}
