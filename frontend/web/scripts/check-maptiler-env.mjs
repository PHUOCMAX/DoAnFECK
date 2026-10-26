const key = String(process.env.VITE_MAPTILER_KEY ?? "").trim();

if (!key) {
  console.error(
    "[MapTiler] VITE_MAPTILER_KEY is missing from the build environment."
  );
  console.error(
    "[MapTiler] Set it in the root .env (Docker) or the CI secrets, then rebuild."
  );
  process.exit(1);
}

console.log(
  `[MapTiler] VITE_MAPTILER_KEY detected at build time (length: ${key.length}).`
);
