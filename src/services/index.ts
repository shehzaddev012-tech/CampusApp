import { apiBackend } from './api/apiBackend';
import type { Backend } from './types';

/** The single entry point to the backend (the CampusHub API). */
export const backend: Backend = apiBackend;
export type { Backend } from './types';
