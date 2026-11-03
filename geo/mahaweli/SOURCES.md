# Mahaweli raster assets

All final assets cover **[80.35, 6.65, 81.45, 8.70]** in `[west,south,east,north]` order, WGS84 longitude/latitude (EPSG:4326). Acquired 2026-09-12 UTC / 2026-09-13 Sri Lanka time.

## Application assets

- `mahaweli-satellite-2016.jpg`: 2048 columns × 4096 rows. North is at the top; image boundaries coincide with the bounding coordinates. Pixel size is 0.000537109375° longitude × 0.00050048828125° latitude, approximately 59.3 × 55.7 metres at the extent centre.
- `mahaweli-elevation-small.json`: 257 columns × 513 rows, 131841 elevation samples; recommended rendering mesh. Vertex spacing is 0.004296875° longitude × 0.00400390625° latitude, approximately 474 × 446 metres.
- `mahaweli-elevation.json`: 513 columns × 1025 rows, 525825 elevation samples; denser alternative. Vertex spacing is 0.0021484375° longitude × 0.002001953125° latitude, approximately 237 × 223 metres.
- `metadata.json`: exact source URLs, bounds, source tile list, license links, and transformations.

The JSON schema includes `bounds`, `columns`, `rows`, `elevations`, and `source`. Elevations are real source terrain values in metres, rounded to 0.1 m; they are flat row-major arrays ordered west to east and north to south. For row `r` and column `c`, read `elevations[r*columns+c]`. Longitude is `west+c/(columns-1)*(east-west)`; latitude is `north-r/(rows-1)*(north-south)`. The first and last vertices coincide with the bounding coordinates. Negative elevations are ocean bathymetry and have not been clamped. These grids contain no generated terrain.

The source terrain tiles are EPSG:3857 zoom 10, approximately 151.5 m per pixel at the extent centre. Each RGB pixel is decoded with `(red*256+green+blue/256)-32768`, then bilinearly sampled in its native Mercator coordinate system at the geographic output vertices. Thus longitude and latitude are evenly spaced in the output grid. Geographic JPEG image coordinates align directly with output mesh coordinates after normalizing both to the shared bounds.

## Sources and attribution

