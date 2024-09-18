export function convertKeysToLowercase(obj: object) {
  return Object.keys(obj).reduce((acc, key) => {
    acc[key.replace(/([A-Z])/g, '$1').toLowerCase()] = obj[key];
    return acc;
  }, {});
}

export function extractDirAndModuleName(modulePath: string) {
  // Trim the last slash if it exists
  const trimmedPath = modulePath.endsWith('/') ? modulePath.slice(0, -1) : modulePath;

  // Extract the directory and module name
  const lastSlashIndex = trimmedPath.lastIndexOf('/');
  const dir = lastSlashIndex !== -1 ? trimmedPath.substring(0, lastSlashIndex) : '.';
  const moduleName = trimmedPath.substring(lastSlashIndex + 1);

  return { dir, moduleName };
}