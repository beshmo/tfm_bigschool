import { Module, type Provider } from '@nestjs/common';
import {
  CreateEntryUseCase,
  CreateNamespaceUseCase,
  DeleteEntryUseCase,
  DeleteNamespaceUseCase,
  ExportNamespaceYamlUseCase,
  ExportYamlUseCase,
  GetEntryUseCase,
  GetNamespaceUseCase,
  ImportYamlUseCase,
  ListEntriesUseCase,
  ListNamespacesUseCase,
  UpdateEntryUseCase,
  UpdateNamespaceUseCase,
  type NamespaceRepository,
} from '@okvns/application';
import { EntriesController } from './entries/entries.controller';
import { HealthController } from './health/health.controller';
import { PersistenceModule } from './infrastructure/persistence.module';
import { NamespacesController } from './namespaces/namespaces.controller';
import { NAMESPACE_REPOSITORY } from './tokens';
import { YamlController } from './yaml/yaml.controller';

/** Registers a use case class as a provider built from the repository port. */
export function useCaseProvider<T>(useCase: new (repository: NamespaceRepository) => T): Provider {
  return {
    provide: useCase,
    useFactory: (repository: NamespaceRepository) => new useCase(repository),
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
