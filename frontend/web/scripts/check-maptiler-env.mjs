const key = String(process.env.VITE_MAPTILER_KEY ?? "").trim();

if (!key) {
  console.error(
    "[MapTiler] VITE_MAPTILER_KEY is missing from the Vercel build environment."
  );
  console.error(
    "[MapTiler] Enable the variable for Production in Vercel, then redeploy."
  );
  process.exit(1);
}

console.log(
  `[MapTiler] VITE_MAPTILER_KEY detected at build time (length: ${key.length}).`
);
