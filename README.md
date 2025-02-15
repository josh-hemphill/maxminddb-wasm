<div align="center">

  <h1><code>maxminddb</code> WASM</h1>

  <strong>A library that enables the usage of MaxmindDB geoIP databases by using the Rust library in a WebAssembly module</strong>

  <p>
    <a href="https://github.com/josh-hemphill/maxminddb-deno/releases"><img src="https://img.shields.io/github/v/tag/josh-hemphill/subslate?sort=semver&style=flat-square" alt="version" /></a>
    <a href="https://github.com/josh-hemphill/maxminddb-deno/actions/workflows/test.yml"><img src="https://img.shields.io/github/workflow/status/josh-hemphill/maxminddb-deno/Test?label=Tests&style=flat-square" alt="Test Status" /></a>
    <a href="https://github.com/josh-hemphill/maxminddb-deno/actions/workflows/build.yml"><img src="https://img.shields.io/github/workflow/status/josh-hemphill/maxminddb-deno/Build?label=Build&style=flat-square" alt="Build Status" /></a>
    <a href="https://deno.land/x/maxminddb/mod.ts"><img src="https://img.shields.io/static/v1?label=&message=Deno&logo=deno&color=informational&style=flat-square" alt="Deno Page" /></a>
    <a href="https://doc.deno.land/https/deno.land/x/maxminddb/mod.ts"><img src="https://img.shields.io/static/v1?label=&message=API-Doc&color=informational&style=flat-square&logo=deno" alt="API doc" /></a>
  </p>
</div>

## About

Uses the [Rust MaxmindDB library](https://crates.io/crates/maxminddb) to create a WASM binary to let you pass in the database yourself in `js/ts` and make it queryable.

## 🚴 Usage

### Deno

```ts
import { Maxmind } from "./mod.ts";
const dbRawFile = await Deno.readFile('./GeoLite2-City.mmdb')
const db = new Maxmind(dbRawFile)
const result = db.lookup_city('8.8.8.8')

```

## Contributing

### Build Setup

For running the automated build (which includes compiling the rust wasm) you'll need the following tools installed

  - [Deno](https://deno.land/#installation)
  - [Rust](https://doc.rust-lang.org/cargo/getting-started/installation.html)
  - [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)

Once you have all the necessary tools installed, you can just run `deno run --allow-run --allow-read --allow-write build.ts`

It builds the wasm and interfacing javascript and typescript definitions, does some transformation on the javascript to support Deno, and writes it to the dist folder.

### Testing

Under `test/test.ts`, the single non-comprehensive test downloads the available GeoLite2 test database from the Maxmind github repo, and uses that to test that basic functionality works. Since it fetches the test database over the network every run, it is a little slower (Though the test database is pretty small).
