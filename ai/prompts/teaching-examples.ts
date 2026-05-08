/**
 * TEACHING EXAMPLES - Demonstration of adaptive teaching-mode responses across domains.
 *
 * These examples show how Forge adapts explanations based on audience level:
 * - MINIMAL (beginner): simple language, one analogy, step-by-step
 * - STANDARD (intermediate): technical accuracy, multiple examples, tradeoffs
 * - DEEP (advanced): edge cases, design philosophy, optimization
 *
 * Copy and modify for documentation and user education.
 */

// ============================================================================
// EXAMPLE 1: JavaScript Closures (Technical Domain)
// ============================================================================

export const CLOSURE_BEGINNER = `
## JavaScript Closures Explained Simply

A closure is like a **backpack that a function carries with it**. When you create a function, it remembers the variables from where it was created—even after leaving that place.

**Simple example:**
\`\`\`javascript
function makeCounter() {
  let count = 0;  // The backpack
  return function() {
    count++;      // The function inside "remembers" count
    return count;
  };
}

const counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2
\`\`\`

Every time you call \`counter()\`, it increments and remembers the value. That's a closure: the inner function "closes over" the \`count\` variable.

**Why this matters:** Closures let you create functions that remember information between calls. You'll see them everywhere in JavaScript—timers, callbacks, and privacy patterns.
`;

export const CLOSURE_INTERMEDIATE = `
## Closures: Memory and Scope

A closure is a function that retains access to variables from its lexical scope, even after the parent function returns. This happens because JavaScript functions form closures around their environment.

**Mechanism:**
When a function is created, it maintains a reference to its lexical scope (the block where it was defined). If that function is returned or passed elsewhere, it carries that scope with it. The variables in that scope aren't garbage-collected because the function still references them.

**Practical example—memoization:**
\`\`\`javascript
function memoize(fn) {
  const cache = {};  // Closed over by the wrapper
  return (arg) => {
    if (arg in cache) return cache[arg];
    cache[arg] = fn(arg);
    return cache[arg];
  };
}

const expensiveFunc = memoize((n) => {
  console.log("Computing...");
  return n * 2;
});

expensiveFunc(5);  // "Computing..." → 10
expensiveFunc(5);  // 10 (cached, no log)
\`\`\`

**Tradeoffs:**
- **Benefit:** Memory efficiency for repeated calls; enables stateful behavior without classes.
- **Cost:** Memory overhead if the closure scope is large; can hide unexpected dependencies.

Further detail → Closures and garbage collection: variables in a closure remain in memory as long as the closure exists. Long-lived closures can prevent garbage collection, causing memory leaks in server applications or event listeners.
`;

export const CLOSURE_ADVANCED = `
## Closures: Design Patterns and Performance Implications

Closures are a fundamental mechanism enabling functional programming patterns in JavaScript. Understanding their memory and execution implications is critical for production code.

**Technical deep-dive:**

Every function has an internal [[Scope]] slot pointing to its lexical environment. When a function is instantiated, it captures bindings from that environment. If the function is returned or referenced elsewhere, the engine must preserve those bindings, preventing garbage collection.

In JavaScript engines (V8, SpiderMonkey, JavaScriptCore), closure memory isn't "free." Consider:

\`\`\`javascript
function problematicFactory() {
  const largeData = new Array(1_000_000).fill("data");
  return () => largeData[0];  // Closure captures entire largeData
}

const fn = problematicFactory();
// largeData stays in memory forever because fn references it
\`\`\`

**Edge cases and optimization:**
1. **Dead variable elimination:** Modern engines attempt to eliminate variables that closures don't actually reference. If a closure doesn't use \`largeData\` but the function does, the engine *may* garbage-collect it. This depends on implementation.
   
2. **Event listener leaks:** A common memory leak pattern:
\`\`\`javascript
function setupListener() {
  const hugeObject = { /* 1MB of data */ };
  element.addEventListener('click', () => {
    console.log(hugeObject); // Unintentional closure
  });
}
\`\`\`
The closure captures \`hugeObject\` even if unused, preventing GC while the listener is attached.

3. **Scope chain traversal:** Closures incur a small performance cost when accessing outer variables. Deep scope chains (nested closures) require multiple lookups. This is negligible in most cases but matters in tight loops or hot paths.

**Design philosophy:** Closures enable powerful patterns (module pattern, factory functions, partial application) but require careful scoping. Industrial-strength code should:
- Minimize closure scope sizes
- Explicitly null out references in long-lived closures when done
- Profile memory usage in server environments
- Prefer class-based encapsulation when performance-critical

**ADVANCED:** Some engines (V8 8.1+) use "closure-aware" garbage collection. Engines track which variables are truly referenced and can collect the rest. However, guaranteeing this is language-implementation-specific.

WHY THIS MATTERS: Closure memory leaks are rare in small apps but critical in long-running servers (Node.js) processing thousands of requests. A single 1MB leak × 10,000 connections = 10GB memory overhead.
`;

