# Third-party notices

The homepage liquid background is a lightweight monochrome adaptation of the WebGL approach documented in:

- [FANzR-arch/Phil-aesthetic-formulas — 007 · Liquid Screen Lab](https://github.com/FANzR-arch/Phil-aesthetic-formulas/tree/main/007-iridescent-flow-halftone), MIT License.
- [collidingScopes/liquid-shape-distortions](https://github.com/collidingScopes/liquid-shape-distortions), MIT License. Referenced by Liquid Screen Lab for its liquid-field architecture.
- [Erkaman/glsl-cos-palette](https://github.com/Erkaman/glsl-cos-palette), MIT License. Referenced by Liquid Screen Lab; the color palette stage is intentionally omitted here.
- [Three.js DotScreenShader](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/shaders/DotScreenShader.js), MIT License. Referenced by Liquid Screen Lab; the halftone stage is intentionally omitted here.

This website adaptation keeps the procedural WebGL liquid-field idea while replacing the lab interface, color treatment, controls, capture and export pipeline with a small theme-aware background renderer.

The local background comparison lab also includes reduced, single-canvas adaptations of:

- [React Bits Dither](https://reactbits.dev/backgrounds/dither), used for its procedural wave and ordered-dithering approach.
- [React Bits Molten Metal](https://reactbits.dev/backgrounds/molten-metal), used for its sparse caustic-filament field.

React Bits is distributed under the [MIT + Commons Clause License Condition v1.0](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md). These adaptations are used only as part of this website and are not redistributed as standalone components. The original React, Three.js, postprocessing and OGL wrappers were not copied into the production bundle; both effects run through the website's existing lightweight WebGL canvas.

## Icons

- [Lucide](https://lucide.dev/) is used for interface icons under the [ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE).
- [Simple Icons](https://simpleicons.org/) is used for brand icons under [CC0 1.0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md). Brand marks remain the property of their respective owners and are used only to identify their linked services.
