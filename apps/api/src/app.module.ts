import { Module, type Provider } from '@nestjs/common';
import {
  CreateEntryUseCase,
  CreateNamespaceUseCase,
  DeleteEntryUseCase,
  DeleteNamespaceUseCase,
  ExportYamlUseCase,
  ExportNamespaceYamlUseCase,
  GetEntryUseCase,
  GetNamespaceUseCase,
  ImportYamlUseCase,
  ListEntriesUseCase,
  ListNamespacesUseCase,
  type NamespaceRepository,
  UpdateEntryUseCase,
  UpdateNamespaceUseCase,
} from '@okvns/application';
import { HealthController } from './health/health.controller';
import { NamespacesController } from './namespaces/namespaces.controller';
import { EntriesController } from './entries/entries.controller';
import { YamlController } from './yaml/yaml.controller';
import { PersistenceModule } from './infrastructure/persistence.module';
import { NAMESPACE_REPOSITORY } from './infrastructure/tokens';

/** Wires a use case class to a provider constructed from the repository port. */
function useCaseProvider<T>(token: new (repository: NamespaceRepository) => T): Provider {
  return {
    provide: token,
    useFactory: (repository: NamespaceRepository) => new token(repository),
    inject: [NAMESPACE_REPOSITORY],
  };
}

@Module({
  imports: [PersistenceModule],
  controllers: [HealthController, NamespacesController, EntriesController, YamlController],
  providers: [
    useCaseProvider(CreateNamespaceUseCase),
    useCaseProvider(ListNamespacesUseCase),
    useCaseProvider(GetNamespaceUseCase),
    useCaseProvider(UpdateNamespaceUseCase),
    useCaseProvider(DeleteNamespaceUseCase),
    useCaseProvider(CreateEntryUseCase),
    useCaseProvider(ListEntriesUseCase),
    useCaseProvider(GetEntryUseCase),
    useCaseProvider(UpdateEntryUseCase),
    useCaseProvider(DeleteEntryUseCase),
    useCaseProvider(ImportYamlUseCase),
    useCaseProvider(ExportYamlUseCase),
    useCaseProvider(ExportNamespaceYamlUseCase),
  ],
})
export class AppModule {}
