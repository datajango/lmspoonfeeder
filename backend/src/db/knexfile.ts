import { Knex } from 'knex';
import { config } from '../config';

const knexConfig: Knex.Config = {
    client: 'pg',
    connection: {
        host: config.db.host,
        port: config.db.port,
        database: config.db.name,
        user: config.db.user,
        password: config.db.password,
    },
    pool: {
        min: 2,
        max: 10,
    },
    migrations: {
        directory: './migrations',
        extension: 'ts',
    },
};

export default knexConfig;