// ============================================================================
// EXAMPLE 2: CRISPR Gene Editing (Scientific Domain)
// ============================================================================

export const CRISPR_BEGINNER = `
## What is CRISPR? A Simple Explanation

Imagine a massive instruction manual (your DNA) with billions of words. CRISPR is like a **find-and-replace tool** for DNA—it finds a specific misspelling and corrects it.

**How it works:**
1. Scientists program CRISPR to search for a specific disease gene
2. CRISPR finds that exact spot in your DNA
3. It cuts the DNA there
4. The cell either:
   - Deletes the broken part (turning off a harmful gene)
   - Replaces it with a correct version

**Real-world analogy:**
Think of DNA as a recipe. If a recipe says "add 500 cups of sugar" (a mutation), CRISPR finds that line and changes it to "add 5 cups." Now the cake isn't ruined.

**Why it matters:**
CRISPR could treat genetic diseases like sickle cell anemia, cystic fibrosis, and some cancers—by fixing the gene at its source instead of just treating symptoms.
`;

export const CRISPR_INTERMEDIATE = `
## CRISPR: Mechanism and Current Applications

CRISPR-Cas9 is a precise gene-editing tool adapted from a bacterial immune system. It consists of two key components: a guide RNA and the Cas9 protein.

**Mechanism:**
1. **Guide RNA:** Engineered to match a 20bp target sequence in human DNA
2. **Cas9 protein:** Acts as the "scissors"; binds to the guide and cuts DNA at the target site
3. **Repair:** The cell's natural repair machinery (NHEJ or HDR) either deletes the cut section or inserts a corrected sequence

\`\`\`
Target DNA:  ...ATCGATCGTAGCTAGCTAGC...
Guide RNA:      ↓ matches this spot
Cas9 cuts:   ...ATC---------TAGC...
Repair:      ...ATCGATCGTAG-CTAGC... (deletion)
             or
             ...ATCGATCGTAGCTAGCTAGC... (corrected)
\`\`\`

**Advantages over earlier gene-editing tools (TALENS, zinc fingers):**
- **Simpler:** Requires only RNA design, not protein engineering
- **Faster:** 1-2 weeks to design vs. months for earlier methods
- **Cheaper:** ~$60 per experiment vs. $10,000+
- **Effective:** >90% editing efficiency in some cell types

**Current clinical applications:**
- **Leber congenital amaurosis 10:** First CRISPR gene therapy approved (2024). Treats inherited blindness by editing a mutation in the *CEP290* gene.
- **Sickle cell anemia:** Trials editing the *HBB* gene directly; also using CRISPR to reactivate fetal hemoglobin genes.
- **In vivo editing:** Injecting CRISPR directly into patients (liver, muscle, eye) rather than editing cells outside the body.

**Limitations and tradeoffs:**
- **Off-target cuts:** Cas9 may cut at similar sequences elsewhere in the genome (~1-10% off-target rate), potentially causing mutations
- **Delivery challenge:** Getting CRISPR into the right cells is hard; currently works best for blood and eye cells
- **Ethical constraints:** Germ-line editing (heritable changes) remains prohibited or heavily restricted in most countries

Further detail → Reducing off-target effects: newer Cas9 variants (high-fidelity Cas9, paired nickases) have lower off-target rates. Scientists also use bioinformatic tools to choose guide RNAs with minimal predicted off-targets.
`;

