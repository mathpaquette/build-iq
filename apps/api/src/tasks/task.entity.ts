import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DateUtil, Task, TaskPriority, TaskStatus } from '@tskmgr/common';
import { RunEntity } from '../runs/run.entity';
import { FileEntity } from '../files/file.entity';

@Entity({ name: 'task' })
export class TaskEntity implements Task {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne((type) => RunEntity, (run) => run.id)
  @JoinColumn({ name: 'run_id' })
  run: RunEntity;

  @OneToMany(() => FileEntity, (file) => file.task)
  files: FileEntity[];

  @Column()
  name: string;

  @Column()
  type: string;

  @Column()
  command: string;

  @Column({ type: 'simple-array', nullable: true })
  arguments: string[];

  @Column({ type: 'jsonb', nullable: true })
  options: object;

  @Column({ name: 'runner_id', nullable: true })
  runnerId: string;

  @Column({ type: 'jsonb', name: 'runner_info', nullable: true })
  runnerInfo: { [key: string]: string };

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.Pending })
  status: TaskStatus;

  @Column({ nullable: true })
  cached: boolean;

  @Column({ type: 'real', nullable: true })
  duration: number;

  @Column({ type: 'real', name: 'avg_duration', nullable: true })
  avgDuration: number;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.Longest })
  priority: TaskPriority;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'started_at', nullable: true })
  startedAt: Date;

  @Column({ name: 'ended_at', nullable: true })
  endedAt: Date;

  public hasEnded(): boolean {
    return !!this.endedAt;
  }

  public start(runnerId: string, runnerInfo: { [key: string]: string }): void {
    if (this.startedAt) {
      throw new Error(`Can't start already started task.`);
    }

    this.startedAt = new Date();
    this.status = TaskStatus.Running;
    this.runnerId = runnerId;
    this.runnerInfo = runnerInfo;
  }

  public complete(cached: boolean): void {
    if (!this.startedAt || this.endedAt) {
      throw new Error(`Task with ${this.status} status can't change to ${TaskStatus.Completed}`);
    }

    const endedAt = new Date();
    this.endedAt = endedAt;
    this.status = TaskStatus.Completed;
    this.duration = DateUtil.getDurationInSeconds(this.startedAt, endedAt);
    this.cached = cached;
  }

  public fail(): void {
    if (!this.startedAt || this.endedAt) {
      throw new Error(`Task with ${this.status} status can't change to ${TaskStatus.Failed}`);
    }

    const endedAt = new Date();
    this.endedAt = endedAt;
    this.status = TaskStatus.Failed;
    this.duration = DateUtil.getDurationInSeconds(this.startedAt, endedAt);
  }
}
