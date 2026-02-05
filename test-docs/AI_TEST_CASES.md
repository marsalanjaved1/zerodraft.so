# zerodraft.so — AI Agent Test Cases

## Purpose
These test cases demonstrate the **unique value** of zerodraft: AI that understands your entire workspace and can synthesize across documents. This is what Notion AI and ChatGPT CANNOT do.

---

## 🔥 LEVEL 1: Cross-Document Synthesis
*These prove the AI's ability to connect dots across multiple files.*

### Test 1.1: PRD + User Research Alignment Check
```
Read PRD.md and UserResearch.md. Identify any misalignments between:
1. Features we're building vs. what users actually asked for
2. Personas in research vs. target users in PRD
3. Pricing assumptions vs. willingness-to-pay data

Format as a table with: Issue | PRD Says | Research Says | Recommendation
```

**Expected Result:** AI reads both files, finds the gap where PRD targets $25/month but research shows freelancers churn at that price.

---

### Test 1.2: Tech Spec + PRD Gap Analysis
```
Compare TechSpec.md with PRD.md. Find:
1. Features in PRD that have no technical specification
2. Technical work in the spec that doesn't map to a PRD feature
3. Timeline conflicts between product and engineering estimates

Create a "Spec Gaps" document listing what's missing.
```

**Expected Result:** AI identifies that "Research Integration" is in PRD but has minimal tech spec details.

---

### Test 1.3: Generate Executive Summary from All Docs
```
Read all files in this workspace. Generate a 1-page executive summary for the CEO covering:
1. What we're building (from PRD)
2. How we're building it (from TechSpec)
3. Why users want it (from UserResearch)
4. Current sprint progress (from SprintBacklog)
5. What customers are saying (from CustomerFeedback)
6. Where we're heading (from Roadmap)

Make it scannable. Use bullets. Max 500 words.
```

---

## 🔥 LEVEL 2: Strategic Analysis
*These prove PM-level thinking, not just summarization.*

### Test 2.1: Feature Prioritization Matrix
```
Read CustomerFeedback.md, UserResearch.md, and Roadmap.md.

Create a prioritization matrix for features NOT yet on the roadmap:
- Score each by: User Demand (1-5), Strategic Fit (1-5), Effort (1-5)
- Calculate priority score: (Demand + Fit) / Effort
- Rank top 5 with justification from the source docs

Format as markdown table.
```

---

### Test 2.2: Risk Assessment
```
Analyze PRD.md, TechSpec.md, and SprintBacklog.md for risks.

For each risk, provide:
1. Risk description
2. Source document and specific quote
3. Likelihood (High/Medium/Low)
4. Impact (High/Medium/Low)
4. Mitigation recommendation

Find at least 5 risks across product, technical, and execution categories.
```

---

### Test 2.3: Competitive Positioning
```
Read UserResearch.md (competitive analysis section) and PRD.md.

Create a "Why We Win" document that:
1. Lists our 3 strongest differentiators vs. Notion AI
2. Identifies our 2 biggest gaps vs. competitors
3. Suggests messaging for each differentiator
4. Recommends which gap to close first and why
```

---

## 🔥 LEVEL 3: Document Generation from Synthesis
*These prove the AI can CREATE high-quality new docs from existing context.*

### Test 3.1: User Stories from PRD
```
Read PRD.md and TechSpec.md.

Generate 10 user stories for "Smart Drafting" in the format:
As a [persona from PRD], I want [feature from tech spec], so that [value prop].

Include acceptance criteria for each story.
Reference specific quotes from both documents to justify each story.
Save to a new file called UserStories.md.
```

---

### Test 3.2: Sprint Planning Recommendation
```
Read Roadmap.md, SprintBacklog.md, and CustomerFeedback.md.

Based on:
- Current sprint velocity (from backlog)
- Q2 goals (from roadmap)
- Customer urgency signals (from feedback)

Recommend what to include in the next sprint. Justify each item with specific references.

Create SprintPlanningNext.md with your recommendations.
```

---

### Test 3.3: Product Update Email
```
Read all workspace files.

Draft a product update email to send to beta users covering:
1. What shipped this sprint (from SprintBacklog - Done items)
2. What's coming next (from Roadmap - Q2)
3. How we're responding to their feedback (from CustomerFeedback)

Tone: Friendly, transparent, exciting but not overhyped.
Length: 300 words max.
```

---

### Test 3.4: Investor Update
```
Read all workspace files.

Create a monthly investor update with:
1. Key metrics (pull from Roadmap success metrics)
2. Product progress (from SprintBacklog)
3. Customer validation (from UserResearch + CustomerFeedback)
4. Technical milestones (from TechSpec)
5. Risks and mitigations
6. Upcoming priorities

Format professionally. Save to InvestorUpdate.md.
```

---

## 🔥 LEVEL 4: Decision Support
*These prove the AI can help PMs make better decisions.*

### Test 4.1: Build vs. Buy Analysis
```
Read TechSpec.md.

For the "Real-time Editing" feature requiring Yjs integration:
1. Estimate build effort based on spec complexity
2. Research alternatives (suggest 3 options)
3. Create build vs. buy comparison table
4. Make a recommendation with reasoning
```

---

### Test 4.2: Feature Scoping
```
Read PRD.md and TechSpec.md.

The "Research Integration" feature is too big for one quarter.
1. Break it into 3 shippable phases
2. Define MVP for each phase
3. Identify dependencies between phases
4. Estimate relative effort (S/M/L)
5. Recommend which phase to ship first

Save to ResearchIntegrationScoping.md.
```

---

### Test 4.3: Pricing Recommendation
```
Read UserResearch.md, CustomerFeedback.md, and PRD.md.

We're considering pricing changes. Analyze:
1. Current pricing pain points (from feedback/research)
2. Willingness-to-pay by persona
3. Competitor pricing (from research)
4. Churn risk at current price

Recommend a pricing structure with:
- Tier names and prices
- Features per tier
- Expected impact on MRR and churn

Save to PricingRecommendation.md.
```

---

## 🔥 LEVEL 5: The Ultimate Test
*If the AI can do this, zerodraft is 10x better than alternatives.*

### Test 5.1: Full Product Audit
```
Read every file in this workspace.

Conduct a full product health audit:

1. STRATEGY ALIGNMENT
   - Is the roadmap aligned with user research?
   - Are we building what customers actually want?

2. EXECUTION HEALTH
   - Is the sprint on track?
   - Are there blocking risks?

3. TECHNICAL COHERENCE
   - Does the tech spec support all PRD features?
   - Are there architectural concerns?

4. CUSTOMER PULSE
   - What are the top 3 customer concerns?
   - Are we addressing them in upcoming work?

5. RECOMMENDATIONS
   - Top 3 things to keep doing
   - Top 3 things to change
   - One hard decision we're avoiding

Be brutally honest. Reference specific quotes from each document.
Save to ProductAudit.md.
```

---

## How to Run These Tests

1. Ensure all test docs are in the workspace
2. Open any document (AI has workspace context)
3. Paste a test prompt into the Copilot chat
4. The AI should:
   - Automatically read needed files (using tools)
   - Synthesize information across documents
   - Generate actionable output
   - Optionally save new documents

## Success Criteria

✅ AI reads multiple files without being told exact paths
✅ AI connects information across documents
✅ Output references specific quotes/data from sources
✅ Generated documents are production-quality
✅ Recommendations are non-obvious (not just summaries)

---

*These test cases prove zerodraft's unique value: an AI co-pilot that truly understands your entire product context.*
