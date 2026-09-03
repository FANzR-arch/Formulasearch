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

The Skills image deck also adapts the overlapping-card composition from [React Bits Bounce Cards](https://reactbits.dev/components/bounce-cards). The site implementation uses deterministic layouts, the Web Animations/CSS platform, and the existing Astro markup instead of copying the React and GSAP component.

## Icons

- [Lucide](https://lucide.dev/) is used for interface icons under the [ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE).
- [Simple Icons](https://simpleicons.org/) is used for brand icons under [CC0 1.0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md). Brand marks remain the property of their respective owners and are used only to identify their linked services.

## Interface sounds

- The local sound preview and interaction feedback use the [UI SFX set by Kenney Vleugels](https://opengameart.org/content/51-ui-sound-effects-buttons-switches-and-clicks), released under [CC0](https://creativecommons.org/publicdomain/zero/1.0/). The original readme states that the sounds may be used in personal and commercial projects; attribution is appreciated but not required.
- The source archive is stored locally under `public/audio/kenney-interface/` for preview and playback. The source page's license should be rechecked before adding new files from the pack.
- Additional feedback candidates come from [UI Sound Effects (Button Clicks, User Feedback, Notifications)](https://opengameart.org/content/ui-sound-effects-button-clicks-user-feedback-notifications), marked CC0 on OpenGameArt and provided in WAV/OGG formats. They are stored under `public/audio/cc0-feedback/ui-feedback/`.
- Additional Lab candidates come from [Interface beeps](https://opengameart.org/content/interface-beeps), marked CC0 and described as interface/menu beeps. They are stored under `public/audio/cc0-feedback/interface-beeps/`.
- Additional status candidates come from [UI Sounds](https://opengameart.org/content/ui-sounds-0), marked CC0 and described as Error, Accept, Notification and Attention sounds. They are stored under `public/audio/cc0-feedback/ui-status/`.
