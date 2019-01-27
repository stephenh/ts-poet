import { SymbolSpec } from './SymbolSpecs';

/**
 * Provides a hook for the CodeWriter to tell {@code FileSpec} all
 * of the types that are being rendered in the output.
 *
 * This lets FileSpec go back and make imports for all of the types in the file.
 */
export interface SymbolReferenceTracker {
  referenced(symbol: SymbolSpec): void;
}
