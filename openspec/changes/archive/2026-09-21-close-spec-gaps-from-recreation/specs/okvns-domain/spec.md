## ADDED Requirements

### Requirement: Entry value length limit
The domain SHALL reject an entry value longer than 65,536 characters, measured as the JavaScript string length (UTF-16 code units), not bytes. The limit is defined once as `ENTRY_VALUE_MAX_LENGTH` in the shared package and SHALL be applied identically by the domain, the API request validation, and the YAML importer. An empty value is allowed.

#### Scenario: Value at the limit is accepted
- **WHEN** an entry is created with a value of exactly 65,536 characters
- **THEN** the domain returns an entry with that value

#### Scenario: Value over the limit is rejected
- **WHEN** an entry is created with a value of 65,537 characters
- **THEN** the domain returns a validation error without creating the entry
