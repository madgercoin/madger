# Launch Hunt Social Media Build

Generated campaign media is written to `media/launch-hunt/` by the `build-launch-hunt-social-media.yml` workflow.

The build source is the finalized Canva-rendered campaign master. The workflow generates:

- 1080x1350 feed image
- 1080x1080 square image
- 1600x900 X landscape image
- 1080x1920 six-second H.264 vertical motion asset
- SHA-256 manifest

The workflow exists to create durable MADGER-owned public media URLs for social publishing. The temporary Canva render URL in the workflow expires and should not be reused after the build completes.
