import Link from "next/link"

const packages = [
  ["registry", "Authority", "Normalized JSON, schemas, types, and recursive resolution."],
  ["api", "Read surface", "Versioned GET endpoints over the registry package."],
  ["sdk", "Client surface", "Typed registry access and opt-in provider connections."],
  ["cli", "Local workflow", "Hardware detection, TUI selection, and recipe resolution."],
  ["site", "Human surface", "Searchable registry, linked records, and this wiki."],
  ["omarchy-plugin", "OS adapter", "Omarchy panel, lifecycle commands, and agent wiring."],
  ["submission-harness", "Write gate", "Imports, normalization, validation, and reviewable diffs."],
]

export default function DocsPage() {
  return (
    <main className="wiki-shell">
      <aside className="wiki-nav">
        <span className="mono-label">LOCAL AI / WIKI</span>
        <nav>
          <a href="#what">What this is</a>
          <a href="#flow">System flow</a>
          <a href="#packages">Packages</a>
          <a href="#registry">Registry tree</a>
          <a href="#huggingface">Hugging Face</a>
          <a href="#grow">How to grow it</a>
        </nav>
        <Link href="/">Open registry</Link>
      </aside>
      <article className="wiki-content">
        <header className="wiki-hero" id="what">
          <span className="mono-label">PROJECT / LOCAL AI GLOBAL</span>
          <h1>One graph from hardware to a working local model.</h1>
          <p>Local AI Global turns detected hardware into a small set of compatible model artifacts and validated runtime recipes. Every answer stays traceable to normalized records, source links, launch contracts, prices, and measured speed.</p>
        </header>

        <section id="flow">
          <span className="mono-label">01 / SYSTEM FLOW</span>
          <h2>Discovery is progressive.</h2>
          <div className="wiki-flow">
            <span>User hardware</span><i>→</i><span>Registry match</span><i>→</i><span>Model choice</span><i>→</i><span>Recipe</span><i>→</i><span>Local runtime</span><i>→</i><span>Evidence</span>
          </div>
          <p>The index carries compact discovery rows. Full model, artifact, hardware, recipe, price, and sweep bodies are opened only when requested. Consumers never flatten the graph into their own database.</p>
        </section>

        <section id="packages">
          <span className="mono-label">02 / PACKAGE OWNERSHIP</span>
          <h2>One monorepo, hard boundaries.</h2>
          <div className="wiki-package-grid">
            {packages.map(([name, role, description]) => <div key={name}><code>packages/{name}</code><strong>{role}</strong><p>{description}</p></div>)}
          </div>
        </section>

        <section id="registry">
          <span className="mono-label">03 / SOURCE OF TRUTH</span>
          <h2>The registry is a recursive tree.</h2>
          <pre className="wiki-tree">{`index.json
└── recipe/<id>.json
    ├── model_instance_id → model-instance/<id>.json
    │   └── model_id      → model/<id>.json
    ├── hardware_id       → hardware/<id>.json
    └── speed_sweeps_ids  → speed-sweeps/<id>.json

price/<product>/<region>.json
└── hardware[].id         → hardware/<id>.json`}</pre>
          <p>Registry IDs are stable machine keys. Human interfaces resolve them into model names, hardware names, publishers, engines, memory, storage size, dates, and measured rates. Raw IDs remain available in record detail and JSON.</p>
        </section>

        <section id="huggingface">
          <span className="mono-label">04 / HUGGING FACE</span>
          <h2>Connected access enriches the user experience, never the source of truth.</h2>
          <ul>
            <li>Each model instance supplies its authoritative Hugging Face URL.</li>
            <li>Public model-card metadata, publisher identity, repository storage, license, downloads, and likes are resolved from that URL.</li>
            <li>A user connection adds identity and gated-repository access without storing the token in registry JSON.</li>
            <li>The CLI may inspect the local Hugging Face cache and download a selected artifact after explicit user action.</li>
            <li>Remote failure degrades to normalized registry metadata; recipe resolution still works offline.</li>
          </ul>
        </section>

        <section id="grow">
          <span className="mono-label">05 / CONTRIBUTION PATH</span>
          <h2>Grow evidence first.</h2>
          <ol>
            <li>Submit source material to the submission harness.</li>
            <li>Normalize it into existing schema fields and explicit unknowns.</li>
            <li>Validate IDs, references, provenance, and launch-safety rules.</li>
            <li>Review the generated registry-only diff.</li>
            <li>Merge candidate compatibility or validated launch evidence.</li>
            <li>Let the API, SDK, CLI, site, and Omarchy plugin discover it automatically.</li>
          </ol>
        </section>
      </article>
    </main>
  )
}
