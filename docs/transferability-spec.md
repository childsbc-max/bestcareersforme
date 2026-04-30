# Job transferability metric (frozen MVP)

This document freezes the **MVP** `transferability(fromSoc, toSoc)` implemented in [`lib/transferability.ts`](../lib/transferability.ts) and precomputed by [`scripts/build-transferability.ts`](../scripts/build-transferability.ts) into [`data/transferability-neighbors.json`](../data/transferability-neighbors.json).

## Interpretation

**`combined` score in \[0, 1\]:** Expected overlap of **reusable capabilities** between two occupations—skills and tools (when present in [`data/onet-by-soc.json`](../data/onet-by-soc.json)), **task language** from job descriptions, and **O*NET-style relatedness hops** from [`data/relatedOccupations.json`](../data/relatedOccupations.json). Higher means a more plausible lateral move from the source job.

## Sub-scores and weights

Default weights (redistributed if skills or tech are missing for a pair):

| Component           | Weight | Notes |
|---------------------|--------|--------|
| `skillsMatch`       | 0.35   | Weighted overlap on O*NET skill entries; generic skills down-weighted. |
| `techMatch`         | 0.25   | Jaccard on `hotTechnologies` strings (normalized). |
| `descriptionMatch`  | 0.30   | Jaccard on tokenized `jobDescription` (stopwords removed). |
| `graphMatch`        | 0.10   | Related graph: 1-hop = 1.0, 2-hop = 0.55, 3-hop = 0.18. |

If **`onet-by-soc.json`** has no `topSkills` for either occupation, skill weight shifts ~55% to description and ~45% to graph. If **`hotTechnologies`** is missing for either side, tech weight shifts ~65% to description and ~35% to graph.

## O*NET sidecar

[`data/onet-by-soc.json`](../data/onet-by-soc.json) is keyed by SOC (raw or normalized). Example record:

```json
{
  "15-1252.00": {
    "topSkills": [{ "id": "2.B.1.a", "name": "Programming", "importance": 4.5 }],
    "hotTechnologies": ["Python", "Git"]
  }
}
```

Empty `{}` is valid; the metric still runs on description + graph.

## Runtime integration

- **Penalty:** Up to **22** penalty points subtracted when transferability is high (`transferabilityPenaltyDelta`).
- **Sort tie-break:** After penalty, higher `transferability` ranks above lower (see [`lib/scoring.ts`](../lib/scoring.ts)).
- **Scope:** Applied when the user has **past job SOC(s)** (see `resolveTransferabilityScore`; persona id does not gate this lookup).

## Regenerating data

After changing `careers.json`, `relatedOccupations.json`, or `onet-by-soc.json`:

```bash
npx tsx scripts/build-transferability.ts
```

## Hand-check pairs (validation)

Use these to sanity-check ordering (not automated in CI). **Expected:** score(A) > score(B) for “closer” pivot.

| From (SOC)   | Closer (A) | Farther (B) |
|-------------|------------|-------------|
| `29-1141.00` Registered Nurses | `29-1171.00` Nurse Practitioners | `11-9111.00` Medical/Hlth Svcs Managers |
| `15-1252.00` Software Developers | `15-1254.00` Web Developers | `11-1011.00` Chief Executives |
| `13-1071.00` HR Specialists | `13-1075.00` Labor Relations Specialists | `47-2111.00` Electricians |
| `53-3032.00` Heavy Truck Drivers | `53-6041.00` Transportation Inspectors | `23-1011.00` Lawyers |

## Failure cases to watch

1. **Generic descriptions** → inflated description overlap across unrelated office jobs.  
2. **Stale hot tech** → false confidence for IT pivots.  
3. **SOC normalization collisions** (multiple detailed SOCs map to one normalized key) → precomputed row overwritten in build; runtime fallback still uses full pair scoring.  
4. **Graph without skills** → short paths between distant titles; weights rely more on description.  
5. **Empty related graph for a SOC** → `graphMatch` = 0; rely on text/O*NET.

## v2 ideas (out of scope for MVP)

- Learned weights from labeled pairs; embeddings for descriptions; SOC-specific IDF for tokens; separate “manager vs IC” guardrails.
