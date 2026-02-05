# Sprint Backlog: Q1 Sprint 3

## Sprint Goal
Deliver Smart Drafting MVP with core autocomplete and outline features.

## Sprint Metrics
- **Velocity**: 42 story points (average from last 3 sprints)
- **Capacity**: 38 points (2 devs on PTO)
- **Committed**: 36 points

---

## Committed Work

### EPIC: Smart Drafting

#### STORY-101: AI Autocomplete Integration
**Points**: 8 | **Assignee**: @mike | **Status**: In Progress

**Description**: 
Integrate Claude API for real-time autocomplete suggestions as users type.

**Acceptance Criteria**:
- [ ] Suggestions appear within 200ms of pause
- [ ] User can accept with Tab, dismiss with Esc
- [ ] Suggestions respect document context (last 2000 tokens)
- [ ] Graceful fallback when API is unavailable

**Technical Notes**:
- Use streaming for faster perceived performance
- Implement request debouncing (300ms)
- Cache common completions locally

---

#### STORY-102: Outline Generation
**Points**: 5 | **Assignee**: @sarah | **Status**: To Do

**Description**:
Allow users to generate document outlines from a topic or brief description.

**Acceptance Criteria**:
- [ ] "Generate Outline" button in toolbar
- [ ] Modal for entering topic/description
- [ ] AI generates 5-7 section headers with bullets
- [ ] User can edit before inserting

---

#### STORY-103: Tone Selector
**Points**: 3 | **Assignee**: @mike | **Status**: To Do

**Description**:
Dropdown to select writing tone (Professional, Casual, Academic, Creative).

**Acceptance Criteria**:
- [ ] Tone persists per document
- [ ] Tone is passed to AI for all suggestions
- [ ] Default tone can be set in user preferences

---

#### STORY-104: Context Window Management
**Points**: 8 | **Assignee**: @alex | **Status**: In Review

**Description**:
Implement smart context windowing to maximize AI quality within token limits.

**Acceptance Criteria**:
- [ ] Prioritize nearby content (cursor position ± 500 words)
- [ ] Include document title and headers for context
- [ ] Compress older content with summarization
- [ ] Stay within 4000 token limit per request

---

#### STORY-105: Keyboard Shortcuts
**Points**: 3 | **Assignee**: @jessica | **Status**: Done

**Description**:
Add keyboard shortcuts for AI features.

**Shortcuts**:
- `Cmd+J`: Trigger autocomplete manually
- `Cmd+Shift+O`: Generate outline
- `Cmd+Shift+R`: Rewrite selection

---

### EPIC: Infrastructure

#### STORY-110: Rate Limiting
**Points**: 5 | **Assignee**: @alex | **Status**: To Do

**Description**:
Implement rate limiting to prevent API abuse and manage costs.

**Requirements**:
- 100 AI requests per user per hour
- 1000 requests per organization per hour
- Graceful error messages when limit reached

---

#### STORY-111: Error Tracking
**Points**: 4 | **Assignee**: @sarah | **Status**: In Progress

**Description**:
Set up Sentry for frontend and backend error tracking.

**Requirements**:
- Source maps for production debugging
- User context attached to errors
- Slack alerts for critical errors

---

## Stretch Goals (If Capacity)

#### STORY-120: Writing Statistics
**Points**: 3 | **Assignee**: Unassigned

Show word count, reading time, and grade level in status bar.

---

## Risks & Blockers

1. **API Latency** (Medium)
   - Claude API occasionally spikes to 2s+ response times
   - Mitigation: Implement timeout and fallback messaging

2. **PTO Coverage** (Low)
   - Mike out Mon-Wed
   - Mitigation: Alex picked up STORY-104

3. **Design Dependency** (Medium)
   - Outline modal designs not finalized
   - Mitigation: Sarah to use placeholder, iterate post-sprint

---

## Ceremonies

| Ceremony | Date | Time |
|----------|------|------|
| Sprint Planning | Mon 1/15 | 10:00 AM |
| Daily Standup | Daily | 9:30 AM |
| Backlog Refinement | Wed 1/17 | 2:00 PM |
| Sprint Review | Fri 1/26 | 3:00 PM |
| Retrospective | Fri 1/26 | 4:00 PM |
