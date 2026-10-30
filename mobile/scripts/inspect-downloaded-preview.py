#!/usr/bin/env python3
"""Independently verify a downloaded APK, installer ZIP and bundled game media."""
import argparse
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import zipfile

from PIL import Image


def digest(data):
    return hashlib.sha256(data).hexdigest()


def pixels(data):
    with Image.open(io.BytesIO(data)) as im:
        return im.size, digest(im.convert('RGBA').tobytes())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk', type=Path, required=True)
    parser.add_argument('--installer', type=Path, required=True)
    parser.add_argument('--build-tools', type=Path, required=True)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--evidence', type=Path, required=True)
    parser.add_argument('--expected-signer', required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    spec = importlib.util.spec_from_file_location('verify', root / 'scripts/verify-expedition-apk.py')
    verify = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(verify)
    selected = verify.validate_manifest(json.loads(args.manifest.read_text()))
    args.evidence.mkdir(parents=True, exist_ok=True)
    actual = verify.inspect_apk(args.apk, args.build_tools, args.evidence, selected)
    verify.verify_embedded_source(args.apk, selected)
    signing = (args.evidence / 'apksigner.txt').read_text()
    signer = re.search(r'Signer #1 certificate SHA-256 digest: ([0-9a-fA-F]{64})', signing)[1].lower()
    assert signer == args.expected_signer.lower(), 'Signer differs from the expected installed test app'
    apk_sha = digest(args.apk.read_bytes())
    assert apk_sha == selected['sha256'], 'Downloaded installer differs from selected source build'
    with zipfile.ZipFile(args.installer) as install:
        assert install.testzip() is None, 'Installer ZIP CRC failure'
        assert set(install.namelist()) == {args.apk.name, 'SHA256SUMS.txt'}, 'Unexpected installer contents'
        assert digest(install.read(args.apk.name)) == apk_sha, 'ZIP contains a different APK'
        assert install.read('SHA256SUMS.txt').decode().strip() == f'{apk_sha}  {args.apk.name}'
    with zipfile.ZipFile(args.apk) as archive:
        assert archive.testzip() is None, 'APK CRC failure'
        entries = archive.namelist()
        assert len(entries) == len(set(entries)), 'Duplicate APK entries'
        assert all(not p.startswith('/') and '..' not in Path(p).parts for p in entries)
        assert {'AndroidManifest.xml', 'classes.dex', 'assets/index.android.bundle'} <= set(entries)
        assert any(p.startswith('lib/arm64-v8a/') for p in entries), 'ARM64 phone libraries absent'
        assert any(p.startswith('lib/x86_64/') for p in entries), 'Emulator libraries absent'
        media = {p: archive.read(p) for p in entries if p.endswith(('.wav', '.mp3', '.jpg', '.png', '.webp'))}
        media_sha = {digest(data): p for p, data in media.items()}
        bundled = []
        audio_source = (root / 'src/game/expedition/audio.ts').read_text()
        audio_names = set(re.findall(r"require\('../../../assets/audio/expedition/([^']+)'\)", audio_source))
        assert len(audio_names) >= 29, 'Native audio source list is unexpectedly incomplete'
        for name in sorted(audio_names):
            source = root / 'assets/audio/expedition' / name
            sha = digest(source.read_bytes())
            assert sha in media_sha, f'Game audio absent or different: {source.name}'
            bundled.append(dict(source=str(source.relative_to(root)), apkEntry=media_sha[sha], sha256=sha))
        for source in sorted((root / 'assets/expedition-world').glob('*.jpg')):
            sha = digest(source.read_bytes())
            assert sha in media_sha, f'World material absent or different: {source.name}'
            bundled.append(dict(source=str(source.relative_to(root)), apkEntry=media_sha[sha], sha256=sha))
        pixel_index = {}
        for name, data in media.items():
            if name.endswith(('.png', '.webp')):
                pixel_index[pixels(data)] = name
        for relative in ('assets/images/madger-mascot-native.png', 'assets/expedition-world/forest-atlas.png'):
            size, sha = pixels((root / relative).read_bytes())
            assert (size, sha) in pixel_index, f'Approved image pixels absent or different: {relative}'
            bundled.append(dict(source=relative, apkEntry=pixel_index[(size, sha)], rgbaSha256=sha, dimensions=size))
    report = dict(status='passed', **actual, apk=args.apk.name, apkBytes=args.apk.stat().st_size,
                  apkSha256=apk_sha, installer=args.installer.name, installerSha256=digest(args.installer.read_bytes()),
                  signerSha256=signer, sourceRevision=selected['sourceRevision'], sourceHeadRevision=selected['sourceHeadRevision'],
                  archiveIntegrity='passed', exactApkInZip=True, nativeMedia=bundled,
                  physicalPhoneTest='not performed', audibleListeningTest='not performed')
    (args.evidence / 'independent-verification.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'nativeMedia'}, indent=2))
    print(f'Verified {len(bundled)} native audio/image resources against source assets')


if __name__ == '__main__':
    main()