export const CRISPR_ADVANCED = `
## CRISPR: Engineering, Mechanistic Constraints, and Emerging Alternatives

CRISPR-Cas9 is a Type II CRISPR-Cas system, evolutionary origin traced to *Streptococcus pyogenes* bacteriophage defense. While revolutionary, mechanistic and delivery constraints have spawned multiple second-generation technologies.

**Engineering constraints and solutions:**

1. **PAM (Protospacer Adjacent Motif) limitation:**
   - SpCas9 requires NGG PAM (only ~25% of genomic sites targetable)
   - Solutions: Cas9 orthologs (SaCas9: NNG PAM), SpRY variant (NGN PAM), PE systems
   - Trade-off: Expanded targeting vs. reduced activity/specificity

2. **Off-target kinetics:**
   - DNA binding is relatively nonspecific; specificity arises from PAM and partial Watson-Crick pairing
   - Off-target rate correlates with guide RNA free energy (ΔG) of target binding
   - Mitigation: Machine learning models (Cas-OFFinder, CUTTING-EDGE) predict off-targets; paired nickases (dual guides, both required for cut) reduce off-target frequency to <0.1%
   - Cost: Nickase approach requires 2 guides and lower cutting efficiency

3. **Delivery mechanism:**
   - AAV vectors (max ~4.7kb payload) cannot fit full SpCas9 (4.2kb) + promoter + guide
   - Compact ortholog Cas9 variants (NmCas9: 3.2kb) enable AAV delivery but have lower activity
   - Dual-AAV approaches (split intein complementation) increase complexity and efficiency loss
   - Alternative: Lipid nanoparticles (LNPs) for mRNA Cas9 delivery; drawback: transient expression

4. **DNA repair pathway bias:**
   - NHEJ (nonhomologous end joining) predominates; stochastic and error-prone
   - HDR (homology-directed repair) efficient but cell-cycle dependent; low in non-dividing cells
   - Integration of silent mutations (PAM-disrupting SNPs) in 20% of edits limits homozygosity
   - Emerging: RT-free prime editing uses RNA:DNA hybrids for precise insertions without double-strand breaks

**Mechanistic precision and multi-edit challenges:**

For multiplex editing (simultaneous edits at 3+ loci), efficacy drops multiplicatively. With ~85% efficiency per locus, triple edits achieve only ~61% success. Competing Cas9 binding and NHEJ error accumulation are rate-limiting.

**Emerging alternatives:**
- **Prime editing (PE):** Pegasus-Cas9 (Cas-derived nickase) fused to RT; reverse-transcribes 3' PBS-target-PBS structure into genomic DNA. Advantages: no DSBs, fewer off-targets, insertions/deletions possible. Drawback: ~20-30% efficiency currently.
- **Base editing (BE):** Cytidine/adenosine deaminases fused to Cas-DNA. Edits single nucleotides without DSB. Success rates 50-80% depending on context; off-target deamination still a concern.
- **Twin CRISPR (multiplex):** Stacked CRISPR arrays; addresses edit efficiency but requires complex design.

**Regulatory landscape:**
- Somatic therapies: FDA approval pathway established (*Casgevy* for sickle cell approved 12/2023)
- Germ-line editing: Moratorium in most jurisdictions post-He Jiankui scandal (2018); recent consensus: conditional approval for severe monogenic diseases only, with strict oversight
- Off-label germline editing: regulatory gap in some low-income countries; ethical risk

**Clinical development status:**
- Phase 2/3 trials: SCD/β-thalassemia, hemophilia, *Leber congenital amaurosis 10*
- Phase 1: In vivo editing for transthyretin amyloidosis (ATTR)
- 5-10 year outlook: In vivo therapies for accessible tissues; multiplex editing via improved delivery

WHY THIS MATTERS: CRISPR's initial promise of "simple, cheap, programmable" genomic surgery has proven partially overstated. Off-target effects, delivery logistics, and repair pathway complexity mean clinical translation requires continued engineering iteration. Success depends on context: treating blood cells (transplantable, tolerant of low efficiency) is easier than fixing neurodegenerative disorders (in vivo, high precision required).
`;

