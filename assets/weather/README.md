# Course weather datasets

Source: [Climate.OneBuilding.org](https://climate.onebuilding.org/). All files are SRC-TMYx typical years built from the 2009-2023 record (NCEI ISD / ERA5, per the source headers).

The original EPW files are preserved. These public weather datasets retain their source attribution; the repository's code license does not assert ownership of the underlying observations.

Run `./reader generate:climate` to regenerate the browser data (src/climate-data.js for Ithaca and assets/weather/data/*.js for the other files), the comparison table, 28 vector drawings, the vector atlas, and the static principle content. Means and charts are computed in src/climate.js and src/climate-diagrams.js; no synthetic weather observations are substituted.

## Fairbanks, AK

- File: USA_AK_Fairbanks.Intl.AP.702610_TMYx.2009-2023.epw
- [Original archive](https://climate.onebuilding.org/WMO_Region_4_North_and_Central_America/USA_United_States_of_America/AK_Alaska/USA_AK_Fairbanks.Intl.AP.702610_TMYx.2009-2023.zip)
- Station: 702610, Fairbanks Intl AP, 64.804 N, 147.876 W, 131.7 m
- Local standard time: UTC-9; no daylight-saving shift in these plots
- Records: 8760; one hour each; 0 missing or out-of-range values in the analyzed fields
- EPW SHA-256: 6356af239c15f03263e69f2bf479fe1cb43a724d7d9e702f145b4a15d251e19d
- Retrieved: October 26, 2026

## Ithaca, NY

- File: USA_NY_Ithaca.Tompkins.Rgnl.AP.725155_TMYx.2009-2023.epw
- [Original archive](https://climate.onebuilding.org/WMO_Region_4_North_and_Central_America/USA_United_States_of_America/NY_New_York/USA_NY_Ithaca.Tompkins.Rgnl.AP.725155_TMYx.2009-2023.zip)
- Station: 725155, Ithaca Tompkins Rgnl AP, 42.483 N, 76.467 W, 335 m
- Local standard time: UTC-5; no daylight-saving shift in these plots
- Records: 8760; one hour each; 0 missing or out-of-range values in the analyzed fields
- EPW SHA-256: 092b41a15d1e26665ded1024b7087d89f94dabc2c973d1fa7f4373d4b0b55528
- Retrieved: October 22, 2026

## San Francisco, CA

- File: USA_CA_San.Francisco.Intl.AP.724940_TMYx.2009-2023.epw
- [Original archive](https://climate.onebuilding.org/WMO_Region_4_North_and_Central_America/USA_United_States_of_America/CA_California/USA_CA_San.Francisco.Intl.AP.724940_TMYx.2009-2023.zip)
- Station: 724940, San Francisco Intl AP, 37.62 N, 122.365 W, 5 m
- Local standard time: UTC-8; no daylight-saving shift in these plots
- Records: 8760; one hour each; 0 missing or out-of-range values in the analyzed fields
- EPW SHA-256: 30b75bf5ec7b5346d481ba57f843b10f747af4a407063fde0ce69b5812712f7c
- Retrieved: October 26, 2026

## Denver, CO

- File: USA_CO_Denver.Intl.AP.725650_TMYx.2009-2023.epw
- [Original archive](https://climate.onebuilding.org/WMO_Region_4_North_and_Central_America/USA_United_States_of_America/CO_Colorado/USA_CO_Denver.Intl.AP.725650_TMYx.2009-2023.zip)
- Station: 725650, Denver Intl AP, 39.833 N, 104.658 W, 1650.2 m
- Local standard time: UTC-7; no daylight-saving shift in these plots
- Records: 8760; one hour each; 0 missing or out-of-range values in the analyzed fields
- EPW SHA-256: 9c2ee2ca87feef31bd983ece40c84ccb6861f2df747e38ebe10471fd49460c92
- Retrieved: October 26, 2026

## Phoenix, AZ

- File: USA_AZ_Phoenix-Sky.Harbor.Intl.AP.722780_TMYx.2009-2023.epw
- [Original archive](https://climate.onebuilding.org/WMO_Region_4_North_and_Central_America/USA_United_States_of_America/AZ_Arizona/USA_AZ_Phoenix-Sky.Harbor.Intl.AP.722780_TMYx.2009-2023.zip)
- Station: 722780, Phoenix-Sky Harbor Intl AP, 33.428 N, 112.004 W, 337.4 m
- Local standard time: UTC-7; no daylight-saving shift in these plots
- Records: 8760; one hour each; 0 missing or out-of-range values in the analyzed fields
- EPW SHA-256: ddedd4bb29d60485512e78eeda2f79b6eca93364f11dcd0435f01500fbac8521
- Retrieved: October 26, 2026

## Miami, FL

- File: USA_FL_Miami.Natl.Hurricane.Center.722020_TMYx.2009-2023.epw
- [Original archive](https://climate.onebuilding.org/WMO_Region_4_North_and_Central_America/USA_United_States_of_America/FL_Florida/USA_FL_Miami.Natl.Hurricane.Center.722020_TMYx.2009-2023.zip)
- Station: 722020, Miami Natl Hurricane Center, 25.7552 N, 80.3836 W, 8.8 m
- Local standard time: UTC-5; no daylight-saving shift in these plots
- Records: 8760; one hour each; 0 missing or out-of-range values in the analyzed fields
- EPW SHA-256: 564702616d981c93a2db57ed7f885b59e915db14ede557fe8700b3cf3d237aa8
- Retrieved: October 26, 2026
