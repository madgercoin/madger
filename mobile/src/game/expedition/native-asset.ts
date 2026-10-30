type DownloadableAsset = {
  localUri: string | null;
  downloaded: boolean;
  downloadAsync(): Promise<unknown>;
};

function directFile(uri: string | null): uri is string {
  return !!uri?.startsWith('file://') && !uri.startsWith('file:///android_res/');
}

/** Expo Image accepts Android drawable names; Expo GL's decoder needs a file. */
export async function nativeTextureSource(asset: DownloadableAsset): Promise<{localUri:string}> {
  // Asset.fromModule marks drawable resources as downloaded for Image compatibility.
  // Clearing that public flag lets Expo Asset copy the bundled resource to cache.
  if (!directFile(asset.localUri)) asset.downloaded = false;
  await asset.downloadAsync();
  if (!directFile(asset.localUri)) throw Error('Approved Madger portrait is not a readable local file');
  return {localUri:asset.localUri};
}
