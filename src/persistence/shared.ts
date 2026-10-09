import { createIndexedDbRepository, type MapRepository } from './repository';

let shared: MapRepository | undefined;

/** The app-wide store of maps on this device, opened on first use. */
export function getRepository(): MapRepository {
  shared ??= createIndexedDbRepository();
  return shared;
}
