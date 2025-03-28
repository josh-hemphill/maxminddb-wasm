<div align="center">

  <h1><code>maxminddb</code> WASM</h1>

  <strong>A library that enables the usage of MaxmindDB geoIP databases by using the Rust library in a WebAssembly module</strong>

  <p>
    <a href="https://github.com/josh-hemphill/maxminddb-wasm/releases"><img src="https://img.shields.io/github/v/tag/josh-hemphill/maxminddb-wasm?sort=semver&style=flat-square" alt="version" /></a>
    <a href="https://github.com/josh-hemphill/maxminddb-wasm/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/josh-hemphill/maxminddb-wasm/ci.yml?label=CI&style=flat-square" alt="CI Status" /></a>
    <a href="https://www.npmjs.com/package/maxminddb-wasm"><img src="https://img.shields.io/npm/v/maxminddb-wasm?label=NPM&message=NPM&logo=nodedotjs&color=informational" alt="NPM" /></a>
    <a href="https://jsr.io/@josh-hemphill/maxminddb-wasm"><img src="https://img.shields.io/jsr/v/%40josh-hemphill/maxminddb-wasm?label=JSR&message=JSR&logo=jsr&color=informational&style=flat-square" alt="jsr.io" /></a>
    <a href="https://deno.land/x/maxminddb/mod.ts"><img src="https://img.shields.io/static/v1?label=&message=Deno.Land&logo=deno&color=informational&style=flat-square" alt="Deno Land" /></a>
  </p>
  <p>
    <a href="https://github.com/josh-hemphill/maxminddb-wasm/actions/workflows/ci.yml"><img src=".github/badges/test-deno.svg" alt="Deno Status" /></a>
    <a href="https://github.com/josh-hemphill/maxminddb-wasm/actions/workflows/ci.yml"><img src=".github/badges/test-bun.svg" alt="Bun Status" /></a>
    <a href="https://github.com/josh-hemphill/maxminddb-wasm/actions/workflows/ci.yml"><img src=".github/badges/test-browser.svg" alt="Browser Status" /></a>
    <a href="https://github.com/josh-hemphill/maxminddb-wasm/actions/workflows/ci.yml"><img src=".github/badges/test-cloudflare.svg" alt="Cloudflare Status" /></a>
    <a href="https://github.com/josh-hemphill/maxminddb-wasm/actions/workflows/ci.yml"><img src=".github/badges/test-node.svg" alt="Node CJS Status" /></a>
    <a href="https://github.com/josh-hemphill/maxminddb-wasm/actions/workflows/ci.yml"><img src=".github/badges/test-node-module.svg" alt="Node Module Status" /></a>
  </p>
</div>

## About

Uses the [Rust MaxmindDB library](https://crates.io/crates/maxminddb) to create a WASM binary that lets you query MaxMind databases directly in JavaScript/TypeScript.

### Status

  - [x] Node.js
  - [x] Deno
  - [x] Bun
  - [/] Browser (tests are flaky, so not certain)
  - [?] Cloudflare Workers (have not been able to get them to work locally, you can see the tests [here](https://github.com/josh-hemphill/maxminddb-wasm/blob/main/.github/workflows/test.yml))

## Installation

### Node.js / Browser (npm)

```bash
npm install maxminddb-wasm
# or
pnpm add maxminddb-wasm
```

### Deno ([jsr](https://jsr.io/docs/introduction))

```ts
import { Maxmind } from "jsr:@josh-hemphill/maxminddb-wasm/bundler";
```

## Usage Examples

### Node.js

```ts
import { readFile } from 'node:fs/promises';
import { Maxmind } from 'maxminddb-wasm/node-module';

const dbFile = await readFile('./GeoLite2-City.mmdb');
const maxmind = new Maxmind(dbFile);
const result = maxmind.lookup_city('8.8.8.8');
console.log(result);
```

### Deno

```ts
import { Maxmind } from "jsr:@josh-hemphill/maxminddb-wasm/bundler";

const dbFile = await Deno.readFile('./GeoLite2-City.mmdb');
const maxmind = new Maxmind(dbFile);
const result = maxmind.lookup_city('8.8.8.8');
console.log(result);
```

### Browser

```ts
import { Maxmind } from 'maxminddb-wasm/browser';

// Fetch the database file
const response = await fetch('/GeoLite2-City.mmdb');
const dbFile = new Uint8Array(await response.arrayBuffer());
const maxmind = new Maxmind(dbFile);
const result = maxmind.lookup_city('8.8.8.8');
```

### Cloudflare Workers

```ts
import { Maxmind } from 'maxminddb-wasm/browser';

export default {
  async fetch(request, env) {
    const maxmind = new Maxmind(new Uint8Array(env.MAXMIND_DB));
    const ip = request.headers.get('cf-connecting-ip');
    const result = maxmind.lookup_city(ip);
    return new Response(JSON.stringify(result));
  }
};
```

### Bun

```ts
import { Maxmind } from 'maxminddb-wasm/node-module';

const dbFile = await Bun.file('./GeoLite2-City.mmdb').arrayBuffer();
const maxmind = new Maxmind(new Uint8Array(dbFile));
const result = maxmind.lookup_city('8.8.8.8');
```

## API Reference

### `Maxmind` Class

#### Constructor

```ts
new Maxmind(dbFile: Uint8Array)
```

Creates a new Maxmind instance with the provided database file.

#### Methods

##### `lookup_city(ip: string): CityResponse`

Looks up city information for the given IP address.

##### `lookup_prefix(ip: string): PrefixResponse`

Looks up network prefix information for the given IP address.

##### `metadata: Metadata`

Read-only property that returns database metadata.

### Response Types

#### `CityResponse`

```ts
interface CityResponse {
    city?: CityRecord;
    continent?: ContinentRecord;
    country?: CountryRecord;
    subdivisions?: SubdivisionRecord[];
    location?: LocationRecord;
}
```

#### `CityRecord`

```ts
interface CityRecord {
    geoname_id?: number;
    names?: Record<string, string>;
}
```

#### `ContinentRecord`

```ts
interface ContinentRecord {
    code?: string;
    geoname_id?: number;
    names?: Record<string, string>;
}
```

#### `CountryRecord`

```ts
interface CountryRecord {
    geoname_id?: number;
    iso_code?: string;
    names?: Record<string, string>;
}
```

#### `SubdivisionRecord`

```ts
interface SubdivisionRecord {
    geoname_id?: number;
    iso_code?: string;
    names?: Record<string, string>;
}
```

#### `LocationRecord`

```ts
interface LocationRecord {
    latitude?: number;
    longitude?: number;
    time_zone?: string;
}
```

#### `PrefixResponse`

```ts
interface PrefixResponse {
    city: CityResponse;
    prefix_length: number;
}
```

#### `Metadata`

```ts
interface Metadata {
    binary_format_major_version: number;
    binary_format_minor_version: number;
    build_epoch: number;
    database_type: string;
    description: Record<string, string>;
    ip_version: number;
    languages: string[];
    node_count: number;
    record_size: number;
}
```

## Contributing

### Build Setup

For running the automated build (which includes compiling the rust wasm) you'll need the following tools installed:

  - [node](https://nodejs.org/en/download/)
  - [pnpm](https://pnpm.io/installation)
  - [Rust](https://doc.rust-lang.org/cargo/getting-started/installation.html)

Once you have all the necessary tools installed, you can just run `pnpm build`

### Testing

Under `tests/*`, there are tests for each platform that can be run with the `pnpm test` command. On first run, it will download the test database from the Maxmind github repo.
