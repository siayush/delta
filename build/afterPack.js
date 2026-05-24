const fs = require('fs')
const os = require('os')
const path = require('path')
const asar = require('@electron/asar')

function remove(target) {
  fs.rmSync(target, { recursive: true, force: true })
}

function keepOnlyDirectories(parent, keep) {
  if (!fs.existsSync(parent)) return
  for (const entry of fs.readdirSync(parent, { withFileTypes: true })) {
    if (!entry.isDirectory() || keep.has(entry.name)) continue
    remove(path.join(parent, entry.name))
  }
}

function archName(arch) {
  const value = String(arch)
  if (value === '1') return 'x64'
  if (value === '3') return 'arm64'
  return value
}

function pruneNativePackageSources(appDir, arch) {
  const nodeModules = path.join(appDir, 'node_modules')
  const prebuildsToKeep =
    arch === 'universal' ? new Set(['darwin-arm64', 'darwin-x64']) : new Set([`darwin-${arch}`])

  keepOnlyDirectories(path.join(nodeModules, 'tree-sitter-bash', 'prebuilds'), prebuildsToKeep)
  keepOnlyDirectories(path.join(nodeModules, 'tree-sitter', 'prebuilds'), prebuildsToKeep)

  remove(path.join(nodeModules, 'tree-sitter-bash', 'src'))
  remove(path.join(nodeModules, 'tree-sitter-bash', 'tree-sitter-bash.wasm'))
  remove(path.join(nodeModules, 'tree-sitter', 'src'))
  remove(path.join(nodeModules, 'tree-sitter', 'vendor'))
}

async function repackAsar(resourcesDir, arch) {
  const asarPath = path.join(resourcesDir, 'app.asar')
  const unpackedPath = `${asarPath}.unpacked`
  if (!fs.existsSync(asarPath)) return

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'delta-asar-'))
  const extractedApp = path.join(tempRoot, 'app')
  try {
    asar.extractAll(asarPath, extractedApp)
    pruneNativePackageSources(extractedApp, arch)
    remove(asarPath)
    remove(unpackedPath)
    await asar.createPackageWithOptions(extractedApp, asarPath, { unpack: '*.node' })
  } finally {
    remove(tempRoot)
  }
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appName = `${context.packager.appInfo.productFilename}.app`
  const appRoot = path.join(context.appOutDir, appName)
  const resourcesDir = path.join(appRoot, 'Contents', 'Resources')
  const electronResourcesDir = path.join(
    appRoot,
    'Contents',
    'Frameworks',
    'Electron Framework.framework',
    'Versions',
    'A',
    'Resources'
  )

  keepOnlyDirectories(electronResourcesDir, new Set(['en.lproj']))
  await repackAsar(resourcesDir, archName(context.arch))
}
