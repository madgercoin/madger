# Pinned Expo CLI fixtures

These unmodified files are from `@expo/cli@57.0.32`, published by Expo under the
included MIT LICENSE. They are verification fixtures for
`../patch-devtools-validation.mjs`, not application runtime code.

The patch compares exact source bytes before modifying installed CLI files and
accepts only the exact computed patched bytes on repeat runs. A future CLI or Zod
version requires review, not silent patch skipping.
