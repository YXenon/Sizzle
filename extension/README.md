# Sizzle (Extension)

If you wanna build the extension from start, you can easily do that.

1. Install dependencies

   ```sh
   npm install # npm
   ```

2. Build extension

   ```sh
   npm run build # npm
   ```

3. Optional: Remove wasm file, it reduces final bundle size.

   ```sh
   rm "dist/assets/ort-wasm-simd-threaded.jsep-<id>.wasm"
   ```

   You will need to find the wasm file manually as bundler generates a different id every time.

4. Bundle extension:

   ```sh
   npx crx3 -p key.pem -o sizzle.crx ./dist # for chrome (and chromium based) browsers
   npx web-ext build -s ./dist -n sizzle.xpi -o -a ./ # for firefox (and firefox based) browsers
   ```

> Replace `npm` with `bun`, and `npx` with `bunx` if you're using Bun.
