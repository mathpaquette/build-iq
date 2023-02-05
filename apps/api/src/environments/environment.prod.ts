import { AppDataSource } from '@tskmgr/db';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { Environment } from './environment';
import { FileEntity } from '../files/file.entity';
import { RunEntity } from '../runs/run.entity';
import { TaskEntity } from '../tasks/task.entity';
import { version } from '../../../../package.json';

const { type, host, port, username, password, database } = AppDataSource.options as PostgresConnectionOptions;

export const environment: Environment = {
  production: true,
  version: version,
  datasource: {
    type,
    host,
    port,
    username,
    password,
    database,
    autoLoadEntities: true,
    synchronize: false,
    entities: [FileEntity, RunEntity, TaskEntity],
  },
  multer: {
    dest: './files',
  },
};
