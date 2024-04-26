import assert from 'node:assert';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as sass from 'sass';
import { createImporter, createFileImporter } from '../src/index.js';
import { readFile, render, resolve } from './util.js';

const DEBUG = Boolean(process.env.DEBUG);

describe('@hidoo/sass-importer', () => {
  describe('createImporter', () => {
    context('if the module can not be resolved.', () => {
      it('should call done with null.', async () => {
        const cases = [
          [['', ''], null],
          [['@hoge/fuga', ''], null]
        ];
        const importer = createImporter();

        await Promise.all(
          cases.map(async ([[url, prev], expected]) => {
            await new Promise((done) => {
              const test = (actual) => {
                assert.deepEqual(actual, expected);
                if (DEBUG) {
                  console.log(actual, expected);
                }
                done();
              };

              importer(url, prev, test);
            });
          })
        );
      });
    });

    context('if the module can be resolved.', () => {
      it('should call done with the object includes the module path.', async () => {
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
        const importer = createImporter();

        await Promise.all(
          cases.map(async ([[url, prev], expected]) => {
            await new Promise((done) => {
              const test = (actual) => {
                assert.deepEqual(actual, expected);
                if (DEBUG) {
                  console.log(actual, expected);
                }
                done();
              };

              importer(url, prev, test);
            });
          })
        );
      });
    });

    context('with sass.compileAsync', () => {
      let basePath = null;
      let options = null;

      before(() => {
        basePath = process.cwd();
        options = { importer: [createImporter()] };
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
            await readFile(
              path.resolve(basePath, 'test/fixture/css/main-use.css')
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

      it('should resolve file by @forward rule.', async () => {
        const cases = [
          // from options.file
          [
            {
              file: path.resolve(
                basePath,
                'test/fixture/scss/main-forward.scss'
              )
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
  });

  describe('createFileImporter', () => {
    context('if the module can not be resolved.', () => {
      it('fileImporter.findFileUrl should return null.', async () => {
        const cases = [
          [['', ''], null],
          [['@hoge/fuga', ''], null]
        ];
        const fileImporter = createFileImporter();

        await Promise.all(
          cases.map(async ([[url, prevUrl], expected]) => {
            const actual = await fileImporter.findFileUrl(url, {
              containingUrl: prevUrl
            });

            assert.deepEqual(actual, expected);
            if (DEBUG) {
              console.log(actual, expected);
            }
          })
        );
      });
    });

    context('if the module can be resolved.', () => {
      it('fileImporter.findFileUrl should return the url module url.', async () => {
        const cases = [
          // cases of bootstrap
          // + non scoped package
          // + use "sass" field in package.json
          [
            ['bootstrap', null],
            new URL(
              pathToFileURL(await resolve('bootstrap/scss/bootstrap.scss'))
            )
          ],
          // with ~ (deprecated)
          [
            ['~bootstrap', null],
            new URL(
              pathToFileURL(await resolve('bootstrap/scss/bootstrap.scss'))
            )
          ],
          // with pathname
          [
            ['bootstrap/scss/accordion', null],
            new URL(
              pathToFileURL(await resolve('bootstrap/scss/_accordion.scss'))
            )
          ],

          // cases of @hidoo/unit
          // + scoped package
          // + use "main" field in package.json
          [
            ['@hidoo/unit', null],
            new URL(pathToFileURL(await resolve('@hidoo/unit')))
          ],
          // with ~ (deprecated)
          [
            ['~@hidoo/unit', null],
            new URL(pathToFileURL(await resolve('@hidoo/unit')))
          ],
          // with pathname
          [
            ['@hidoo/unit/src', null],
            new URL(pathToFileURL(await resolve('@hidoo/unit/src/index.scss')))
          ],
          [
            ['@hidoo/unit/src/unit/icon/core', null],
            new URL(
              pathToFileURL(
                await resolve('@hidoo/unit/src/unit/icon/_core.scss')
              )
            )
          ]
        ];
        const fileImporter = createFileImporter();

        await Promise.all(
          cases.map(async ([[url, prevUrl], expected]) => {
            const actual = await fileImporter.findFileUrl(url, {
              containingUrl: prevUrl
            });

            assert.deepEqual(actual, expected);
            if (DEBUG) {
              console.log(actual, expected);
            }
          })
        );
      });
    });

    context('with sass.compileStringAsync', () => {
      let options = null;

      before(() => {
        options = { importers: [createFileImporter()] };
      });

      it('should resolve file by @import rule.', async () => {
        const cases = [
          [
            `
@import "~@hidoo/unit/src/settings";

.selector {
  font-size: $font-base-size;
}
`,
            {
              style: 'compressed'
            },
            `.selector{font-size:16px}`
          ]
        ];

        await Promise.all(
          cases.map(async ([src, opts, expected]) => {
            const { css } = await sass.compileStringAsync(src, {
              ...options,
              ...opts
            });

            assert.deepEqual(css.trim(), expected);
            if (DEBUG) {
              console.log(css, expected);
            }
          })
        );
      });

      it('should resolve file by @use rule.', async () => {
        const cases = [
          [
            `
            @use "~@hidoo/unit/src/settings";

            .selector {
              font-size: settings.$font-base-size;
            }
            `,
            {
              style: 'compressed'
            },
            `.selector{font-size:16px}`
          ]
        ];

        await Promise.all(
          cases.map(async ([src, opts, expected]) => {
            const { css } = await sass.compileStringAsync(src, {
              ...options,
              ...opts
            });

            assert.deepEqual(css.trim(), expected);
            if (DEBUG) {
              console.log(css, expected);
            }
          })
        );
      });
    });

    context('with sass.compileAsync', () => {
      let basePath = null;
      let options = null;

      before(() => {
        basePath = process.cwd();
        options = { importers: [createFileImporter()] };
      });

      it('should resolve file by @import rule.', async () => {
        const cases = [
          [
            path.resolve(basePath, 'test/fixture/scss/main-import.scss'),
            {},
            await readFile(
              path.resolve(basePath, 'test/fixture/css/main-import.css')
            )
          ]
        ];

        await Promise.all(
          cases.map(async ([src, opts, expected]) => {
            const { css } = await sass.compileAsync(src, {
              ...options,
              ...opts
            });

            assert.deepEqual(css.trim(), expected);
            if (DEBUG) {
              console.log(css, expected);
            }
          })
        );
      });

      it('should resolve file by @use rule.', async () => {
        const cases = [
          [
            path.resolve(basePath, 'test/fixture/scss/main-use.scss'),
            {},
            await readFile(
              path.resolve(basePath, 'test/fixture/css/main-use.css')
            )
          ]
        ];

        await Promise.all(
          cases.map(async ([src, opts, expected]) => {
            const { css } = await sass.compileAsync(src, {
              ...options,
              ...opts
            });

            assert.deepEqual(css.trim(), expected);
            if (DEBUG) {
              console.log(css, expected);
            }
          })
        );
      });
    });
  });
});
