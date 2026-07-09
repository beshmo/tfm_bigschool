## MODIFIED Requirements

### Requirement: Domain errors are explicit
The domain SHALL expose explicit business errors for invalid names, duplicate namespaces, duplicate entries, missing namespaces, missing entries, and invalid YAML shapes.

#### Scenario: Business rule fails
- **WHEN** a domain invariant is violated
- **THEN** the domain returns or throws a typed business error that can be mapped by presentation layers

#### Scenario: YAML shape is invalid
- **WHEN** imported YAML violates the OKVNS YAML shape
- **THEN** the system returns or throws a typed invalid YAML error that can be safely mapped by presentation layers
