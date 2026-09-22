# Formwork

A product-to-Rhino workspace for interior designers. This working, narrow MVP reviews product references, approves structured dimensions, generates genuine `.3dm` geometry, inspects QA, and saves/downloads models.

## Working capabilities

- Editorial library with text, category, manufacturer, project, and status filters.
- Combined URL, manual specification, and persistent uploaded references.
- Conservative JSON-LD product research, metric dimension extraction, conflict flags, and discovered manufacturer CAD links.
- Editable Verified, Derived, and Estimated dimensions with individual approval gates and source/evidence fields.
- Real Rhino3dm 8.17.0 NURBS generation for rectangular tables/stools with four square legs and straight rectangular pulls with two supports.
- Material layers, named product groups, and reused component block instances.
- Millimeter units, Z up, front −Y. Furniture is centered at floor level; pulls reference the mounting plane.
- Serialized-file QA, component/product bounds, solid validity, mesh/duplicate checks, layers, placement, overlap, and file size.
- CSV schedule import and combined export on a 2000 mm grid with extra cells for large products.
- Persistent products and files: Cloudflare D1/R2 in production; SQLite/local files in development.

## Local setup

Use Node.js 24 LTS and npm. The local adapter uses built-in `node:sqlite`.

```sh
npm ci
npm run dev:local
```

Open the printed localhost URL, normally `http://localhost:5173`. The ignored `.local-data/` folder stores the SQLite database and uploaded/generated files. Reloads and server restarts preserve records.

`npm run dev` uses Cloudflare's workerd preview and requires child-process communication. Use `dev:local` on restricted Windows hosts. If npm cannot write its cache, set `npm_config_cache` to a writable folder. This checkout's prebuilt dependencies also installed with `npm ci --ignore-scripts` when lifecycle subprocesses were denied; ordinary environments should use normal `npm ci`.

### Try the complete workflow

1. Choose **Try a sample specification** in the empty library.
2. Open **Specification** and inspect the six sample dimensions.
3. Approve each estimate, then generate the Rhino model.
4. Inspect **Geometry & QA** and download `.3dm`.
5. Reopen the saved product to download it again.

Samples are demonstration estimates, not manufacturer facts. Use `public/schedule-template.csv` for batch input. Imported dimensions require approval. **Export ready** exports ready products matching the current filters and excludes unready products.

## Architecture

Research and geometry share only a validated specification. Geometry never fetches reference content.

```text
app/page.tsx                         Library, filters, CSV import, batch export
components/specification-editor.tsx  Reference/review/generation/QA workflow
lib/specification.ts                Zod schema and approval gates
lib/research.ts                     ResearchProvider and URL parser
lib/schedule.ts                     CSV parsing into specifications
lib/geometry/engine.mjs             Pure geometry generation and QA
lib/geometry/browser.ts             Isolated worker lifecycle
public/rhino/model-worker.js        Fresh Rhino/WASM heap per job
app/api/products/route.ts           Durable product records
app/api/research/route.ts           Research-provider boundary
app/api/files/route.ts              References and downloads
app/api/models/route.ts             Model persistence
db/schema.ts                       Database schema
drizzle/                           Versioned migrations
lib/local-storage.ts                Node-only SQLite/file adapter
```

The intermediate specification includes identity, variant, category, project, material, finish, dimensions, evidence, approval state, source URLs/documents, strategy, notes, and discovered CAD assets. The geometry interface can later be replaced by Rhino.Compute, RhinoCommon, or local automation without coupling it to research.

### Database schema

`products` contains UUID `id`, JSON `specification`, `status`, `created_at`, and `updated_at`. Generated file keys and QA are retained in the product record. File bytes live separately in R2. This is one private studio library, not a multi-tenant service.

Drizzle owns migrations. The initial migration used Drizzle's programmatic API because this host denied the CLI subprocess. Use `npm run db:generate` for later changes; never rewrite applied migrations. The local adapter applies generated migrations transactionally.

## Research providers and environment

| Variable | Purpose |
| --- | --- |
| `RESEARCH_PROVIDER_URL` | Optional trusted HTTPS research endpoint |
| `RESEARCH_PROVIDER_KEY` | Optional server-side bearer credential |
| `FORMWORK_LOCAL_NODE` | Local adapter switch; omit in production |
| `DB` | Cloudflare D1 binding |
| `BUCKET` | Cloudflare R2 binding |

