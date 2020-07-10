export interface IEnvironment {
  mysql: {
    database: string,
    databaseOld: string,
    username: string,
    password: string,
    type: 'mysql',
    host: string,
    port: number,
    synchronize: boolean,
    charset: string,
    logging: boolean,
  };
}

export const Environment: IEnvironment = {
  mysql: {
    database: 'database',
    databaseOld: 'database_old',
    username: 'username',
    password: 'password',
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    synchronize: true,
    charset: 'utf8mb4_unicode_ci',
    logging: false,
  },
};
