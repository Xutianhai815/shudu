const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_ENTRY_FILE = path.join(__dirname, 'main.js');
const DEFAULT_OUTPUT_FILE = path.join(__dirname, 'dist', 'game.bundle.js');

function buildBundle(options = {}) {
  const entryFile = resolveJavaScriptFile(options.entryFile || DEFAULT_ENTRY_FILE);
  const outputFile = path.resolve(options.outputFile || DEFAULT_OUTPUT_FILE);
  const modules = [];
  const moduleIds = new Map();

  const entryId = collectModule(entryFile, modules, moduleIds);
  const bundle = renderBundle(modules, entryId);

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, bundle);

  return {
    outputFile,
    entryFile,
    moduleCount: modules.length,
  };
}

function collectModule(file, modules, moduleIds) {
  const resolvedFile = resolveJavaScriptFile(file);
  const existingId = moduleIds.get(resolvedFile);
  if (existingId !== undefined) {
    return existingId;
  }

  const id = String(modules.length);
  moduleIds.set(resolvedFile, id);
  modules.push({ id, file: resolvedFile, source: '' });

  const source = fs.readFileSync(resolvedFile, 'utf8');
  modules[Number(id)].source = rewriteRelativeRequires(source, resolvedFile, (request) => {
    const dependencyFile = resolveJavaScriptFile(path.resolve(path.dirname(resolvedFile), request));
    return collectModule(dependencyFile, modules, moduleIds);
  });

  return id;
}

function rewriteRelativeRequires(source, file, collectDependency) {
  return source.replace(/require\(\s*(['"])([^'"]+)\1\s*\)/g, (match, quote, request) => {
    if (!request.startsWith('.')) {
      return match;
    }

    try {
      const moduleId = collectDependency(request);
      return `__require__(${JSON.stringify(moduleId)})`;
    } catch (error) {
      error.message = `Failed to bundle ${request} from ${file}: ${error.message}`;
      throw error;
    }
  });
}

function resolveJavaScriptFile(file) {
  const candidates = path.extname(file)
    ? [file]
    : [file, `${file}.js`, path.join(file, 'index.js')];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.resolve(candidate);
    }
  }

  throw new Error(`Cannot resolve JavaScript module: ${file}`);
}

function renderBundle(modules, entryId) {
  const moduleEntries = modules
    .map((module) => {
      const relativeFile = path.relative(__dirname, module.file);
      return [
        `    ${JSON.stringify(module.id)}: function (module, exports, __require__) {`,
        `      // ${relativeFile}`,
        indentSource(module.source, 6),
        '    }',
      ].join('\n');
    })
    .join(',\n');

  return [
    '(function () {',
    '  const __huaweiH5Modules__ = {',
    moduleEntries,
    '  };',
    '  const __huaweiH5Cache__ = {};',
    '',
    '  function __require__(id) {',
    '    if (__huaweiH5Cache__[id]) {',
    '      return __huaweiH5Cache__[id].exports;',
    '    }',
    '',
    '    const moduleFactory = __huaweiH5Modules__[id];',
    '    if (!moduleFactory) {',
    '      throw new Error("Module not found: " + id);',
    '    }',
    '',
    '    const module = { exports: {} };',
    '    __huaweiH5Cache__[id] = module;',
    '    moduleFactory(module, module.exports, __require__);',
    '    return module.exports;',
    '  }',
    '',
    `  __require__(${JSON.stringify(entryId)});`,
    '}());',
    '',
  ].join('\n');
}

function indentSource(source, spaces) {
  const padding = ' '.repeat(spaces);
  return source
    .split('\n')
    .map((line) => `${padding}${line}`)
    .join('\n');
}

if (require.main === module) {
  const result = buildBundle();
  console.log(result.outputFile);
}

module.exports = {
  buildBundle,
};
