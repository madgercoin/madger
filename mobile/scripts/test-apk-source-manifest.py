"""Reject stale, ambiguous, or malformed installer provenance before UI tests."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('verify_apk', HERE / 'verify-expedition-apk.py')
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)


class SourceManifestTests(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads((HERE.parent / 'expedition-preview-build.json').read_text())

    def test_selected_manifest_is_valid(self):
        self.assertEqual(verify.validate_manifest(self.manifest), self.manifest)

    def test_invalid_identity_and_source_rejected(self):
        for key, value in [('githubRunId', True), ('githubArtifactId', -1),
                           ('sourceRevision', 'HEAD'), ('sourceHeadRevision', 'short'),
                           ('sha256', 'wrong'), ('package', 'not a package'),
                           ('version', '1.5.1\n'), ('buildNumber', 0)]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                verify.validate_manifest({**self.manifest, key: value})

    def test_mixed_sources_rejected(self):
        with self.assertRaises(ValueError):
            verify.validate_manifest({**self.manifest, 'apkUrl': 'https://example.com/app.apk'})

    def test_missing_source_rejected(self):
        value = dict(self.manifest)
        del value['sourceHeadRevision']
        with self.assertRaises(ValueError):
            verify.validate_manifest(value)

    def test_embedded_revision_and_package_must_match(self):
        with tempfile.TemporaryDirectory() as folder:
            apk = Path(folder) / 'fixture.apk'
            for revision, package, expected in [
                (self.manifest['sourceRevision'], self.manifest['package'], True),
                ('0' * 40, self.manifest['package'], False),
                (self.manifest['sourceRevision'], 'com.wrong.app', False),
            ]:
                with zipfile.ZipFile(apk, 'w') as archive:
                    archive.writestr('assets/app.config', json.dumps({'extra': {'buildRevision': revision}, 'android': {'package': package}}))
                if expected:
                    verify.verify_embedded_source(apk, self.manifest)
                else:
                    with self.assertRaises(ValueError):
                        verify.verify_embedded_source(apk, self.manifest)


if __name__ == '__main__':
    unittest.main()
