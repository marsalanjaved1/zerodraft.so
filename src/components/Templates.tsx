'use client';

import { useState } from 'react';
import {
    FileText,
    Sparkles,
    List,
    Table2,
    PenLine,
    Lightbulb,
    FolderKanban,
    Plus
} from 'lucide-react';

export interface Template {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    content: string;
    category: 'prd' | 'spec' | 'notes' | 'other';
}

// Default templates for product managers
export const defaultTemplates: Template[] = [
    {
        id: 'prd',
        title: 'Product Requirements',
        description: 'Standard PRD template with sections for goals, features, and success metrics',
        icon: <Sparkles className="w-5 h-5" />,
        category: 'prd',
        content: `# [Product Name] - Product Requirements Document

## Overview
Brief description of the product/feature and its purpose.

## Problem Statement
What problem are we solving? Who has this problem?

## Goals & Success Metrics
| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| | | | |

## User Stories
- As a [user type], I want to [action] so that [benefit]

## Functional Requirements
### Must Have
- [ ] 

### Should Have
- [ ] 

### Nice to Have
- [ ] 

## Non-Functional Requirements
- Performance: 
- Security: 
- Scalability: 

## Design Considerations
Link to designs, wireframes, or mockups.

## Technical Approach
High-level technical approach and dependencies.

## Timeline
| Phase | Deliverables | Date |
|-------|--------------|------|
| | | |

## Open Questions
- [ ] 

## Appendix
Additional context, research, competitive analysis, etc.
`
    },
    {
        id: 'spec',
        title: 'Technical Spec',
        description: 'Engineering specification with architecture and implementation details',
        icon: <FolderKanban className="w-5 h-5" />,
        category: 'spec',
        content: `# [Feature Name] - Technical Specification

## Summary
One paragraph summary of what we're building.

## Background
Why are we building this? Link to PRD if applicable.

## Goals
- Primary: 
- Secondary: 

## Non-Goals
What we're explicitly not doing in this iteration.

## Architecture

### System Design
\`\`\`
[Diagram or description]
\`\`\`

### Data Model
| Field | Type | Description |
|-------|------|-------------|
| | | |

### API Design
\`\`\`typescript
// Endpoint definitions
\`\`\`

## Implementation Plan

### Phase 1: [Name]
- [ ] Task 1
- [ ] Task 2

### Phase 2: [Name]
- [ ] Task 1

## Testing Strategy
- Unit tests: 
- Integration tests: 
- E2E tests: 

## Rollout Plan
- [ ] Feature flag setup
- [ ] Staged rollout percentage
- [ ] Monitoring dashboard

## Security Considerations

## Performance Considerations

## Alternatives Considered
What other approaches did we consider and why did we reject them?

## Open Questions
- [ ] 
`
    },
    {
        id: 'meeting-notes',
        title: 'Meeting Notes',
        description: 'Structured template for capturing meeting discussions and action items',
        icon: <PenLine className="w-5 h-5" />,
        category: 'notes',
        content: `# Meeting Notes - [Date]

## Meeting Info
- **Date**: 
- **Time**: 
- **Attendees**: 

## Agenda
1. 
2. 
3. 

## Discussion Notes

### Topic 1
Key points discussed...

### Topic 2
Key points discussed...

## Decisions Made
- Decision 1
- Decision 2

## Action Items
| Owner | Action | Due Date |
|-------|--------|----------|
| | | |

## Next Steps
- 

## Next Meeting
- Date: 
- Topics to cover: 
`
    },
    {
        id: 'user-research',
        title: 'User Research',
        description: 'Template for documenting user interviews and research findings',
        icon: <Lightbulb className="w-5 h-5" />,
        category: 'other',
        content: `# User Research: [Topic]

## Research Objectives
What questions are we trying to answer?
1. 
2. 

## Methodology
- Type: [Interview / Survey / Usability Test]
- Participants: [N] users
- Duration: 
- Date range: 

## Participant Profiles
| ID | Role | Experience | Key Characteristics |
|----|------|------------|---------------------|
| P1 | | | |

## Key Findings

### Finding 1: [Title]
**Frequency**: X of Y participants
**Evidence**: Quote or observation

### Finding 2: [Title]
**Frequency**: X of Y participants
**Evidence**: Quote or observation

## Themes & Patterns
1. **Theme**: Description
2. **Theme**: Description

## Recommendations
- Recommendation 1
- Recommendation 2

## Raw Notes
### Participant 1
- 

### Participant 2
- 

## Appendix
- Interview script
- Survey questions
- Artifacts collected
`
    },
    {
        id: 'blank',
        title: 'Blank Document',
        description: 'Start with a clean slate',
        icon: <FileText className="w-5 h-5" />,
        category: 'other',
        content: `# Untitled

Start writing here...
`
    },
];

