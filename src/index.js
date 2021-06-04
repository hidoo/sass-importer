import path from 'path';
import {default as resolveCallback} from 'resolve';

/**
 * another main fields used in package.json
 *
 * @type {Array<String>}
 */
const mainFields = [
  'scss',
  'sass',
  'main.scss',
  'main.sass'
];

/**
 * extension for search
 *
 * @type {Array<String>}
 */
const extensions = [
  '.scss',
  '.sass'
];

/**
 * promisified resolve
 *
 * @param {String} id package id
 * @param {Object} options options
 * @return  {Promise<Object>}
 */
function resolve(id, options) {
  return new Promise(
    (done) =>
      resolveCallback(id, options, (error, file, pkg) => {
        if (error) {
          return done({error});
        }
        return done({file, pkg});
      })
  );
}

/**
 * return url is sass filename or not
 *
 * @param {String} [url=''] @use or @import rule’s url
 * @return {Boolean}
 */
function isSassFile(url = '') {
  return url.match(/\.s[ac]ss$/) !== null;
}

/**
 * return url is lagacy package url specifiy or not
 *
 * @param {String} [url=''] @use or @import rule’s url
 * @return {Boolean}
 */
function isLegacyPackage(url = '') {
  return url.match(/^~/) !== null;
}

/**
 * return url is scoped package url specifiy or not
 *
 * @param {String} [url=''] @use or @import rule’s url
 * @return {Boolean}
 */
function isScopedPackage(url = '') {
  return url.match(/^@/) !== null;
}

/**
 * parse url
 *
 * @param {String} [url=''] @use or @import rule’s url
 * @return {Object}
 */
function parseURL(url = '') {
  const parsed = {};

  if (typeof url !== 'string' || url === '') {
    return parsed;
  }

  const normalized = isLegacyPackage(url) ? url.replace(/^~/, '') : url;
  const isScoped = isScopedPackage(normalized);
  const [id, pathName] = normalized.split('/')
    .reduce(([ids, pathNames], component, index) => {
      const position = isScoped ? 2 : 1; // eslint-disable-line no-magic-numbers

      if (index < position) {
        ids.push(component);
      }
      else {
        pathNames.push(component);
      }
      return [ids, pathNames];
    }, [[], []])
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
 * @return {Promise<Object>}
 */
async function findById(id = '') {
  try {
    const {error, file, pkg} = await resolve(id);

    if (error) {
      return {error};
    }

    if (isSassFile(file)) {
      return {file};
    }
    else if (typeof pkg === 'object') {
      const results = await Promise.all(mainFields.map(
        (field) => {
          if (typeof pkg[field] === 'string' && pkg[field] !== '') {
            return resolve(`${id}/${pkg[field]}`);
          }
          return Promise.resolve({});
        }
      ));

      const target = results.find(
        (result) => !result.error && isSassFile(result.file)
      );

      if (target) {
        return {file: target.file};
      }
    }
    return {};
  }
  catch (error) {
    return {error};
  }
}

/**
 * find module by package id with path name
 *
 * @param {String} id package id
 * @param {String} pathName path name
 * @return {Promise<Object>}
 */
async function findByIdWithPathName(id, pathName) {
  try {
    const dirName = pathName.match(/\//) === null ?
      null : `${path.dirname(pathName)}`;
    const baseName = path.basename(pathName);
    const options = [
      [id, dirName, `_${baseName}`],
      [id, dirName, baseName, '_index'],
      [id, dirName, baseName],
      [id, dirName, baseName, 'index']
    ];

    const results = await Promise.all(options.reduce(
      (prevRequests, option) => {
        const requests = extensions.map(
          (ext) =>
            resolve(`${option.filter(Boolean).join('/')}${ext}`)
        );

        return [
          ...prevRequests,
          ...requests
        ];
      },
      []
    ));

    const target = results.find(
      (result) => !result.error && isSassFile(result.file)
    );

    if (target) {
      return {file: target.file};
    }
    return {};
  }
  catch (error) {
    return {error};
  }
}

/**
 * sass custom impoter
 *
 * @param {String} [url=''] @use or @import rule’s url
 * @param {String} [prev=''] url that contained @use or @import
 * @param {Function} resolved callback when resolved
 * @return {Promise}
 */
export default async function sassImporter(url, prev, resolved) {
  try {
    const {id, pathName} = parseURL(url);

    if (!id) {
      return resolved(null);
    }

    if (pathName && pathName !== '.') {
      const {error, file} = await findByIdWithPathName(id, pathName);

      return resolved(!error && file ? {file} : null);
    }

    const {error, file} = await findById(id);

    return resolved(!error && file ? {file} : null);
  }
  catch (error) {
    return resolved(error);
  }
}
