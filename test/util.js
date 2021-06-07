import {promises as fs} from 'fs';
import {default as resolveCallback} from 'resolve';
import sass from 'sass';

/**
 * async read file
 *
 * @param {String} path file path
 * @param {Object} options options
 * @return {Promise<String>}
 */
export async function readFile(path, options) {
  const content = await fs.readFile(path, options);

  return content.toString().trim();
}

/**
 * promisified sass.render
 *
 * @param {Object} options options
 * @return  {Promise<Object>}
 */
export function render(options) {
  return new Promise(
    (done, fail) =>
      sass.render(
        options,
        (error, results) => {
          if (error) {
            return fail(error);
          }
          return done({results: {
            ...results,
            css: results.css.toString().trim()
          }});
        }
      )
  );
}

/**
 * promisified resolve
 *
 * @param {String} id package id
 * @param {Object} options options
 * @return  {Promise<Object>}
 */
export function resolve(id, options) {
  return new Promise(
    (done, fail) =>
      resolveCallback(id, options, (error, file) => {
        if (error) {
          return fail(error);
        }
        return done(file.toString().trim());
      })
  );
}