// ============ Templates Gallery ============
interface TemplatesGalleryProps {
    templates?: Template[];
    onSelect: (template: Template) => void;
    onCreateCustom?: () => void;
}

export function TemplatesGallery({
    templates = defaultTemplates,
    onSelect,
    onCreateCustom
}: TemplatesGalleryProps) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const categories = [
        { id: null, label: 'All' },
        { id: 'prd', label: 'PRD' },
        { id: 'spec', label: 'Specs' },
        { id: 'notes', label: 'Notes' },
        { id: 'other', label: 'Other' },
    ];

    const filteredTemplates = selectedCategory
        ? templates.filter(t => t.category === selectedCategory)
        : templates;

    return (
        <div className="p-4">
            {/* Category Tabs */}
            <div className="flex gap-1 mb-4 border-b border-[#3c3c3c] pb-2">
                {categories.map(cat => (
                    <button
                        key={cat.id ?? 'all'}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-1 text-xs rounded-t transition-colors ${selectedCategory === cat.id
                                ? 'bg-[#3c3c3c] text-[#cccccc]'
                                : 'text-[#858585] hover:text-[#cccccc]'
                            }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredTemplates.map(template => (
                    <button
                        key={template.id}
                        onClick={() => onSelect(template)}
                        className="p-4 bg-[#252526] border border-[#3c3c3c] rounded-lg hover:border-[#007acc] transition-all text-left group"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-[#1e1e1e] rounded-md text-[#007acc] group-hover:text-[#1a85dc]">
                                {template.icon}
                            </div>
                        </div>
                        <h3 className="text-sm font-medium text-[#cccccc] mb-1">{template.title}</h3>
                        <p className="text-xs text-[#858585] line-clamp-2">{template.description}</p>
                    </button>
                ))}

                {/* Create Custom Template */}
                {onCreateCustom && (
                    <button
                        onClick={onCreateCustom}
                        className="p-4 border border-dashed border-[#3c3c3c] rounded-lg hover:border-[#007acc] transition-all text-left flex flex-col items-center justify-center min-h-[120px]"
                    >
                        <Plus className="w-6 h-6 text-[#858585] mb-2" />
                        <span className="text-xs text-[#858585]">Create Template</span>
                    </button>
                )}
            </div>
        </div>
    );
}

// ============ Template Preview Dialog ============
interface TemplatePreviewProps {
    template: Template | null;
    isOpen: boolean;
    onClose: () => void;
    onCreate: (template: Template) => void;
}

export function TemplatePreview({ template, isOpen, onClose, onCreate }: TemplatePreviewProps) {
    if (!isOpen || !template) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c3c]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#1e1e1e] rounded-md text-[#007acc]">
                            {template.icon}
                        </div>
                        <div>
                            <h2 className="text-[#cccccc] font-medium">{template.title}</h2>
                            <p className="text-xs text-[#858585]">{template.description}</p>
                        </div>
                    </div>
                </div>

                {/* Preview */}
                <div className="flex-1 overflow-y-auto p-4">
                    <pre className="text-xs text-[#cccccc] whitespace-pre-wrap font-mono bg-[#1e1e1e] p-4 rounded-lg">
                        {template.content}
                    </pre>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#3c3c3c]">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs text-[#cccccc] hover:bg-[#3c3c3c] rounded"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onCreate(template)}
                        className="px-4 py-1.5 text-xs bg-[#007acc] hover:bg-[#1a85dc] text-white rounded"
                    >
                        Create Document
                    </button>
                </div>
            </div>
        </div>
    );
}
