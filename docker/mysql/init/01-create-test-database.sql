-- Creates the database used by the API's MySQL integration tests.
--
-- Those tests DROP and re-apply the schema before every test, so they need a
-- database separate from `okvns` to avoid wiping local development data.
-- `MYSQL_DATABASE` only creates a single database and only grants the `okvns`
-- user on that one, so the test database needs this explicit grant.
--
-- Run the MySQL-backed tests against it with:
--   OKVNS_TEST_MYSQL_HOST=127.0.0.1 OKVNS_TEST_MYSQL_DATABASE=okvns_test \
--   OKVNS_TEST_MYSQL_USER=okvns OKVNS_TEST_MYSQL_PASSWORD=okvns \
--   pnpm --filter @okvns/api run test
--
-- The tables themselves are not created here: each test applies the migrations
-- in apps/api/migrations itself.
CREATE DATABASE IF NOT EXISTS okvns_test;
GRANT ALL PRIVILEGES ON okvns_test.* TO 'okvns'@'%';
FLUSH PRIVILEGES;
