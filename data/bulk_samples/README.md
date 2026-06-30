# Bulk CSV fallback samples

These two files are placeholders shaped exactly like EPA's real SDWA bulk
export (`SDWA_PUB_WATER_SYSTEMS.csv` / `SDWA_VIOLATIONS_ENFORCEMENT.csv`,
joined on `PWSID`). They exist so `runBulkCsvIngestion()` has something to
ingest in environments without outbound internet access (this build
environment included — its network policy blocks `data.epa.gov`).

**These rows are illustrative, not verified live EPA records.** System and
violation counts are representative of what a real Michigan pull would look
like, but were not downloaded from EPA. To get real data:

1. Download the SDWA bulk ZIP from EPA's ECHO data downloads page.
2. Extract `SDWA_PUB_WATER_SYSTEMS.csv` and `SDWA_VIOLATIONS_ENFORCEMENT.csv`
   into this directory (or pass custom paths to `runBulkCsvIngestion`).
3. Re-run the "Refresh regional data" admin action, or call
   `runLiveIngestion(["MI"])` directly from an environment with open
   network egress to pull live from `data.epa.gov` instead.