// ============================================================================
// EXAMPLE 3: Business - Return on Investment (ROI) Modeling (Business Domain)
// ============================================================================

export const ROI_BEGINNER = `
## ROI Explained: Is This Investment Worth It?

ROI stands for "Return on Investment." It answers the question: **For every dollar I invest, how many dollars do I get back?**

**Simple formula:**
\`\`\`
ROI = (Profit / Investment) × 100%
\`\`\`

**Example:**
You invest $1,000 in a course to learn web design. After 3 months, you earn $3,000 from freelance projects.

\`\`\`
Profit = $3,000 - $1,000 = $2,000
ROI = ($2,000 / $1,000) × 100% = 200%
\`\`\`

You got back 200% of your money—a 2x return.

**Why it matters:** ROI helps you decide which projects, tools, or courses are worth your money. A 200% ROI is usually great; 10% is usually not worth the risk.
`;

export const ROI_INTERMEDIATE = `
## ROI: Calculation, Interpretation, and Practical Application

ROI measures the efficiency of an investment. The formula accounts for both profit and time.

**Core calculation:**
\`\`\`
ROI = (Net Profit / Total Investment) × 100%

Where:
- Net Profit = Revenue - All Costs (fixed, variable, opportunity)
- Total Investment = Capital + Sunk costs + Time cost (if material)
\`\`\`

**Example: SaaS marketing campaign**
- Investment: $10,000 (ad spend) + $5,000 (staff time: 100 hrs @ $50/hr) = $15,000
- Revenue generated: $40,000 (new customer lifetime value)
- Net profit: $40,000 - $15,000 = $25,000
- ROI: ($25,000 / $15,000) × 100% = 166.7%

**Interpretation:**
- ROI > 0%: You make money
- ROI > 50%: Generally considered good
- ROI > 100%: Excellent (you're doubling or better)
- ROI timing matters: 166% over 6 months is different than over 1 year (annualize: (166% / 0.5 years) = 332% annualized)

**Common pitfalls:**
1. **Ignoring sunk costs:** Costs already spent are irrelevant to ROI. Only future incremental costs matter.
2. **Excluding opportunity cost:** If $15,000 in the bank earns 5% risk-free interest, your hurdle rate is 5%, not 0%.
3. **Time horizon mismatch:** Comparing a 1-year ROI to a 5-year ROI without annualizing is misleading.
4. **Ignoring risk:** 100% ROI is amazing if you're 90% certain; terrible if you're 10% certain.

**Further detail →** Annualized ROI (ARR) and payback period: ARR scales ROI to a 1-year basis for fair comparison across projects. Payback period (months to break even) is a risk metric; shorter is safer for uncertain ventures.

**Business rules of thumb:**
- Consumer/ecommerce: 100%+ ROI is acceptable norm; <50% is risky
- SaaS: CAC payback < 12 months is good; < 6 months is excellent
- Real estate: 5-15% annually is standard; >20% is exceptional
`;

