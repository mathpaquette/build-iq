import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, IsNull, Repository } from 'typeorm';
import { RunEntity } from './run.entity';
import { CreateFileRequestDto, CreateRunRequestDto, SetLeaderRequestDto, SetLeaderResponseDto } from '@tskmgr/common';
import { FileEntity } from '../files/file.entity';
import { Express } from 'express';

@Injectable()
export class RunsService {
  constructor(
    @InjectRepository(RunEntity) private readonly runsRepository: Repository<RunEntity>,
    @InjectRepository(FileEntity) private readonly filesRepository: Repository<FileEntity>,
    private readonly dataSource: DataSource
  ) {}

  async createRun(createRunDto: CreateRunRequestDto): Promise<RunEntity> {
    const runEntity = this.runsRepository.create({
      name: createRunDto.name,
      type: createRunDto.type,
      url: createRunDto.url,
      parameters: createRunDto.parameters,
      prioritization: createRunDto.prioritization,
      affinity: createRunDto.affinity,
      failFast: createRunDto.failFast,
    });

    return this.runsRepository.save(runEntity);
  }

  async createFile(
    runId: number,
    file: Express.Multer.File,
    createFileRequestDto: CreateFileRequestDto
  ): Promise<FileEntity> {
    const run = await this.runsRepository.findOneBy({ id: runId });
    if (!run) {
      throw new Error(`Unable run find run id: ${runId}`);
    }

    const fileEntity = this.filesRepository.create({
      run: run,
      type: createFileRequestDto.type,
      description: createFileRequestDto.description,
      originName: file.originalname,
      filename: file.filename,
      mimeType: file.mimetype,
    });

    return this.filesRepository.save(fileEntity);
  }

  async close(id: number): Promise<RunEntity> {
    const run = await this.runsRepository.findOneBy({ id: id });
    run.close();
    return this.runsRepository.save(run);
  }

  async abort(id: number): Promise<RunEntity> {
    const run = await this.runsRepository.findOneBy({ id: id });
    run.abort();
    return this.runsRepository.save(run);
  }

  async fail(id: number): Promise<RunEntity> {
    const run = await this.runsRepository.findOneBy({ id: id });
    run.fail();
    return this.runsRepository.save(run);
  }

  async setLeader(runId: number, setLeaderRequestDto: SetLeaderRequestDto): Promise<SetLeaderResponseDto> {
    const { runnerId } = setLeaderRequestDto;

    return this.dataSource.transaction(async (manager) => {
      const run = await manager.findOne(RunEntity, {
        where: [
          {
            id: runId,
            leaderId: IsNull(),
          },
          {
            id: runId,
            leaderId: runnerId,
          },
        ],
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (run) {
        run.leaderId = runnerId;
        await manager.save(run);
      }

      return { leader: !!run, run: run };
    });
  }

  async findById(runId: number): Promise<RunEntity> {
    return this.runsRepository.findOne({
      where: { id: runId },
      relations: ['tasks', 'tasks.files', 'files', 'files.run', 'files.task'],
    });
  }

  async findAll(search: string): Promise<RunEntity[]> {
    return this.runsRepository.find({
      where: search ? { name: ILike(`%${search}%`) } : {},
      order: { id: 'DESC' },
      take: 100,
    });
  }
}
