# Third-party notices

The root MIT license covers Life Board's authored application code. It does not relicense third-party code or dependencies. Preserve the following notices when redistributing their code.

## Included source

- `build/sites-vite-plugin.ts` is vendored from `@openai/sites-vite-plugin` 0.2.0 and retains its upstream provenance comment. Its full MIT notice, copyright 2026 OpenAI, is in [`build/sites-vite-plugin.LICENSE`](build/sites-vite-plugin.LICENSE). The public [OpenAI Sites repository license](https://github.com/openai/sites/blob/main/LICENSE) is an upstream reference
- The shadcn-derived `components/ui/*`, `hooks/use-mobile.ts` and vendored Tailwind CSS use the preserved MIT notice, copyright 2023 shadcn, in [`vendor/shadcn-tailwind-4.13.0.LICENSE.md`](vendor/shadcn-tailwind-4.13.0.LICENSE.md). The public [shadcn/ui license](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md) is an upstream reference
- The repository also retains Sites starter scaffolding and development helpers. The above attribution is an observed-source map; it is not a claim of independent legal clearance for every upstream project

## Installed dependencies

`package-lock.json` pins package versions, registry tarballs and integrity hashes. A generated [locked dependency license inventory](docs/dependency-licenses.json) records the license metadata for each dependency path, including optional and development packages. Consult each package's own complete LICENSE/NOTICE files for authoritative terms; registry metadata alone is not a full compliance analysis.

Direct application and development dependencies have permissive license declarations in this lockfile. Transitive packages also include MPL-2.0, LGPL-3.0-or-later, mixed LGPL/Apache/MIT, CC-BY-4.0 and other licenses. Sharp and its platform-specific native libvips packages are examples of dependencies requiring attention when redistributing built or native artifacts. These packages are installed separately from npm and are not checked into this source-only release.

The root MIT license does not replace Apache notice requirements, MPL source obligations, LGPL requirements, attribution requirements or any other applicable upstream condition. Review the actual packages and distribution method before redistributing `node_modules`, native binaries, bundled server assets or a container image. The inventory is a starting point, not a legal guarantee or a vulnerability scan.