export const ROI_ADVANCED = `
## ROI Modeling: Uncertainty, Sensitivity, and Portfolio Optimization

ROI modeling for strategic capital allocation requires integrating probabilistic outcomes, discount rates, and correlation structures across competing projects.

**Advanced framework:**

\`\`\`
Expected ROI = Σ(Probability_i × ROI_i) for all scenarios i

Example: Product launch
- Optimistic (30% prob): $100k revenue, $20k cost → ROI = 400%
- Base case (50% prob): $50k revenue, $20k cost → ROI = 150%
- Pessimistic (20% prob): $10k revenue, $20k cost → ROI = -50% (loss)

Expected ROI = (0.3 × 400%) + (0.5 × 150%) + (0.2 × -50%) = 120% + 75% - 10% = 185%
\`\`\`

But expected value masks variance. Standard deviation of ROI (risk) matters:

\`\`\`
Variance = Σ(Prob_i × (ROI_i - Expected_ROI)²)
Risk (σ) = sqrt(Variance)
\`\`\`

High variance (130%) + lower expected ROI (185%) may be riskier than lower variance (50%) + equal ROI (185%).

**Net Present Value (NPV) vs. ROI:**

ROI ignores discount rates; NPV doesn't. For multi-year projects, NPV is more rigorous:

\`\`\`
NPV = Σ(CF_t / (1 + r)^t) - Initial_Investment

Where:
- CF_t = Cash flow at time t
- r = Discount rate (cost of capital, typically 8-15%)
- t = Year
\`\`\`

**Example: 3-year product development:**
- Y0: -$500k (R&D)
- Y1: $200k (ramp-up)
- Y2: $400k (peak)
- Y3: $300k (decline)
- Discount rate: 10%

\`\`\`
NPV = -500k + (200k/1.1) + (400k/1.21) + (300k/1.331)
    = -500k + 181.8k + 330.6k + 225.3k = $237.7k
\`\`\`

NPV > 0: Project is value-accretive. But this doesn't tell you ROI. Internal Rate of Return (IRR) solves the discount rate that makes NPV = 0:

\`\`\`
For the above, IRR ≈ 18% (solving numerically)
\`\`\`

If your cost of capital is 10% and IRR is 18%, the project clears your hurdle rate.

**Sensitivity analysis and real options:**

Parametric sensitivity: How much can key assumptions change before project fails?

\`\`\`
- If revenue drops 20%, does NPV stay positive?
- If costs rise 30%, what happens?
- At what discount rate does NPV = 0?
\`\`\`

Real options thinking: Some projects have strategic optionality (flexibility). A $1M R&D investment might unlock $10M in future opportunities (option value). Traditional ROI doesn't capture this. Real options theory assigns value to flexibility and learning.

**Portfolio optimization:**

For competing projects with constrained capital (e.g., $5M budget, 10 projects), you can't simply fund those with highest ROI. Constraints and correlations matter:

- Correlation: If projects A and B both depend on same market (correlated risk), funding both is riskier than if independent
- Constraint: Can only fund projects with total cost ≤ $5M
- Objective: Maximize expected NPV for the portfolio while managing volatility (Sharpe ratio or similar)

This requires quadratic programming or Monte Carlo simulation.

**ADVANCED: Scenario modeling and Monte Carlo:**

Instead of point estimates, model distributions for key drivers (market size, churn, CAC). Monte Carlo simulation runs 10,000 trials; each trial samples from distributions:

\`\`\`
For each trial i in 1..10000:
  Sample: market_size ~ Normal(μ=50k, σ=10k)
  Sample: retention ~ Beta(α=7, β=2) [0-100%]
  Sample: CAC ~ LogNormal(μ_log=4, σ_log=0.5)
  Compute: ROI_i = f(market_size, retention, CAC, ...)
  
Aggregate: Output distribution of ROI → percentiles, tail risk
\`\`\`

Results: "25th percentile ROI: 80%, 50th (median): 150%, 75th: 220%, 99th: 500%" tells stakeholders the downside and upside range.

WHY THIS MATTERS: Naive ROI calculations lead to suboptimal capital allocation. High-ROI projects with high variance can bankrupt companies. Enterprise-scale decisions require probabilistic modeling, NPV/IRR frameworks, and portfolio optimization to balance return, risk, and strategic optionality.
`;
