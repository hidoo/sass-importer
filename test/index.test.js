/* eslint max-len: off, no-magic-numbers: off, no-sync: off */

import assert from 'assert';
import resolve from 'resolve';
import sassImporter from '../src';

describe('sass-importer', () => {

  it('should return module path.', async () => {
    const cases = [
      // cases of bootstrap
      // + non scoped package
      // + use "sass" field in package.json
      [
        [
          'bootstrap',
          ''
        ],
        {
          file: resolve.sync('bootstrap/scss/bootstrap.scss')
        }
      ],
      // with ~ (deprecated)
      [
        [
          '~bootstrap',
          ''
        ],
        {
          file: resolve.sync('bootstrap/scss/bootstrap.scss')
        }
      ],
      // with pathname
      [
        [
          'bootstrap/scss/accordion',
          ''
        ],
        {
          file: resolve.sync('bootstrap/scss/_accordion.scss')
        }
      ],

      // cases of @hidoo/unit
      // + scoped package
      // + use "main" field in package.json
      [
        [
          '@hidoo/unit',
          ''
        ],
        {
          file: resolve.sync('@hidoo/unit')
        }
      ],
      // with ~ (deprecated)
      [
        [
          '~@hidoo/unit',
          ''
        ],
        {
          file: resolve.sync('@hidoo/unit')
        }
      ],
      // with pathname
      [
        [
          '@hidoo/unit/src',
          ''
        ],
        {
          file: resolve.sync('@hidoo/unit/src/index.scss')
        }
      ],
      [
        [
          '@hidoo/unit/src/unit/icon/core',
          ''
        ],
        {
          file: resolve.sync('@hidoo/unit/src/unit/icon/_core.scss')
        }
      ]
    ];

    await Promise.all(cases.map(
      ([[url, prev], expected]) => sassImporter(url, prev, (actual) => {
        assert.deepStrictEqual(actual, expected);
      })
    ));
  });

});
