# Riverkeeper interface references

The local prototype uses the palette from [IWMI's official colour guide](https://branding.iwmi.org/our-colours/), checked 6 October 2026: dark blue `#28537D`, light blue `#5088C6`, sky blue `#46BBD4`, teal `#0297A6`, green `#22AD7A`, orange `#E86933`, yellow `#DD9103`, and light grey `#E8E7E7`. Dark blue and white lead the interface; secondary colours identify map boundaries and status.

The [official typography guide](https://branding.iwmi.org/our-typography/) specifies DM Serif Text for display text and National for body text. DM Serif Text is requested through Google Fonts, with Georgia as an offline fallback. National is commercial and is not distributed here; body text uses it only when installed, then falls back to Segoe UI or Arial.

This interface does not reproduce or alter the IWMI wordmark, and it does not assert IWMI endorsement. Riverkeeper remains the game's name. Icons are original functional symbols with consistent rounded outlines, rendered in IWMI dark blue on white or white on blue controls. They are not an official IWMI icon pack.

The map is the full-screen working surface. Resources and the month action sit in a bottom strip, management tools sit on the left, and the water balance opens allocation details. The user-provided Aqua Republica references informed this layout; the game uses original interface code and symbols.

The curved white command rail flows into the bottom strip, with four floating circular management controls and a large crossed-tools Build control. Main controls use a light-blue to dark-blue gradient; camera and layer controls share the same blue system. The palette is centralized in `game3d.css`. Secondary colours are reserved for map categories and status accents, following the guide's restrained colour usage. Organic curves are inspired by the [graphic-language guidance](https://branding.iwmi.org/our-graphic-language/); no restricted waterlet asset is reproduced.

The speaker starts quiet recorded stream and bird loops after a click. As the camera approaches settlements, filtered voices and traffic fade in; rivers and forests strengthen their respective layers. Volume is adjustable in the menu, muting is immediate, and sound pauses when the tab is hidden. These are illustrative recordings, not Mahaweli field data. See [recording credits and licenses](assets/audio/CREDITS.md).

Map controls: drag to rotate, Shift-drag or right-drag to pan, scroll to zoom toward the pointer. Arrow keys pan when the map is focused. Touch supports one-finger rotation and two-finger zoom/pan. The move tool swaps the drag controls. Separate rotation and tilt buttons are provided. Play view opens close to the terrain; Headwaters and Settlements move to those regions; Whole basin and From above frame the basin. Reduced-motion preferences disable camera flights and water animation.

Forest symbols use curved, textured leaf geometry on branching trunks, varied heights and ground-following placement. Leaf texture credit and license: [Tree Small 02 by Rico Cilliers, Poly Haven](assets/trees/CREDITS.md). Tree and building sizes are exaggerated management symbols, not surveyed vegetation or real building footprints.

Map labels are hidden. The map-outline icon toggles sub-basin boundaries and a translucent colour layer, independently of the sub-basin information panel. The basin fades into a near-black background through its existing 2 km context buffer. The trophy shows cumulative monthly points without a percentage denominator.
