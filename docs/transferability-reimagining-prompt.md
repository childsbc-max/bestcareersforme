# Prompt: Reimagine transferability using Top Skills & Hot Technologies (SOC-like grouping)

Copy everything **between the lines** into Claude, ChatGPT, or your internal spec review.

---

**Role:** You are a labor-market data + recommender-systems architect. Our current `transferabilityScore` is too weak: small numeric tweaks, description Jaccard, and a light graph term. We want to **scrap that design philosophy** and replace it with a **skill-first, technology-first** model.

**Product context:** A career quiz. Users (especially persona **P4**) list **past job(s)** by SOC. Today we heavily scope candidates with **SOC prefix / major overlap** (coarse, often wrong). We want **Top Skills (O\*NET)** and **Hot Technologies (O\*NET)** to define **similarly skilled job neighborhoods**—used **like SOC codes**: to **group**, **scope**, and **rank**, not only as a tiny tie-breaker.

**Assume per occupation (SOC) we can provide:**

- `soc` (BLS-style, e.g. `53-2022.00`)
- `topSkills`: list of O\*NET skill elements (**prefer stable Element IDs**; include human name + optional importance level if available)
- `hotTechnologies`: normalized software/tool/platform names (deduped, version-agnostic where possible)
- Existing: `jobDescription`, optional `relatedOccupations` edges (secondary signal only)

**Discard:** “One blended 0–1 score as the only lever” when that score is dominated by generic text overlap and rarely changes ordering.

**Reimagine around these principles:**

1. **Skill–tech signature**  
   Each SOC has a **signature**: a weighted vector or multiset over **skill IDs** and **technology tokens** (with clear handling of missing tech).

2. **Neighborhoods (SOC-analog)**  
   Define **SkillNeighborhood**s (and optionally **TechCluster**s) so that occupations map similarly to how SOC maps to **major → minor → detailed** groups. Concretely:
   - Propose **how** to derive group IDs (e.g. hierarchical clustering on skill vectors, graph community detection on skill co-occurrence, or O\*NET “skill families” if you use them—justify tradeoffs).
   - **Requirement:** Two jobs in the same neighborhood should be **explainable** (“shared skills X, Y; shared tools A, B”), not a black box.

3. **Use neighborhoods like SOC in the product**  
   Specify **at least two** integration modes (similar in spirit to current SOC usage):
   - **Scope / gate:** e.g. candidate must fall in **union of neighborhoods** of the user’s past job(s), **or** satisfy a **minimum neighborhood affinity** to enter the pool (define mathematically).
   - **Rank / boost:** within the scoped pool, rank by **distance** or **affinity** in skill–tech space (not by a single opaque scalar unless you decompose it).

4. **Separation of concerns**  
   - **Generic skills** (e.g. Active Listening) must **not** collapse unrelated jobs into one cluster. Propose **IDF weighting**, **stoplists**, or **skill-tier** (cross-occupation ubiquity) explicitly.
   - **Technologies** should materially separate domains (e.g. CAD vs CRM vs IDE stacks) when data exists.

5. **Data & ops**  
   - Ingest shape: JSON sidecar keyed by SOC (`onet-by-soc.json` or merged rows).
   - **Offline:** precompute **neighborhood membership**, **pairwise affinity** sparse matrices, or **ANN index**—choose one MVP and one v2.
   - **Runtime budget:** state acceptable latency for ~1k occupations.

6. **Evaluation**  
   - 20–30 labeled **(past job SOC → should rank above / should not appear)** triples across military, healthcare, IT, trades, logistics.
   - 5 **adversarial** pairs where SOC family is close but **skills/tech diverge** (must **not** cluster together).
   - Metrics: top-k hit rate, **constraint violation** rate vs education/salary filters (unchanged).

7. **Deliverables (structured output)**  
   1. Concept diagram (mermaid or prose): SOC world vs Skill–Tech world.  
   2. **Formal definitions:** SkillNeighborhood ID, membership, user “past-job footprint.”  
   3. **Scoping rule(s)** and **ranking rule(s)** with pseudocode.  
   4. **Migration plan** from current “single transferabilityScore + small penalty” to **neighborhood-first** scoring (what to delete, what to keep).  
   5. Risks: data sparsity, stale tech, SOC–O\*NET alignment, cold-start occupations.

**Explicit non-goals:** Debating O\*NET/BLS “truth”; building exact SOC crosswalks unless needed for normalization.

**Output tone:** Precise enough that an engineer can implement MVP in TypeScript/Python with precomputed JSON artifacts.

---

## Optional constraint (if you want tighter alignment to our codebase)

Mention that production scoring lives in `bestjobforme/lib/scoring.ts` with hard filters first, then soft penalties, then Holland; any new model should specify **where** neighborhood gating runs relative to `applyCurrentJobScope` and education/salary filters.

---

## After you get the model output

1. Freeze **one** MVP neighborhood definition + one **scoping** rule + one **ranking** rule.  
2. Extend `data/onet-by-soc.json` with real **topSkills** / **hotTechnologies** for a **pilot slice** of SOCs (e.g. 50 occupations including `53-2022.00` and several “corporate” SOCs) to validate clustering before full ingest.  
3. Re-run `eval:score` and compare ordered `topCareers` for the same synthetic P4 specs.
