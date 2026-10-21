#!/usr/bin/env python3
"""Inspect the actual source-built installer and create a phone-install ZIP."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import zipfile


def main():
    root = Path(__file__).resolve().parents[1]
    apk = root / 'android/app/build/outputs/apk/release/app-release.apk'
    config = json.loads((root / 'app.json').read_text())['expo']
    revision = os.environ['MADGER_BUILD_REVISION']
    if not re.fullmatch(r'[0-9a-f]{40}', revision):
        raise ValueError('A complete source commit SHA is required')
    sdk = Path(os.environ.get('ANDROID_HOME') or os.environ['ANDROID_SDK_ROOT'])
    build_tools = sdk / 'build-tools/36.0.0'

    def run(tool, *args):
        return subprocess.check_output([str(build_tools / tool), *map(str, args)], text=True)

    badging = run('aapt', 'dump', 'badging', apk)
    match = re.search(r"package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'", badging)
    if not match:
        raise ValueError('APK package metadata is missing')
    package, code, version = match.groups()
    assert package == 'com.madgercoin.preview', package
    assert int(code) == config['android']['versionCode'], (code, config['android']['versionCode'])
    assert version == config['version'], (version, config['version'])
    signing = run('apksigner', 'verify', '--verbose', '--print-certs', apk)
    certificate = re.search(r'Signer #1 certificate SHA-256 digest: ([0-9a-fA-F]+)', signing)
    if not certificate:
        raise ValueError('Verified APK signer certificate was not reported')
    with zipfile.ZipFile(apk) as archive:
        assert archive.testzip() is None, 'APK ZIP integrity failed'
        entries = archive.namelist()
        assert 'AndroidManifest.xml' in entries and 'classes.dex' in entries
        assert any(name.startswith('lib/arm64-v8a/') for name in entries), 'No ARM64 phone libraries'
        bundle = archive.read('assets/index.android.bundle')
        embedded = json.loads(archive.read('assets/app.config'))
        assert embedded.get('extra', {}).get('buildRevision') == revision, 'Embedded source revision does not match the requested commit'
        assert embedded.get('android', {}).get('package') == package, 'Embedded app config package differs from APK'
        assert b'MADGER_NATIVE_SCENERY_BUDGET' in bundle, 'Expedition renderer is missing'
    digest = hashlib.sha256(apk.read_bytes()).hexdigest()
    out = root / 'android-delivery'
    out.mkdir(exist_ok=True)
    stem = f'MADGER-{version}-Expedition-Test-{code}'
    target = out / (stem + '.apk')
    shutil.copyfile(apk, target)
    checksum = f'{digest}  {target.name}\n'
    (out / 'SHA256SUMS.txt').write_text(checksum)
    installer = out / (stem + '-Install.zip')
    with zipfile.ZipFile(installer, 'w', compression=zipfile.ZIP_STORED) as archive:
        archive.write(target, target.name)
        archive.writestr('SHA256SUMS.txt', checksum)
    with zipfile.ZipFile(installer) as archive:
        assert archive.testzip() is None
        assert set(archive.namelist()) == {target.name, 'SHA256SUMS.txt'}
        assert hashlib.sha256(archive.read(target.name)).hexdigest() == digest
    report = dict(package=package, version=version, versionCode=int(code), sourceRevision=revision,
                  signing='verified development-key test APK', signerSha256=certificate[1].lower(),
                  apk=target.name, apkSha256=digest, apkBytes=apk.stat().st_size,
                  zip=installer.name, zipSha256=hashlib.sha256(installer.read_bytes()).hexdigest(),
                  archiveIntegrity='passed', embeddedSourceRevision='matched',
                  phoneAbi='arm64-v8a', physicalPhoneTest='not performed', runtimeQA='pending')
    (out / 'build-verification.json').write_text(json.dumps(report, indent=2) + '\n')
    (out / 'apksigner-verification.txt').write_text(signing)
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
