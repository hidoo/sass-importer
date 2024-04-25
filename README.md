# @hidoo/sass-importer

[![Test](https://github.com/hidoo/sass-importer/actions/workflows/test.yml/badge.svg)](https://github.com/hidoo/sass-importer/actions/workflows/test.yml)

> Custom sass importer.

## Installation

```sh
$ npm install @hidoo/sass-importer
```

## Usage

```js
import sass from 'sass';
import sassImporter from '@hidoo/sass-importer';

sass.render({
  file: 'path/to/entry.scss',
  importer: [sassImporter()]
});
```

## Test

```sh
$ yarn test
```

## License

MIT
