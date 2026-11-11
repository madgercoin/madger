#!/usr/bin/env python3
"""Use Gradle's official release asset with a pinned checksum and bounded timeout.

The generated Expo wrapper remains the launcher. Only its known 9.3.1 download
metadata changes; source/version drift fails closed instead of selecting a new
Gradle version. This avoids the services.gradle.org redirect outage.
"""
from pathlib import Path
import sys
import unittest

VERSION = "9.3.1"
SHA256 = "b266d5ff6b90eada6dc3b20cb090e3731302e553a27c5d3e4df1f0d76beaff06"
# Published digest: gradle/gradle-distributions release v9.3.1, binary ZIP.
OFFICIAL = "https://github.com/gradle/gradle-distributions/releases/download/v9.3.1/gradle-9.3.1-bin.zip"
ORIGINAL = "https://services.gradle.org/distributions/gradle-9.3.1-bin.zip"


def configured(source):
    lines = source.splitlines()
    properties = {}
    for line in lines:
        if "=" in line and not line.lstrip().startswith(("#", "!")):
            key, value = line.split("=", 1)
            properties.setdefault(key.strip(), []).append(value.strip())
    urls = properties.get("distributionUrl", [])
    if len(urls) != 1 or urls[0].replace("\\:", ":") not in (ORIGINAL, OFFICIAL):
        raise ValueError("Unexpected Gradle wrapper distribution; review the version/source before building")
    checksums = properties.get("distributionSha256Sum", [])
    if checksums and checksums != [SHA256]:
        raise ValueError("Existing Gradle checksum differs from the pinned official release")
    result = [line for line in lines if line.split("=", 1)[0].strip() not in
              ("distributionUrl", "distributionSha256Sum", "networkTimeout")]
    result.extend(("distributionUrl=" + OFFICIAL.replace(":", "\\:", 1),
                   "distributionSha256Sum=" + SHA256, "networkTimeout=120000"))
    return "\n".join(result) + "\n"


class DownloadTests(unittest.TestCase):
    def test_exact_version_checksum_and_timeout(self):
        original = "distributionBase=GRADLE_USER_HOME\ndistributionUrl=" + ORIGINAL.replace(":", "\\:", 1) + "\nnetworkTimeout=10000\nvalidateDistributionUrl=true\n"
        result = configured(original)
        self.assertIn("distributionSha256Sum=" + SHA256, result)
        self.assertIn("networkTimeout=120000", result)
        self.assertIn(OFFICIAL.replace(":", "\\:", 1), result)
        self.assertIn("validateDistributionUrl=true", result)
        self.assertIn("distributionBase=GRADLE_USER_HOME", result)
        self.assertEqual(configured(result), result)

    def test_distribution_drift_and_duplicates_fail(self):
        for url in ("", ORIGINAL.replace("9.3.1", "9.4.0"), ORIGINAL.replace("https:", "http:"),
                    ORIGINAL.replace("services.gradle.org", "example.com")):
            with self.subTest(url=url), self.assertRaises(ValueError):
                configured("distributionUrl=" + url)
        with self.assertRaises(ValueError):
            configured("distributionUrl=" + ORIGINAL + "\ndistributionUrl=" + ORIGINAL)
        with self.assertRaises(ValueError):
            configured("distributionBase=GRADLE_USER_HOME")

    def test_conflicting_checksum_fails(self):
        for checksum in ("0" * 64, "", SHA256 + "\ndistributionSha256Sum=" + SHA256):
            with self.subTest(checksum=checksum), self.assertRaises(ValueError):
                configured("distributionUrl=" + ORIGINAL + "\ndistributionSha256Sum=" + checksum)


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        unittest.main(argv=[sys.argv[0]], verbosity=2)
    else:
        target = Path(__file__).resolve().parents[1] / "android/gradle/wrapper/gradle-wrapper.properties"
        target.write_text(configured(target.read_text(encoding="utf-8")), encoding="utf-8")
        print("Prepared official Gradle 9.3.1 release: pinned SHA-256 and 120-second network timeout")
