# Provider Architecture
We decouple data fetching from the simulation logic by defining an abstraction \`PoolDataProvider\` allowing data loads (Meteora, Raydium) to output into unified \`NormalizedPool\` arrays tracking timestamps alongside \`PricePoint\` standards used by the generic offline CLMM tester.
