# @hidoo/sass-importer

[![Test](https://github.com/hidoo/sass-importer/actions/workflows/test.yml/badge.svg)](https://github.com/hidoo/sass-importer/actions/workflows/test.yml)

> Custom sass importer.

## Installation

```sh
npm install @hidoo/sass-importer
```

## Usage

```js
import * as sass from 'sass';
import { createFileImporter } from '@hidoo/sass-importer';

const options = {
  importers: [
    createFileImporter({
      extensions: ['.scss'],
      mainFields: ['sass'],
      packagePrefix: '^'
    })
  ]
};
const { css } = await sass.compileAsync('path/to/entry.scss', options);
```

### Use with legacy API

```js
import * as sass from 'sass';
import { createImporter } from '@hidoo/sass-importer';

const options = {
  file: 'path/to/entry.scss',
  importer: [
    createImporter({
      extensions: ['.scss'],
      mainFields: ['sass'],
      packagePrefix: '^'
    })
  ]
};
const { css } = await new Promise((resolve, reject) => {
  sass.render(options, (error, result) => {
    if (error) {
      reject(error);
    } else {
      resolve(result);
    }
  });
});
```

## Test

```sh
pnpm test
```

## License

MIT
