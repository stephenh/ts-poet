import {SymbolSpec} from "./SymbolSpecs";

export interface SymbolReferenceTracker {
  referenced(symbol: SymbolSpec): void
}

