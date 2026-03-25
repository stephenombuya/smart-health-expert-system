## Architecture
```
Structure of a SHES Transaction ID (64-bit integer):

 63      41  40      30  29     12  11      0
 |________|  |_______|  |_______|  |_______|
 Timestamp   Machine ID  Sequence  Randomness
  (23 bits)   (11 bits)  (18 bits)  (12 bits)

Epoch: 2024-01-01 00:00:00 UTC (SHES custom epoch)
Gives: ~279 years of valid IDs from the epoch
```