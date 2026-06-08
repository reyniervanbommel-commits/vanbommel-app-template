'use strict';

const { parseSqlConnectionString } = require('./sqlConnectionConfig');

describe('parseSqlConnectionString', () => {
  it('zet ADO connection string om naar mssql object-config', () => {
    const config = parseSqlConnectionString(
      'Server=localhost,1433;Database=vanbommel-dev;User Id=sa;Password=secret;Encrypt=false;',
    );

    expect(config).toEqual({
      user: 'sa',
      password: 'secret',
      server: 'localhost',
      port: 1433,
      database: 'vanbommel-dev',
      options: { encrypt: false },
    });
  });

  it('gebruikt localhost zonder poort als server ontbreekt', () => {
    const config = parseSqlConnectionString('User Id=app;Password=pw;Database=dev;');

    expect(config.server).toBe('localhost');
    expect(config.port).toBeUndefined();
    expect(config.user).toBe('app');
  });

  it('interpreteert Encrypt=true correct', () => {
    const config = parseSqlConnectionString('Server=db;Encrypt=true;');

    expect(config.options.encrypt).toBe(true);
  });
});