`.env.example` documents placeholders. Export optional research variables in the shell or use Node's `--env-file` support; the local script does not automatically load this example. Manage hosted secrets through the hosting platform. Never commit secrets.

Without credentials, the built-in provider inspects explicit JSON-LD data from supplied public HTTPS pages. It does not perform general web search or visual identification. The reviewer confirms source authority and product variant. Supplied manufacturer documents take priority; conflicting values remain flagged.

The optional provider receives specification JSON and returns a partial specification. The server validates the merged result and clears dimension approvals. Uploaded references are represented by opaque storage keys; document-aware providers require their own authorized storage integration. No anonymous public document URLs or secrets are sent by the app.

Prioritize manufacturer technical documentation, official product pages, official CAD, authorized distributors, then retailers. Record evidence and uncertainty rather than inventing missing dimensions.

## Geometry and QA

Each job uses a fresh Web Worker and Rhino heap. Termination releases native allocations after completion, error, or a 90-second timeout. Asset preparation copies the pinned Rhino runtime and shared engine before dev/build.

Geometry consists of closed Breps generated from dimensioned boxes. Repeated components reuse blocks. Complete products use named **groups**, not nested parent blocks: nested block creation exposed a Rhino3dm native-memory error in repeated/batch tests. Product grouping and component block reuse remain intact. A future geometry adapter can support complete nested product blocks and curved/rebuilt geometry.

Geometry and placement are deterministic. File bytes need not match because Rhino creates IDs and timestamps. Odd dimensions may create half-millimeter center coordinates; intended dimensions and component sizes remain whole millimeters.

QA reopens serialized bytes and walks block references to check component/product bounds within 0.001 mm. Closed solids exclude naked boundary edges for these primitives. Limits: 10 MB per model, 100 products per batch. Arbitrary surface/control-point analysis and imported geometry repair are not implemented.

QA runs in the browser worker. The server validates the Rhino header, report status, size, approved specification, and stored specification before saving. It does not independently recompute or certify client QA. Add server-side generation/QA and per-user authorization before opening this private MVP to untrusted users.

## Verification

```sh
npm run typecheck
npm run test:geometry
npm run build
```

Geometry tests cover all supported strategies, rejected unapproved/fractional/impossible/unsupported inputs, real file read-back, product bounds, oversized grid allocation, and geometric determinism. Tests produce `sample-table.3dm`, `sample-table-qa.json`, and `sample-schedule.3dm`.

Browser testing exercised approval, generation, saved Ready status, and the Rhino download link. All three reference photos loaded. See `VERIFICATION.md`.

## Deployment

Production targets Cloudflare Workers through Vinext/Sites. `.openai/hosting.json` declares logical D1/R2 bindings. Build without `FORMWORK_LOCAL_NODE=1`. Provision storage, apply migrations, configure secrets, and protect access through the hosting platform. The Node adapter is local-only and must not be exposed publicly.

GitHub stores source; pushing does not deploy the app or provision storage. For another Cloudflare account, configure equivalent D1/R2 bindings and access policy for the generated Worker/assets.

## Known limitations

- No automatic image recognition, PDF/catalog extraction, or general web search without a separate research provider.
- XLSX is retained as a reference; schedule import currently requires CSV.
- Basins, faucets, lights, curved chairs, and other complex forms require custom modeling. The three rectilinear strategies are the current generation scope.
- Discovered CAD assets are linked for review, not automatically cleaned or rebuilt.
- One material per product; multiple component materials need an editor/schema extension.
- Product groups replace nested parent blocks.
- No independent server QA, multi-user isolation, background queue, version history, or production monitoring.
- Reference-board photos are retailer/manufacturer examples, not verified models. No open reuse license was identified; use licensed assets for a commercial launch.

## References

- [McNeel Rhino3dm](https://www.rhino3d.com/features/developer/rhino3dm/)
- [Rhino3dm JavaScript API](https://mcneel.github.io/rhino3dm/javascript/api/)
- [Visual inspiration: Programa FF&E](https://programa.design/blog/ff-e-procurement)
