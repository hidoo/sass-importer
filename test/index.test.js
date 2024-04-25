import assert from 'node:assert';
import path from 'node:path';
import sassImporter from '../src/index.js';
import { readFile, render, resolve } from './util.js';

describe('@hidoo/sass-importer', () => {
  let basePath = null;
  let options = null;

  before(() => {
    basePath = process.cwd();
    options = { importer: [sassImporter()] };
  });

  it('should call done with null if module can not resolved.', async () => {
    const cases = [
      [['', ''], null],
      [['@hoge/fuga', ''], null]
    ];

    await Promise.all(
      cases.map(([[url, prev], expected]) =>
        sassImporter(url, prev, (actual) => {
          assert.deepEqual(actual, expected);
        })
      )
    );
  });

  it('should call done with module path if module resolved.', async () => {
    const cases = [
      // cases of bootstrap
      // + non scoped package
      // + use "sass" field in package.json
      [
        ['bootstrap', ''],
        {
          file: await resolve('bootstrap/scss/bootstrap.scss')
        }
      ],
      // with ~ (deprecated)
      [
        ['~bootstrap', ''],
        {
          file: await resolve('bootstrap/scss/bootstrap.scss')
        }
      ],
      // with pathname
      [
        ['bootstrap/scss/accordion', ''],
        {
          file: await resolve('bootstrap/scss/_accordion.scss')
        }
      ],

      // cases of @hidoo/unit
      // + scoped package
      // + use "main" field in package.json
      [
        ['@hidoo/unit', ''],
        {
          file: await resolve('@hidoo/unit')
        }
      ],
      // with ~ (deprecated)
      [
        ['~@hidoo/unit', ''],
        {
          file: await resolve('@hidoo/unit')
        }
      ],
      // with pathname
      [
        ['@hidoo/unit/src', ''],
        {
          file: await resolve('@hidoo/unit/src/index.scss')
        }
      ],
      [
        ['@hidoo/unit/src/unit/icon/core', ''],
        {
          file: await resolve('@hidoo/unit/src/unit/icon/_core.scss')
        }
      ]
    ];

    await Promise.all(
      cases.map(([[url, prev], expected]) =>
        sassImporter(url, prev, (actual) => {
          assert.deepEqual(actual, expected);
        })
      )
    );
  });

  it('should resolve file by @import rule.', async () => {
    const cases = [
      [
        // from options.data
        {
          data: `
@import "~@hidoo/unit/src/settings";

.selector {
  font-size: $font-base-size;
}
`,
          outputStyle: 'compressed'
        },
        `.selector{font-size:16px}`
      ],

      // from options.file
      [
        {
          file: path.resolve(basePath, 'test/fixture/scss/main-import.scss')
        },
        await readFile(
          path.resolve(basePath, 'test/fixture/css/main-import.css')
        )
      ]
    ];

    await Promise.all(
      cases.map(([opts, expected]) =>
        render({ ...options, ...opts }).then(({ error, results }) => {
          assert(typeof error === 'undefined');
          assert.deepEqual(results.css, expected);
        })
      )
    );
  });

  it('should resolve file by @use rule.', async () => {
    const cases = [
      [
        // from options.data
        {
          data: `
@use "~@hidoo/unit/src/settings";

.selector {
  font-size: settings.$font-base-size;
}
`,
          outputStyle: 'compressed'
        },
        `.selector{font-size:16px}`
      ],

      // from options.file
      [
        {
          file: path.resolve(basePath, 'test/fixture/scss/main-use.scss')
        },
        await readFile(path.resolve(basePath, 'test/fixture/css/main-use.css'))
      ]
    ];

    await Promise.all(
      cases.map(([opts, expected]) =>
        render({ ...options, ...opts }).then(({ error, results }) => {
          assert(typeof error === 'undefined');
          assert.deepEqual(results.css, expected);
        })
      )
    );
  });

  it('should resolve file by @forward rule.', async () => {
    const cases = [
      // from options.file
      [
        {
          file: path.resolve(basePath, 'test/fixture/scss/main-forward.scss')
        },
        await readFile(
          path.resolve(basePath, 'test/fixture/css/main-forward.css')
        )
      ]
    ];

    await Promise.all(
      cases.map(([opts, expected]) =>
        render({ ...options, ...opts }).then(({ error, results }) => {
          assert(typeof error === 'undefined');
          assert.deepEqual(results.css, expected);
        })
      )
    );
  });
});
