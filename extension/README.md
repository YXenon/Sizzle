# Sizzle (Extension)

## Install

Currently, you can install the extension only using the `.crx` files.

## Build

If you wanna build the extension from start, you can easily do that.

1. Install dependencies

   ```sh
   npm install
   ```

2. Build extension

   ```sh
   npm run build
   ```

3. Optional: Remove wasm file, reduces final bundle size.

   ```sh
   rm "dist/assets/ort-wasm-simd-threaded.jsep-<id>.wasm"
   ```

   You will need to find the wasm file manually as bundler generates a different id every time.
