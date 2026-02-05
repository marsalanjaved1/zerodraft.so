# Product Roadmap 2024

## Vision
Become the go-to AI-powered writing workspace for professional teams.

## Annual OKRs

### O1: Establish Product-Market Fit
- **KR1**: Achieve 1,000 paying customers
- **KR2**: Reach $50K MRR
- **KR3**: NPS > 50

### O2: Build Best-in-Class AI Features
- **KR1**: <100ms AI response time (P50)
- **KR2**: 90% user satisfaction with AI suggestions
- **KR3**: 3x more AI features than nearest competitor

### O3: Enable Team Collaboration
- **KR1**: 30% of users collaborate on documents
- **KR2**: Average 3 users per organization
- **KR3**: Support 50+ concurrent editors

---

## Q1: Foundation (Jan-Mar) ✅

### Smart Drafting MVP
- [x] AI autocomplete
- [x] Outline generation
- [x] Tone selector
- [x] Context window optimization

### Core Platform
- [x] Supabase migration
- [x] Authentication flow
- [x] Basic file management

**Status**: SHIPPED

---

## Q2: Collaboration (Apr-Jun) — CURRENT

### Real-time Editing
- [ ] Yjs integration
- [ ] Presence indicators
- [ ] Conflict resolution
- [ ] Cursor sharing

### Comments & Reviews
- [ ] Inline comments
- [ ] @mentions
- [ ] Resolve/unresolve
- [ ] Comment threads

### Permissions
- [ ] Role-based access (Owner/Editor/Viewer)
- [ ] Share via link
- [ ] Team workspaces

**Target Launch**: June 15

---

## Q3: Intelligence (Jul-Sep)

### Research Assistant
- [ ] One-click citations
- [ ] Fact-checking with confidence scores
- [ ] Source preview cards
- [ ] Related document suggestions

### Advanced AI
- [ ] Custom AI instructions per project
- [ ] Style matching from samples
- [ ] Multi-language support
- [ ] Writing statistics

### Mobile
- [ ] iOS app (read + light editing)
- [ ] Push notifications
- [ ] Offline sync

---

## Q4: Scale (Oct-Dec)

### Enterprise
- [ ] SSO (SAML/OIDC)
- [ ] Admin dashboard
- [ ] Usage analytics
- [ ] Audit logs

### Templates & Marketplace
- [ ] Template gallery
- [ ] Community templates
- [ ] Template builder
- [ ] Prompt library

### Integrations
- [ ] Slack
- [ ] Notion import
- [ ] Google Drive sync
- [ ] API v1

---

## Resource Allocation

| Quarter | Engineering | Design | Growth |
|---------|-------------|--------|--------|
| Q1 | 4 FTE | 1 FTE | 0.5 FTE |
| Q2 | 5 FTE | 2 FTE | 1 FTE |
| Q3 | 6 FTE | 2 FTE | 2 FTE |
| Q4 | 8 FTE | 3 FTE | 3 FTE |

---

## Dependencies & Risks

### External Dependencies
1. **OpenRouter API stability** — Backup with Anthropic direct
2. **Supabase scale limits** — Plan for dedicated instance in Q3
3. **App Store approval** — Start process in June for Q3 launch

### Key Risks
1. **Competition from Notion AI** — Differentiate on trust/citations
2. **AI costs scaling** — Implement smart caching
3. **Team growth** — Hiring plan in place

---

## Success Metrics by Quarter

| Metric | Q1 | Q2 | Q3 | Q4 |
|--------|-----|-----|-----|-----|
| Users | 500 | 2,000 | 5,000 | 15,000 |
| MRR | $5K | $20K | $50K | $150K |
| NPS | 40 | 45 | 50 | 55 |
| DAU/MAU | 30% | 35% | 40% | 45% |
