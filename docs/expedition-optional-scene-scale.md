# Optional scene quality experiment: native validation pending

Sharp remains the full-resolution direct-render default. A native ready/paused menu button optionally selects Softer, a 0.75 linear-resolution scene target. React HUD, controls, layout and the GLView remain native resolution. The option is local to this mounted screen, resets to Sharp on a new screen, and survives recreation of its GL context. It is not an automatic or mandatory downgrade.

This patch is separate from unfinished art and owner source. It changes rendering and the quality control only; timing policy, simulation, score, collision, native workflow and acceptance thresholds are unchanged. Its base is ba60c7f, the previously tested runtime proposal; cherry-pick the render commit independently rather than merging that failed native candidate wholesale.

## Rendering and failure handling

SceneRenderTarget uses an RGBA texture, DEPTH_COMPONENT16 renderbuffer and framebuffer with LINEAR/CLAMP_TO_EDGE texture sampling. It checks framebuffer completeness before use. Geometry, projection aspect and scene content stay fixed. An opaque GLES2-compatible full-screen triangle presents the scene; no blitFramebuffer or multisample API is required. Expo GL 57.0.2 implements the exact framebuffer/texture/depth/draw API path, including nine-argument texImage2D with null allocation data.

The renderer restores the depth/attribute state needed for the next scene and calls endFrame/flush once after presentation. Allocation happens only on selection, creation or size change. Resize replaces attachments while retaining the presentation program/buffer. Switching back to Sharp and disposing release all resources. Incomplete/allocation failures release partial resources, warn once per target size, bind the default framebuffer and fall back to direct full resolution. Failed allocation is not retried every frame. Existing app context recreation disposes the old renderer and reapplies the user's current selection to a new renderer.

Expo's Android msaaSamples prop is ineffective (forwarded only on iOS); this patch does not change it or Expo itself. Android isContextLost is a false-returning stub. Browser context-loss tests therefore verify our resource handling and restoration route, not Android surface-recovery behavior.

## Controlled local measurement

Desktop Chrome ANGLE SwiftShader, 480x960, antialias disabled, actual reported samples/sampleBuffers 0. Same seed7, running state at54m/time4, identical geometry, camera and drawing-buffer aspect. Twelve warmup frames per variant, then five alternating-order blocks of24 completed frames per variant, per API. All measured frames and slow blocks retained. Each timing includes scene generation/submission, presentation where applicable, gl.finish and a one-pixel readback completion barrier; scheduler delay between samples is excluded. These are completed-frame wall times, not a GPU timer or phone FPS.

| API | Direct Sharp | Offscreen at 1.0 control | Offscreen at 0.75 | Reduction vs direct |
| --- | ---: | ---: | ---: | ---: |
| WebGL2 | 127.13ms | 129.34ms | 90.22ms | 36.91ms /29.0% |
| WebGL1 | 136.74ms | 142.78ms | 102.08ms | 34.66ms /25.3% |

The 1.0 control isolates presentation overhead: +2.21ms/+6.04ms. Comparing identical offscreen paths isolates scale: reductions 39.13ms/40.70ms. With five paired block means, descriptive paired-block bootstrap 95% intervals for the reduction vs direct are 33.05–41.35ms (WebGL2) and 33.58–35.70ms (WebGL1). This small single-host sample is not independent device replication. Initial exploratory measurements overlapped validation and are retained separately, not pooled into these figures.

At 0.75 the target is 360x720, 56.25% of full scene pixels. The measured total reduction is 25–29%. Scene geometry remains 1133 visible instances and 86552 triangles in the profiled state. Offscreen adds one presentation draw/triangle (12 draws/86553 total versus 11/86552). The full-size window/composition work remains.

## Visual and regression checks

Matched full-size screenshots at54m,394m and810m, with the correct biome, cover all three zones on both WebGL APIs (18 images). Presentation retains orientation, framing, colors, character silhouette, route edges and recognizable obstacles. The0.75 option visibly softens fine markings, distant detail and edges; this is acceptable only as an explicit user choice, with Sharp preserved. Images contain the actual scene; UI resolution preservation follows from leaving React overlays and GLView sizing unchanged. No claim of new art likeness or native visual acceptance is made.

Six new unit groups cover reusable allocation, odd-size resize, attachment release, incomplete/partial allocation fallback, context loss/recreation, idempotent disposal, Sharp default and switching, and renderer fallback without an extra presentation draw. Both real WebGL APIs also passed11 lifecycle checks each: framebuffer completion, known-color presentation, resize, forced incompleteness, context loss and restored rendering, with no GL errors. The first harness restoration request was issued too early and timed out; that failed attempt remains preserved. The corrected harness waits250ms after the loss event dispatch before requesting restoration, without reducing expectations.

Full npm run validate:146 tests,144 passed,2 skipped; typecheck and lint passed. Existing gameplay and native acceptance tests were not weakened.

Reproduce unit/full checks with npm run validate in mobile. Run node scripts/expedition-scene-scale-profile.cjs separately, with no concurrent validation; SCENE_SCALE_OUT selects an evidence directory. PROFILE_BLOCKS, PROFILE_FRAMES and PROFILE_WARMUP override the default5/24/12 counts. CHROMIUM_PATH selects an existing Chrome binary; this tooling installs nothing. The exported renderer offscreen option is a comparison control; the production app uses direct Sharp by default.

## Remaining gate

This establishes a local software-renderer benefit and an explicit visual tradeoff only. The existing Android acceptance host is an API35 x86_64 software-GPU swangle emulator, not a physical phone; native command/drain costs may respond differently. No physical device/ADB is available here. Native sample count, target completeness, surface lifecycle, repeated acceptance and performance require exact-artifact validation before claiming playability. No APK was generated or requested by this experiment, and the previous candidate's two failures remain failures. Do not integrate or publish based solely on this local result.
