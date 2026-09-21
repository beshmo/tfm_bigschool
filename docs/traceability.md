# Spec-to-Test Traceability

`openspec/specs/<capability>/spec.md` scenarios are the acceptance criteria. Tests
are BDD-style (`GIVEN ... WHEN ... THEN ...`) and colocated with source, so this
table maps each capability to the files that exercise it. Count scenarios with
`grep -c "^#### Scenario" openspec/specs/*/spec.md`.

| Capability                 | Scenarios | Primary tests                                                                                                                                                                                                                                               |
| -------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `okvns-domain`             | 11        | `packages/domain/src/{namespace,entry,resource-name,errors}.test.ts`, `packages/shared/src/index.test.ts`                                                                                                                                                   |
| `namespace-management`     | 27        | `packages/application/src/{namespace-use-cases,list-query}.test.ts`, `apps/api/src/api.contract.test.ts`, `apps/api/src/mysql-persistence.contract.test.ts` (whole-second timestamps, needs `OKVNS_TEST_MYSQL_*`), `e2e/{namespaces,list-controls}.spec.ts` |
| `entry-management`         | 33        | `packages/application/src/{entry-use-cases,list-query}.test.ts`, `apps/api/src/api.contract.test.ts`, `e2e/{entries,list-controls}.spec.ts`                                                                                                                 |
| `markdown-bulk-operations` | 30        | `packages/yaml/src/yaml.test.ts` (key allowlists, shapes, duplicates), `packages/application/src/yaml-use-cases.test.ts` (atomic import, upsert), `apps/api/src/api.contract.test.ts`, `e2e/{import,export}.spec.ts`                                        |
| `persistent-storage`       | 12        | `apps/api/src/infrastructure/mysql/mysql-namespace-repository.integration.test.ts` (incl. LIKE `%`/`_` matched literally), `apps/api/src/mysql-persistence.contract.test.ts`, `apps/api/src/infrastructure/in-memory-namespace-repository.test.ts`          |
| `api-documentation`        | 13        | `apps/api/src/api.contract.test.ts` (OpenAPI document, Swagger UI, documented query allowlists); the Markdown scenarios are checked by review of `docs/api-and-yaml.md`                                                                                     |
| `deployment-foundation`    | 19        | `apps/api/src/api.contract.test.ts` (health/readiness); container, Compose, Kubernetes and Helm scenarios are verified by CI image builds and manual deploy, not unit tests                                                                                 |
| `admin-frontend`           | 40        | `apps/admin-web/src/{App,api/okvns-api,pages/*}.test.tsx`, `e2e/*.spec.ts`; the UI structure inventory is verified by the page tests and review                                                                                                             |
| `okvns-wrapper-library`    | 18        | `packages/okvns-wrapper/src/wrapper.test.ts`                                                                                                                                                                                                                |
| `demo-web`                 | 8         | `apps/demo-web/src/App.test.tsx`                                                                                                                                                                                                                            |

## Notes

- MySQL integration and contract tests run only when `OKVNS_TEST_MYSQL_*` is set
  and skip otherwise; all other API tests use the in-memory driver.
- `domain`, `application` and `yaml` enforce 100% coverage, so every branch in
  those packages has a test even if a spec scenario does not name it.
- This mapping is per capability, not per scenario. When adding a scenario, add
  or extend a test in the listed files and keep the test's `GIVEN/WHEN/THEN` name
  close to the scenario wording so it can be found with a text search.
