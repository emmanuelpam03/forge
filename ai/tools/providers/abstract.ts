import type { ProviderImage } from "../image-types";

export interface ImageProvider {
  name: string;
  search(query: string, count?: number): Promise<ProviderImage[]>;
}
