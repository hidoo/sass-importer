import path from 'node:path';
import { pathToFileURL } from 'node:url';
import asyncResolve from 'resolve';

/**
 * promisified resolve
 *
 * @param {String} id package id
 * @param {Object} options options
 * @return  {Promise<Object>}
 */
function resolve(id, options) {
  return new Promise((done) => {
    asyncResolve(id, options, (error, file, pkg) => {
      if (error) {
        done({ error });
      } else {
        done({ file, pkg });
      }
    });
  });
}

/**
 * return url is sass filename or not
 *
 * @param {String} url @use or @import rule’s url
 * @return {Boolean}
 */
function isSassFile(url = '') {
  return url.match(/\.s[ac]ss$/) !== null;
}

/**
 * return url is scoped package url specify or not
 *
 * @param {String} url @use or @import rule’s url
 * @return {Boolean}
 */
function isScopedPackage(url = '') {
  return url.startsWith('@');
}

/**
 * normalize package url
 *
 * @param {String} url @use or @import rule’s url
 * @param {Object} options options
 * @param {String} options.packagePrefix module path prefix to use when loading modules, same as legacy version of sass-loader
 * @return {Object}
 */
function normalizePackageURL(url, options = {}) {
  const { packagePrefix } = options;

  if (typeof packagePrefix !== 'string' || packagePrefix === '') {
    return url;
  }

  return url.startsWith(packagePrefix) ? url.slice(1) : url; // eslint-disable-line no-magic-numbers
}

/**
 * parse url
 *
 * @param {String} url @use or @import rule’s url
 * @param {Object} options options
 * @param {String} options.packagePrefix module path prefix to use when loading modules, same as legacy version of sass-loader
 * @return {Object}
 */
function parseURL(url = '', options = {}) {
  const opts = { packagePrefix: '', ...options };
  const parsed = {};

  if (typeof url !== 'string' || url === '') {
    return parsed;
  }

  const normalized = normalizePackageURL(url, opts);
  const isScoped = isScopedPackage(normalized);
  const [id, pathName] = normalized
    .split('/')
    .reduce(
      ([ids, pathNames], component, index) => {
        const position = isScoped ? 2 : 1; // eslint-disable-line no-magic-numbers

        if (index < position) {
          ids.push(component);
        } else {
          pathNames.push(component);
        }
        return [ids, pathNames];
      },
      [[], []]
    )
    .map((paths) => paths.join('/'));

  if (!id) {
    return parsed;
  }

  parsed.id = id;

  if (!pathName) {
    return parsed;
  }

  parsed.pathName = pathName;

  return parsed;
}

/**
 * find module by package id
 *
 * @param {String} id package id
 * @param {Object} options options
 * @param {Array<String>} options.mainFields another main fields used in package.json
 * @param {Object} options.resolverOptions package resolver options
 * @return {Promise<Object>}
 */
async function findById(id = '', options = {}) {
  try {
    const opts = { mainFields: [], ...options };
    const { error, file, pkg } = await resolve(id, opts.resolverOptions);

    if (error) {
      return { error };
    }

    if (isSassFile(file)) {
      return { file };
    } else if (typeof pkg === 'object') {
      const results = await Promise.all(
        opts.mainFields.map((field) => {
          if (typeof pkg[field] === 'string' && pkg[field] !== '') {
            return resolve(`${id}/${pkg[field]}`, opts.resolverOptions);
          }
          return Promise.resolve({});
        })
      );

      const target = results.find(
        (result) => !result.error && isSassFile(result.file)
      );

      if (target) {
        return { file: target.file };
      }
    }
    return {};
  } catch (error) {
    return { error };
  }
}

/**
 * find module by package id with path name
 *
 * @param {String} id package id
 * @param {String} pathName path name
 * @param {Object} options options
 * @param {Array<String>} options.extensions extension for search modules
 * @param {Object} options.resolverOptions package resolver options
 * @return {Promise<Object>}
 */