**Imagery:** EOX WMS layer `s2cloudless`, identified by its capabilities as "Sentinel-2 cloudless layer for 2016 by EOX - 4326". The requested WMS URL is recorded in metadata. The 2016 version uses [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), as confirmed by [EOX's release and licensing notice](https://eox.at/2017/08/sentinel-2-global-cloudless-mosaic/). This acquisition did not use the later noncommercial layers. Display the provider attribution with its links:

Sentinel-2 cloudless - [https://s2maps.eu](https://s2maps.eu) by [EOX IT Services GmbH](https://eox.at) (Contains modified Copernicus Sentinel data 2016 & 2017).

Modification: extracted geographic extent through WMS; diagnostic preview downsampled. Original returned JPEG retained without local image enhancements.

**Elevation:** [Mapzen Terrain Tiles on AWS](https://registry.opendata.aws/terrain-tiles/), public `elevation-tiles-prod` bucket, Terrarium format, zoom 10, x tiles 740–743, y tiles 487–493 (28 tiles). The provider [format documentation](https://github.com/tilezen/joerd/blob/master/docs/formats.md), [data source selection](https://github.com/tilezen/joerd/blob/master/docs/data-sources.md), and [attribution documentation](https://github.com/tilezen/joerd/blob/master/docs/attribution.md) describe the encoding and underlying public data. Sri Lanka land at this zoom uses SRTM according to the provider's source table; ocean uses ETOPO1. The broader service also includes GMTED2010. No vertical datum conversion has been applied.

Attribution: Mapzen Terrain Tiles; SRTM and GMTED2010 terrain data courtesy of the U.S. Geological Survey; global ETOPO1 terrain data courtesy of NOAA.

Modification: decoded Terrarium tiles, bilinear reprojection/sampling, rounding to 0.1 m. Terrain is intended for this regional visualization; the output mesh is coarser than the source tiles.

## Reproduction and inspection

`prepare_rasters.py` downloads the public assets using Python standard-library HTTP, Pillow, and NumPy. It caches original terrain PNGs under `terrarium-z10/`. `satellite-preview.jpg` and `elevation-preview.png` are small visual diagnostics. Only the application assets above are needed for offline use.

# Mahaweli basin assets

All geometry coordinates are WGS 84 longitude, latitude (EPSG:4326). These are extracted source polygons and river vectors, not hand-drawn illustrations. Retrieved 13 September 2026 (Sri Lanka local date).

## Ready for display

- `basin.geojson`: exact union of the nine official HydroBASINS level 8 Mahaweli polygons, displayed as one main basin.
- `subbasins.geojson`: 42 official, non-overlapping HydroBASINS level 9 units nested exactly in that main basin, updated 6 October 2026. Native IDs, Pfafstetter codes and routing attributes are retained. Labels SB-01 through SB-42 follow decreasing `DIST_SINK` (source flow-path distance to outlet), with the outlet last; all downstream connections increase in number. Labels are generic because the dataset does not name the individual tributary basins.
- `rivers.geojson`: all 949 extracted HydroRIVERS reaches belonging to MAIN_RIV 41399660, clipped to the displayed basin. Native attributes include Strahler order, river class, upstream area, downstream reach ID, and modeled long-term average discharge.
- `rivers-major.geojson`: 251 of those reaches with Strahler order >= 3, useful for a less dense overview.
- `river-mainstem.geojson`: 118 reaches with ORD_CLAS = 1, useful for highlighting the main stem.
- `rivers-display.geojson`: the full main stem plus tributary reaches with UPLAND_SKM >= 300 km², recommended for the overview renderer. Style ORD_CLAS = 1 more prominently than the other lines.

Each sub-basin has `id`, `label`, an interior `labelPoint` array `[longitude, latitude]`, `area_km2`, and a `downstream` sub-basin ID (null at outlet).

## Authoritative primary data

HydroBASINS version 1c, Asia, standard levels 8 and 9:

- Product: https://www.hydrosheds.org/products/hydrobasins
- Download: https://data.hydrosheds.org/file/hydrobasins/standard/hybas_as_lev08_v1c.zip
- Finer subdivisions, retrieved 6 October 2026: https://data.hydrosheds.org/file/hydrobasins/standard/hybas_as_lev09_v1c.zip
- Technical documentation: https://data.hydrosheds.org/file/technical-documentation/HydroBASINS_TechDoc_v1c.pdf
- Native shapefile retained in `hydrobasins-official/`.

HydroRIVERS version 1.0, Asia:

- Product: https://www.hydrosheds.org/products/hydrorivers
- Download: https://data.hydrosheds.org/file/HydroRIVERS/HydroRIVERS_v10_as_shp.zip
- Technical documentation: https://data.hydrosheds.org/file/technical-documentation/HydroRIVERS_TechDoc_v10.pdf
- Native shapefile retained in `hydrorivers-official/HydroRIVERS_v10_as_shp/`.

Both products originate from HydroSHEDS at 15 arc-second grid resolution (approximately 500 m at the equator). They represent modeled drainage geometry and do not incorporate current reservoir operations or inter-basin diversions. Appropriate credit: HydroBASINS / HydroRIVERS, HydroSHEDS; Lehner, B. and Grill, G. (2013), Hydrological Processes 27(15), 2171-2186, https://doi.org/10.1002/hyp.9740. The product pages link the HydroSHEDS license and permit scientific, educational and commercial use subject to its terms.

Exact governing license: HydroSHEDS Version 1 License Agreement, Appendix A, pages 24–29 of https://data.hydrosheds.org/file/technical-documentation/HydroSHEDS_TechDoc_v1_4.pdf. This is the custom HydroSHEDS license, not Creative Commons. Section 2.1.2 permits data incorporated into derivative works subject to the license conditions and does not permit distributing the source dataset as a standalone product. Exhibit B supplies the required attribution statement. Keep the original continental archives as research source material; use the clipped geometry only as part of the map product. The map's source/metadata panel should link the product pages, the license document, and the citation. `HYDROSHEDS-ATTRIBUTION.md` contains the required copyright notice for product documentation/metadata.

## Basin identity and reference comparison

The Sri Lanka National Spatial Data Infrastructure (NSDI), Inland Waters layer 6, identifies `Mahaweli Ganga Basin`, national basin number 60, objectid 90. It was downloaded separately to `nsdi-layer-6.geojson` and used as a name/location reference.

- NSDI product: https://www.nsdi.gov.lk/inland-waters
- Basin service: https://gisapps.nsdi.gov.lk/server/rest/services/SLNSDI/Inland_Waters/MapServer/6
- The NSDI query was `upper(basin_name) LIKE '%MAHAWELI%'`, returning one feature.
- NSDI source area attribute: 10,392.6 km²; bbox: [80.459729087, 6.766273054, 81.404414636, 8.527996280].

Intersecting the national basin with the official HydroBASINS level 8 polygons selected nine strong matches, all sharing `MAIN_BAS = 4080049680` and `NEXT_SINK = 4080049680`. Their `NEXT_DOWN` connections form one drainage network ending at the same outlet. Their Pfafstetter codes are 45800181 through 45800189. The HydroRIVERS outlet `HYRIV_ID = 41399660` is at approximately [81.2520833333, 8.4645833333], has `UPLAND_SKM = 10161.2`, and links the corresponding river network to `HYBAS_L12 = 4120049680`.

The displayed HydroBASINS union has bbox [80.4583333333, 6.7660993788, 81.3298221164, 8.4714006212]. The native `SUB_AREA` values sum to 10,161.2 km²; `area_km2` uses that sum consistently. An ellipsoidal geodesic calculation from the vector boundary gives 10,118.1 km². These different measurements are retained, rather than forcing the source polygon to equal a national reported basin area. The HydroBASINS union covers approximately 95.0% of the NSDI polygon in a longitude/latitude planar overlap comparison, with boundary differences particularly near the lower drainage/outlet region. NSDI is retained as a separate reference; it is not the displayed boundary because mixing the national outline with HydroBASINS subdivisions would break exact nesting.

## Verification

- All 42 displayed sub-basin geometries are valid.
- Pairwise sub-basin area overlap is zero.
- Their union exactly equals the nine original HydroBASINS geometries.
- Every label point lies inside its sub-basin.
- Every displayed sub-basin routes downstream to the outlet through retained HydroBASINS topology.
- River geometries are clipped to the displayed basin union.

Extraction scripts: `extract_basins.py`, `package_assets.py`, `extract_rivers.py`. Temporary regional service downloads and `nsdi-mahaweli-stream.geojson` were research intermediates only; the latter matched similarly named Mahaweligoda Ara streams and is NOT a Mahaweli river asset. Use only the ready-for-display files listed above.

Current subdivisions are prepared by `scripts/prepare-finer-basins.py`. `scripts/build-spatial-grid.py` intersects a 3 km radius hexagonal UTM zone 44N grid with those subdivisions to create 759 smaller management cells (formerly 249 cells on a 10 km square lattice). Their projected area totals approximately 10,110.1 km²; this is a different area measurement from native HydroBASINS `SUB_AREA`. The finer source union equals the existing main basin with zero symmetric-difference area.

# HydroSHEDS required product attribution

This product Riverkeeper incorporates data from the HydroSHEDS version 1 database which is © World Wildlife Fund, Inc. (2006-2022) and has been used herein under license. WWF has not evaluated the data as altered and incorporated within Riverkeeper, and therefore gives no warranty regarding its accuracy, completeness, currency or suitability for any particular purpose. Portions of the HydroSHEDS v1 database incorporate data which are the intellectual property rights of © USGS (2006-2008), NASA (2000-2005), ESRI (1992-1998), CIAT (2004-2006), UNEP-WCMC (1993), WWF (2004), Commonwealth of Australia (2007), and Her Royal Majesty and the British Crown and are used under license. The HydroSHEDS v1 database and more information are available at https://www.hydrosheds.org.

Source: Required attribution in Exhibit B, HydroSHEDS Technical Documentation v1.4, https://data.hydrosheds.org/file/technical-documentation/HydroSHEDS_TechDoc_v1_4.pdf.

HydroBASINS / HydroRIVERS citation: Lehner, B. and Grill, G. (2013). Global river hydrography and network routing: baseline data and new approaches to study the world’s large river systems. Hydrological Processes 27(15): 2171–2186. https://doi.org/10.1002/hyp.9740.


## Game display limitations
Forest and building models are exaggerated management symbols, not surveyed footprints. Forest foliage uses CC0 leaf textures from [Tree Small 02 by Rico Cilliers, Poly Haven](https://polyhaven.com/a/tree_small_02); [local asset credits](../../assets/trees/CREDITS.md). The tree branches and irregular grove placements are authored for this game.

The river renderer rounds corners within 216 metres of the source vertices while retaining all reach junction endpoints. Display width grows with upstream drainage area, with a minimum width for visibility; it is not a surveyed channel width. Animated ripples, view-dependent sky reflection and sun highlights are cosmetic, and neither their speed nor the displayed water colour represents modelled discharge or water quality. The actual river paths and junctions are retained. The terrain darkens smoothly through the existing 2 km buffer, with its coverage and playable extent unchanged. A separate icon toggles sub-basin colours and boundary lines; map labels are hidden. The source GeoJSON and simulation network are unchanged. A 2 km context buffer remains visible outside the basin; farther terrain is hidden.

The main app uses rivers-display.geojson renamed to rivers.geojson. Lower reaches are widened progressively with upstream area, with nine terrain-sampled vertices across each ribbon to reduce clipping. Elevations below zero are clamped to sea level, and land elevations are exaggerated threefold for display. Buildings are illustrative. The seasonal climate profiles, 24 monthly steps and routed 42-node scenario water balance are not a calibrated Mahaweli model. Image, terrain, and HydroSHEDS feature resolution differ; river highlights are drainage-model centerlines, not measured channel widths or water levels. Source comparisons and area differences are described above.


## Provisional hydropower screening (6 October 2026)

`scripts/prepare-hydro-sites.py` intersects mapped rivers with management cells and samples unexaggerated DEM elevations along reach coordinates. It retains river-adjacent cells at least 100 m high with a 20–250 m reach drop, selecting one site per sub-basin. Nine retained locations are in `dist/hydro-sites.mjs`; the model symbol uses the sampled downstream coordinate. These are game screening locations, not verified feasible projects or actual proposed dams. Reach direction, coarse elevation and sub-basin outflow proxies limit accuracy. See [power assumptions](../../ENERGY.md).
