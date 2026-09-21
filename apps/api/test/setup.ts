import 'reflect-metadata';

// Contract tests run against the in-memory driver unless a suite opts into MySQL.
process.env.OKVNS_STORAGE_DRIVER ??= 'memory';
