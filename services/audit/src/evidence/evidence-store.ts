export interface EvidenceStoreConfig {
  rootPath: string;
}

export class LocalEvidenceStore {
  constructor(private readonly config: EvidenceStoreConfig) {}

  getRootPath(): string {
    return this.config.rootPath;
  }
}