async function findByIdWithPathName(id, pathName, options = {}) {
  try {
    const opts = { extensions: [], ...options };
    const dirName =
      pathName.match(/\//) === null ? null : `${path.dirname(pathName)}`;
    const baseName = path.basename(pathName);
    const files = [
      [id, dirName, `_${baseName}`],
      [id, dirName, baseName, '_index'],
      [id, dirName, baseName],
      [id, dirName, baseName, 'index']
    ];

    const results = await Promise.all(
      files.reduce((prevRequests, option) => {
        const requests = opts.extensions.map((ext) =>
          resolve(
            `${option.filter(Boolean).join('/')}${ext}`,
            opts.resolverOptions
          )
        );

        return [...prevRequests, ...requests];
      }, [])
    );

    const target = results.find(
      (result) => !result.error && isSassFile(result.file)
    );

    if (target) {
      return { file: target.file };
    }
    return {};
  } catch (error) {
    return { error };
  }
}

/**
 * default options
 *
 * @typedef {Object} defaultOptions default options
 * @property {Array<String>} extensions extension for search modules
 * @property {Array<String>} mainFields another main fields used in package.json
 * @property {String} packagePrefix module path prefix to use when loading modules, same as legacy version of sass-loader
 * @property {Object} resolverOptions package resolver options
 *   see: {@link https://github.com/browserify/resolve#resolveid-opts-cb opts of resolve}
 */
const defaultOptions = {
  extensions: ['.scss', '.sass'],
  mainFields: ['scss', 'sass', 'main.scss', 'main.sass'],
  packagePrefix: '~',
  resolverOptions: {}
};

/**
 * factory of importer
 *
 * @param {defaultOptions} options options
 * @return {import('sass').LegacyAsyncImporter}
 * @example
 * import * as sass from 'sass';
 * import { createImporter } from '@hidoo/sass-importer';
 *
 * const options = {
 *   file: 'path/to/entry.scss',
 *   importer: [
 *     createImporter({
 *       extensions: ['.scss'],
 *       mainFields: ['sass'],
 *       packagePrefix: '^'
 *     })
 *   ]
 * };
 * const { css } = await new Promise((resolve, reject) => {
 *   sass.render(options, (error, result) => {
 *     if (error) {
 *       reject(error);
 *     } else {
 *       resolve(result);
 *     }
 *   });
 * });
 */
export function createImporter(options = {}) {
  const opts = { ...defaultOptions, ...options };

  /**
   * importer
   *
   * @param {String} url @use or @import rule’s url
   * @param {String} prev url that contained @use or @import
   * @param {Function} done callback when resolved
   * @return {void}
   */
  return (url, prev, done) => {
    const { id, pathName } = parseURL(url, opts);

    if (!id) {
      done(null);
    }

    const promise =
      pathName && pathName !== '.'
        ? findByIdWithPathName(id, pathName, opts)
        : findById(id, opts);

    promise.then(({ error, file }) => {
      done(!error && file ? { file } : null);
    });
  };
}

/**
 * factory of file importer
 *
 * @param {defaultOptions} options options
 * @return {import('sass').FileImporter<async>}
 * @example
 * import * as sass from 'sass';
 * import { createFileImporter } from '@hidoo/sass-importer';
 *
 * const options = {
 *   importers: [
 *     createFileImporter({
 *       extensions: ['.scss'],
 *       mainFields: ['sass'],
 *       packagePrefix: '^'
 *     })
 *   ]
 * };
 * const { css } = await sass.compileAsync('path/to/entry.scss', options);
 */
export function createFileImporter(options = {}) {
  const importer = createImporter(options);

  return {
    /**
     * find file url from @use or @import rule’s url
     *
     * @param {String} url @use or @import rule’s url
     * @param {import('sass').CanonicalizeContext} context context
     * @return {Promise<null|URL>}
     */
    async findFileUrl(url, { containingUrl: prevUrl }) {
      const prev = prevUrl?.pathname;
      const result = await new Promise((done) => {
        importer(url, prev, done);
      });

      if (result && result.file) {
        return new URL(pathToFileURL(result.file));
      }
      return null;
    }
  };
}
