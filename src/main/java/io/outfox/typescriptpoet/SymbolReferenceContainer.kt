package io.outfox.typescriptpoet


interface SymbolReferenceTracker {

  fun referenced(symbol: SymbolSpec)

}
