import 'reflect-metadata';

// Default the API test suite to the non-durable in-memory storage profile so
// fast contract tests need no database. Tests that exercise MySQL behavior opt
// in explicitly by setting OKVNS_STORAGE_DRIVER=mysql with connection details.
process.env.OKVNS_STORAGE_DRIVER ??= 'memory';
