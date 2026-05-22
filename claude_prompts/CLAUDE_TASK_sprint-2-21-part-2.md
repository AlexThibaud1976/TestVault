# CLAUDE_TASK : Sprint 2.21 part 2 - Drawer revision + Gherkin native

Repo : E:\Code\TestVault
Branche : feature/sprint-2-21-part-2-drawer-gherkin
Cible : version 0.5.29 (Marketplace + npm)
Estimation : 7-9 heures pour Claude Code (ambitieux)

---

## 0. CONTEXTE ET OBJECTIF

### 0.1 Etat avant ce sprint

Sprint 2.21 partie 1 (vendredi 2026-05-22) a livre :
- LLM provider architecture (interface ILlmProvider + factory)
- AzureOpenAIProvider implementation
- Settings UI : section "AI Configuration" avec storage encrypted
- AiGenerateModal : modal 2 etapes (select source + review suggestions)
- WorkItemPicker : selection User Story / Bug / Requirement
- AiSuggestionCard : card avec basic edit inline
- Creation Test Cases + linking automatique a source US

USP "AI-First" est livre mais l'edit suggestions est BASIC (inline rapide).

### 0.2 Objectif Sprint 2.21 part 2

Deux features complementaires :

A. REVISION ENRICHIE (CHECKPOINT A) :
   - Upgrade edit suggestion de "basic inline" vers "Drawer pattern"
   - Pattern reutilisable pour Sprint 2.25 Drawer detail view
   - Espace ergonomique pour edit complet
   - Pattern extensible pour features futures (Sprint 4.x revision avancee)

B. GHERKIN NATIF (CHECKPOINT B) :
   - Editor BDD Given/When/Then dans TestCaseFormView
   - Syntax highlighting
   - Conversion bidirectionnelle steps <-> Gherkin
   - Validation Gherkin syntax
   - USP "BDD Native" delivered

### 0.3 Vision long terme (a documenter)

```
PHASE 4 (post-launch, 2027) :
- Sprint 4.x : Revision Drawer enrichie advanced
  * Bulk operations (edit multiple at once)
  * Compare with original LLM output (diff view)
  * History of edits per suggestion
  * Re-prompt this specific field
  * Approval workflow (review/approve/reject)

Cette base Drawer Sprint 2.21 part 2 = fondation pour ces features.
```

### 0.4 Constraints CRITIQUES

```
- TESTVAULT_SCHEMA referenceName : IMMUTABLE
- argos-wit-schema : pas de modification
- WitResolver : utilisation obligatoire
- ASCII strict (sauf prompts LLM internes en anglais natural)
- Pas de regression Sprint 2.18-2.21 part 1
- Design system exclusif (tokens.css + composants base)
- Pattern Drawer = reutilisable Sprint 2.25+
- Gherkin = valide W3C Gherkin syntax
- WitResolver pattern enforce (lecon Sprint 2.19.1)
```

---

## 1. PERIMETRE TECHNIQUE

### 1.1 Fichiers crees / modifies

```
apps/argos-extension/src/hub/components/
  Drawer.tsx                            [NEW] (composant Drawer base reutilisable)
  Drawer.css                            [NEW] (styles slide-in animation)
  AiSuggestionEditDrawer.tsx            [NEW] (drawer content pour edit suggestion)
  AiSuggestionCard.tsx                  [MODIFIED] (trigger drawer au lieu inline)
  AiGenerateModal.tsx                   [MODIFIED] (host drawer)
  GherkinEditor.tsx                     [NEW] (editor Given/When/Then)
  GherkinSyntaxHighlight.tsx            [NEW] (syntax highlighting renderer)
  StepsEditor.tsx                       [MODIFIED] (toggle Steps / Gherkin view)

apps/argos-extension/src/hub/gherkin/
  gherkin-parser.ts                     [NEW] (parse Gherkin -> steps structure)
  gherkin-serializer.ts                 [NEW] (steps structure -> Gherkin text)
  gherkin-validator.ts                  [NEW] (validate Gherkin syntax)
  gherkin-keywords.ts                   [NEW] (Given/When/Then/And/But i18n ready)
  test-cases-from-gherkin.test.ts       [NEW] (tests parser + serializer)

apps/argos-extension/src/hub/hooks/
  use-drawer.ts                         [NEW] (hook open/close drawer state)

apps/argos-extension/src/hub/views/
  TestCaseFormView.tsx                  [MODIFIED] (StepsEditor avec Gherkin toggle)

tools/regression/
  T-2.21.2-drawer-component.test.ts     [NEW]
  T-2.21.2-ai-suggestion-edit-drawer.test.ts [NEW]
  T-2.21.2-gherkin-parser.test.ts       [NEW]
  T-2.21.2-gherkin-serializer.test.ts   [NEW]
  T-2.21.2-gherkin-bidirectional.test.ts [NEW]
  T-2.21.2-no-regression-suggestions.test.ts [NEW]
```

---

## 2. CHECKPOINT A : DRAWER REVISION (3-4h)

### 2.1 Composant Drawer reutilisable

```typescript
// components/Drawer.tsx

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    width?: "narrow" | "medium" | "wide";  // 320px / 480px / 640px
    side?: "left" | "right";                 // default right
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export function Drawer({ 
    isOpen, 
    onClose, 
    title, 
    width = "medium", 
    side = "right",
    children, 
    footer 
}: DrawerProps) {
    // Animation slide-in via CSS transform
    // Backdrop optional (click closes)
    // Escape key closes
    // Focus trap pour accessibility
    // ARIA role="dialog" aria-modal="true"
    
    return (
        <>
            {isOpen && <div className="drawer-backdrop" onClick={onClose} />}
            <aside 
                className={`drawer drawer--${side} drawer--${width} ${isOpen ? 'drawer--open' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="drawer-title"
            >
                <header className="drawer-header">
                    <h2 id="drawer-title">{title}</h2>
                    <button onClick={onClose} aria-label="Close drawer">x</button>
                </header>
                <div className="drawer-body">
                    {children}
                </div>
                {footer && (
                    <footer className="drawer-footer">
                        {footer}
                    </footer>
                )}
            </aside>
        </>
    );
}
```

```css
/* Drawer.css */
.drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 100;
}

.drawer {
    position: fixed;
    top: 0;
    height: 100vh;
    background: var(--surface-primary);
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
    transition: transform 0.25s ease-out;
    z-index: 101;
    display: flex;
    flex-direction: column;
}

.drawer--right { right: 0; transform: translateX(100%); }
.drawer--left { left: 0; transform: translateX(-100%); }
.drawer--open { transform: translateX(0); }

.drawer--narrow { width: 320px; }
.drawer--medium { width: 480px; }
.drawer--wide { width: 640px; }

.drawer-header {
    padding: var(--s-4);
    border-bottom: 1px solid var(--border-default);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--s-4);
}

.drawer-footer {
    padding: var(--s-4);
    border-top: 1px solid var(--border-default);
    display: flex;
    gap: var(--s-2);
    justify-content: flex-end;
}
```

### 2.2 Hook useDrawer

```typescript
// hooks/use-drawer.ts
export function useDrawer<T = unknown>() {
    const [isOpen, setIsOpen] = useState(false);
    const [data, setData] = useState<T | null>(null);
    
    const open = useCallback((dataItem: T) => {
        setData(dataItem);
        setIsOpen(true);
    }, []);
    
    const close = useCallback(() => {
        setIsOpen(false);
        // Reset data apres animation (250ms)
        setTimeout(() => setData(null), 300);
    }, []);
    
    return { isOpen, data, open, close };
}
```

### 2.3 AiSuggestionEditDrawer

```typescript
// components/AiSuggestionEditDrawer.tsx

interface AiSuggestionEditDrawerProps {
    suggestion: TestCaseSuggestion | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updated: TestCaseSuggestion) => void;
    onRegenerate: (suggestion: TestCaseSuggestion) => Promise<TestCaseSuggestion>;
}

export function AiSuggestionEditDrawer({ 
    suggestion, 
    isOpen, 
    onClose, 
    onSave, 
    onRegenerate 
}: AiSuggestionEditDrawerProps) {
    const [draft, setDraft] = useState<TestCaseSuggestion | null>(suggestion);
    const [isRegenerating, setIsRegenerating] = useState(false);
    
    // Reset draft quand suggestion change (open new)
    useEffect(() => {
        setDraft(suggestion);
    }, [suggestion]);
    
    if (!draft) return null;
    
    const handleRegenerate = async () => {
        setIsRegenerating(true);
        try {
            const regenerated = await onRegenerate(draft);
            setDraft(regenerated);
        } finally {
            setIsRegenerating(false);
        }
    };
    
    const handleStepChange = (index: number, field: 'action' | 'expected', value: string) => {
        setDraft(prev => ({
            ...prev!,
            steps: prev!.steps.map((s, i) => 
                i === index ? { ...s, [field]: value } : s
            )
        }));
    };
    
    const handleStepAdd = () => {
        setDraft(prev => ({
            ...prev!,
            steps: [...prev!.steps, { action: "", expected: "" }]
        }));
    };
    
    const handleStepRemove = (index: number) => {
        setDraft(prev => ({
            ...prev!,
            steps: prev!.steps.filter((_, i) => i !== index)
        }));
    };
    
    const handleStepReorder = (fromIndex: number, toIndex: number) => {
        setDraft(prev => {
            const newSteps = [...prev!.steps];
            const [moved] = newSteps.splice(fromIndex, 1);
            newSteps.splice(toIndex, 0, moved);
            return { ...prev!, steps: newSteps };
        });
    };
    
    const handleTagAdd = (tag: string) => {
        if (tag && !draft.tags.includes(tag)) {
            setDraft(prev => ({ ...prev!, tags: [...prev!.tags, tag] }));
        }
    };
    
    const handleTagRemove = (tag: string) => {
        setDraft(prev => ({ ...prev!, tags: prev!.tags.filter(t => t !== tag) }));
    };
    
    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title="Edit suggestion"
            width="medium"
            footer={
                <>
                    <Button variant="ghost" onClick={handleRegenerate} disabled={isRegenerating}>
                        {isRegenerating ? "Regenerating..." : "Regenerate"}
                    </Button>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={() => onSave(draft)}>Save</Button>
                </>
            }
        >
            <div className="suggestion-edit-form">
                <SectionField label="Title">
                    <Input
                        value={draft.title}
                        onChange={(e) => setDraft(prev => ({ ...prev!, title: e.target.value }))}
                    />
                </SectionField>
                
                <SectionField label="Priority">
                    <Select
                        value={draft.priority}
                        onChange={(v) => setDraft(prev => ({ ...prev!, priority: v as any }))}
                        options={[
                            { value: "P1", label: "P1 - Critical" },
                            { value: "P2", label: "P2 - High" },
                            { value: "P3", label: "P3 - Medium" },
                            { value: "P4", label: "P4 - Low" },
                        ]}
                    />
                </SectionField>
                
                <SectionField label="Coverage type">
                    <Select
                        value={draft.coverage_type}
                        onChange={(v) => setDraft(prev => ({ ...prev!, coverage_type: v as any }))}
                        options={[
                            { value: "happy_path", label: "Happy path" },
                            { value: "edge_case", label: "Edge case" },
                            { value: "error_case", label: "Error case" },
                            { value: "acceptance_criterion", label: "Acceptance criterion" },
                        ]}
                    />
                </SectionField>
                
                <SectionField label="Description">
                    <Textarea
                        value={draft.description}
                        onChange={(e) => setDraft(prev => ({ ...prev!, description: e.target.value }))}
                        rows={3}
                    />
                </SectionField>
                
                <SectionField label="Tags">
                    <TagsInput
                        tags={draft.tags}
                        onAdd={handleTagAdd}
                        onRemove={handleTagRemove}
                    />
                </SectionField>
                
                <SectionField label={`Steps (${draft.steps.length})`}>
                    <StepsListEditor
                        steps={draft.steps}
                        onChange={handleStepChange}
                        onAdd={handleStepAdd}
                        onRemove={handleStepRemove}
                        onReorder={handleStepReorder}
                    />
                </SectionField>
            </div>
        </Drawer>
    );
}
```

### 2.4 Integration dans AiGenerateModal

```typescript
// AiGenerateModal.tsx (modifie)

export function AiGenerateModal({ ... }) {
    const editDrawer = useDrawer<TestCaseSuggestion>();
    const [suggestions, setSuggestions] = useState<TestCaseSuggestion[]>([]);
    
    const handleEditSuggestion = (suggestion: TestCaseSuggestion) => {
        editDrawer.open(suggestion);
    };
    
    const handleSaveEdit = (updated: TestCaseSuggestion) => {
        setSuggestions(prev => 
            prev.map(s => s.id === updated.id ? updated : s)
        );
        editDrawer.close();
    };
    
    const handleRegenerateSingle = async (suggestion: TestCaseSuggestion) => {
        // Re-call LLM with same source US but request regeneration
        // Returns new suggestion
        return await aiGenerationService.regenerateSingle(suggestion);
    };
    
    return (
        <>
            <Modal>
                {/* Existing modal content : suggestion cards with [Edit] button */}
                {suggestions.map(s => (
                    <AiSuggestionCard 
                        key={s.id} 
                        suggestion={s} 
                        onEdit={() => handleEditSuggestion(s)} 
                    />
                ))}
            </Modal>
            
            <AiSuggestionEditDrawer
                suggestion={editDrawer.data}
                isOpen={editDrawer.isOpen}
                onClose={editDrawer.close}
                onSave={handleSaveEdit}
                onRegenerate={handleRegenerateSingle}
            />
        </>
    );
}
```

---

## 3. CHECKPOINT B : GHERKIN NATIVE (4-5h)

### 3.1 Modele Gherkin

```typescript
// gherkin/gherkin-keywords.ts

export const GHERKIN_KEYWORDS = {
    en: {
        feature: "Feature",
        scenario: "Scenario",
        scenarioOutline: "Scenario Outline",
        background: "Background",
        given: "Given",
        when: "When",
        then: "Then",
        and: "And",
        but: "But",
        examples: "Examples",
    },
    fr: {
        feature: "Fonctionnalite",
        scenario: "Scenario",
        scenarioOutline: "Plan du Scenario",
        background: "Contexte",
        given: "Etant donne",
        when: "Quand",
        then: "Alors",
        and: "Et",
        but: "Mais",
        examples: "Exemples",
    },
};

// Default = en pour MVP Sprint 2.21
export const DEFAULT_LANGUAGE = "en";
```

### 3.2 Parser Gherkin -> structured

```typescript
// gherkin/gherkin-parser.ts

export interface GherkinStep {
    keyword: "Given" | "When" | "Then" | "And" | "But";
    text: string;
}

export interface GherkinScenario {
    title: string;
    steps: GherkinStep[];
    tags?: string[];
}

export function parseGherkin(text: string): GherkinScenario {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    
    const scenario: GherkinScenario = {
        title: "",
        steps: [],
        tags: [],
    };
    
    for (const line of lines) {
        // Tags
        if (line.startsWith("@")) {
            scenario.tags = line.split(/\s+/).filter(t => t.startsWith("@"));
            continue;
        }
        
        // Scenario title
        if (line.toLowerCase().startsWith("scenario:")) {
            scenario.title = line.substring("scenario:".length).trim();
            continue;
        }
        
        // Steps
        const keywordMatch = line.match(/^(Given|When|Then|And|But)\s+(.+)$/i);
        if (keywordMatch) {
            scenario.steps.push({
                keyword: keywordMatch[1] as any,
                text: keywordMatch[2],
            });
        }
    }
    
    return scenario;
}
```

### 3.3 Serializer structured -> Gherkin

```typescript
// gherkin/gherkin-serializer.ts

export function serializeGherkin(scenario: GherkinScenario): string {
    const lines: string[] = [];
    
    if (scenario.tags && scenario.tags.length > 0) {
        lines.push(scenario.tags.join(" "));
    }
    
    lines.push(`Scenario: ${scenario.title}`);
    
    for (const step of scenario.steps) {
        lines.push(`  ${step.keyword} ${step.text}`);
    }
    
    return lines.join("\n");
}
```

### 3.4 Conversion bi-directionnelle steps <-> Gherkin

```typescript
// gherkin/gherkin-bridge.ts

import type { TestStep } from "@atconseil/argos-types";

// Steps Argos -> Gherkin scenario
export function stepsToGherkin(
    title: string,
    steps: TestStep[],
    tags: string[] = []
): string {
    const gherkinSteps: GherkinStep[] = steps.map((step, index) => {
        // Heuristique : 1er step = Given, dernier = Then, milieu = When
        // Si user a deja un keyword explicit, le garder
        // Sinon : auto-assign
        let keyword: GherkinStep["keyword"] = "And";
        if (index === 0) keyword = "Given";
        else if (index === steps.length - 1) keyword = "Then";
        else keyword = "When";
        
        return {
            keyword,
            text: step.action || step.description || "",
        };
    });
    
    return serializeGherkin({
        title,
        steps: gherkinSteps,
        tags,
    });
}

// Gherkin scenario -> Steps Argos
export function gherkinToSteps(gherkinText: string): {
    title: string;
    steps: TestStep[];
    tags: string[];
} {
    const scenario = parseGherkin(gherkinText);
    
    const steps: TestStep[] = scenario.steps.map(s => ({
        action: s.text,
        expected: "", // Gherkin classique n'a pas de "expected" separe
        // L'expected est dans le step Then
    }));
    
    return {
        title: scenario.title,
        steps,
        tags: scenario.tags || [],
    };
}
```

### 3.5 Validator Gherkin

```typescript
// gherkin/gherkin-validator.ts

export interface ValidationError {
    line: number;
    message: string;
}

export function validateGherkin(text: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const lines = text.split("\n");
    
    let hasScenario = false;
    let hasGiven = false;
    let hasWhen = false;
    let hasThen = false;
    
    lines.forEach((line, index) => {
        const trimmed = line.trim();
        const lineNum = index + 1;
        
        if (trimmed.length === 0) return;
        
        // Tags must start with @
        if (trimmed.includes("@") && !trimmed.startsWith("@")) {
            // Tags inside text are OK if not at start of line
        }
        
        // Scenario detection
        if (trimmed.toLowerCase().startsWith("scenario:")) {
            hasScenario = true;
            if (trimmed.substring(9).trim().length === 0) {
                errors.push({ line: lineNum, message: "Scenario title is empty" });
            }
            return;
        }
        
        // Step keyword detection
        const keywordMatch = trimmed.match(/^(Given|When|Then|And|But)\s/i);
        if (keywordMatch) {
            const kw = keywordMatch[1].toLowerCase();
            if (kw === "given") hasGiven = true;
            if (kw === "when") hasWhen = true;
            if (kw === "then") hasThen = true;
            return;
        }
        
        // Tags
        if (trimmed.startsWith("@")) return;
        
        // Unknown content
        errors.push({ 
            line: lineNum, 
            message: `Unexpected content: "${trimmed.substring(0, 30)}..."` 
        });
    });
    
    // Structural validation
    if (!hasScenario) {
        errors.push({ line: 0, message: "Missing Scenario declaration" });
    }
    if (!hasGiven) {
        errors.push({ line: 0, message: "Best practice: include Given step (initial state)" });
    }
    if (!hasWhen) {
        errors.push({ line: 0, message: "Best practice: include When step (action)" });
    }
    if (!hasThen) {
        errors.push({ line: 0, message: "Best practice: include Then step (expected result)" });
    }
    
    return errors;
}
```

### 3.6 GherkinEditor component

```typescript
// components/GherkinEditor.tsx

interface GherkinEditorProps {
    value: string;
    onChange: (value: string) => void;
    onValidationChange?: (errors: ValidationError[]) => void;
    height?: string;
}

export function GherkinEditor({ value, onChange, onValidationChange, height = "300px" }: GherkinEditorProps) {
    const [errors, setErrors] = useState<ValidationError[]>([]);
    
    useEffect(() => {
        const newErrors = validateGherkin(value);
        setErrors(newErrors);
        onValidationChange?.(newErrors);
    }, [value, onValidationChange]);
    
    return (
        <div className="gherkin-editor">
            <div className="gherkin-editor__toolbar">
                <span className="gherkin-editor__title">Gherkin BDD</span>
                <div className="gherkin-editor__keywords-hint">
                    <span>Given</span> -&gt; <span>When</span> -&gt; <span>Then</span>
                </div>
            </div>
            
            <div className="gherkin-editor__container" style={{ height }}>
                <GherkinSyntaxHighlight value={value} />
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="gherkin-editor__textarea"
                    spellCheck={false}
                    placeholder="Scenario: User can login\n  Given the user is on login page\n  When they enter valid credentials\n  Then they are redirected to dashboard"
                />
            </div>
            
            {errors.length > 0 && (
                <div className="gherkin-editor__errors">
                    {errors.map((err, i) => (
                        <div key={i} className="gherkin-editor__error">
                            {err.line > 0 ? `Line ${err.line}: ` : ""}{err.message}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
```

### 3.7 GherkinSyntaxHighlight (simple)

```typescript
// components/GherkinSyntaxHighlight.tsx

const KEYWORD_PATTERN = /^(Scenario|Given|When|Then|And|But|Feature|Background|Examples):?\s*/;
const TAG_PATTERN = /(@\w+)/g;
const COMMENT_PATTERN = /(#.*)/g;

export function GherkinSyntaxHighlight({ value }: { value: string }) {
    const highlighted = value
        .split("\n")
        .map((line, index) => {
            // Highlight keywords
            let processed = line.replace(KEYWORD_PATTERN, (match) => 
                `<span class="gherkin-kw">${match}</span>`
            );
            
            // Highlight tags
            processed = processed.replace(TAG_PATTERN, '<span class="gherkin-tag">$1</span>');
            
            // Highlight comments
            processed = processed.replace(COMMENT_PATTERN, '<span class="gherkin-comment">$1</span>');
            
            return `<div class="gherkin-line">${processed || "&nbsp;"}</div>`;
        })
        .join("");
    
    return (
        <div 
            className="gherkin-highlight" 
            dangerouslySetInnerHTML={{ __html: highlighted }} 
            aria-hidden="true"
        />
    );
}
```

### 3.8 StepsEditor avec toggle Gherkin

```typescript
// components/StepsEditor.tsx (modifie pour Sprint 2.21 part 2)

interface StepsEditorProps {
    steps: TestStep[];
    onChange: (steps: TestStep[]) => void;
    title?: string;  // Pour conversion Gherkin (necessite titre)
    tags?: string[];
}

export function StepsEditor({ steps, onChange, title = "", tags = [] }: StepsEditorProps) {
    const [view, setView] = useState<"steps" | "gherkin">("steps");
    const [gherkinText, setGherkinText] = useState("");
    
    // Sync : quand on switch to gherkin, generate text from steps
    useEffect(() => {
        if (view === "gherkin") {
            const text = stepsToGherkin(title, steps, tags);
            setGherkinText(text);
        }
    }, [view, steps, title, tags]);
    
    // Sync : quand on edit gherkin, parse back to steps
    const handleGherkinChange = (newText: string) => {
        setGherkinText(newText);
        try {
            const parsed = gherkinToSteps(newText);
            onChange(parsed.steps);
        } catch (e) {
            // Parsing failed, keep current steps
            // Errors shown by validator
        }
    };
    
    return (
        <div className="steps-editor">
            <div className="steps-editor__toolbar">
                <ToggleButton
                    active={view === "steps"}
                    onClick={() => setView("steps")}
                >
                    Steps
                </ToggleButton>
                <ToggleButton
                    active={view === "gherkin"}
                    onClick={() => setView("gherkin")}
                >
                    Gherkin BDD
                </ToggleButton>
            </div>
            
            {view === "steps" && (
                <StepsListEditor
                    steps={steps}
                    onChange={onChange}
                />
            )}
            
            {view === "gherkin" && (
                <GherkinEditor
                    value={gherkinText}
                    onChange={handleGherkinChange}
                />
            )}
        </div>
    );
}
```

---

## 4. TESTS REGRESSION

### 4.1 Drawer component

```typescript
// tools/regression/T-2.21.2-drawer-component.test.ts

describe("T-2.21.2 Drawer component", () => {
    it("Drawer opens with isOpen=true", () => {
        render(<Drawer isOpen={true} onClose={vi.fn()} title="Test">content</Drawer>);
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    
    it("Drawer calls onClose when close button clicked", () => {
        const onClose = vi.fn();
        render(<Drawer isOpen={true} onClose={onClose} title="Test">content</Drawer>);
        fireEvent.click(screen.getByLabelText("Close drawer"));
        expect(onClose).toHaveBeenCalled();
    });
    
    it("Drawer calls onClose on Escape key", () => {
        // Pattern accessibility
    });
    
    it("Drawer respects width prop", () => {
        const { container } = render(
            <Drawer isOpen={true} onClose={vi.fn()} title="T" width="wide">x</Drawer>
        );
        expect(container.querySelector(".drawer--wide")).toBeInTheDocument();
    });
});
```

### 4.2 Gherkin parser bidirectionnel

```typescript
// tools/regression/T-2.21.2-gherkin-bidirectional.test.ts

describe("T-2.21.2 Gherkin bidirectional conversion", () => {
    it("Steps -> Gherkin -> Steps preserves count", () => {
        const steps: TestStep[] = [
            { action: "User is on login page", expected: "" },
            { action: "User enters credentials", expected: "" },
            { action: "User sees dashboard", expected: "" },
        ];
        
        const gherkin = stepsToGherkin("Login flow", steps);
        const { steps: backToSteps } = gherkinToSteps(gherkin);
        
        expect(backToSteps).toHaveLength(steps.length);
    });
    
    it("Auto-assigns Given/When/Then to 3 steps", () => {
        const steps: TestStep[] = [
            { action: "Initial state", expected: "" },
            { action: "Action happens", expected: "" },
            { action: "Result expected", expected: "" },
        ];
        
        const gherkin = stepsToGherkin("Test", steps);
        
        expect(gherkin).toContain("Given Initial state");
        expect(gherkin).toContain("When Action happens");
        expect(gherkin).toContain("Then Result expected");
    });
    
    it("Validates Gherkin syntax", () => {
        const invalid = "Random text\nNo Scenario keyword";
        const errors = validateGherkin(invalid);
        expect(errors.length).toBeGreaterThan(0);
    });
    
    it("Valid Gherkin has no errors", () => {
        const valid = `Scenario: User login
  Given the user is on login page
  When they enter valid credentials
  Then they see the dashboard`;
        const errors = validateGherkin(valid);
        expect(errors.length).toBe(0);
    });
});
```

### 4.3 No regression on Sprint 2.21 part 1

```typescript
// tools/regression/T-2.21.2-no-regression-suggestions.test.ts

describe("T-2.21.2 No regression on Sprint 2.21 part 1", () => {
    it("AiGenerateModal still opens", () => {
        // Existing tests Sprint 2.21 part 1 should pass
    });
    
    it("LLM provider config still works", () => {
        // Settings AI config unchanged
    });
    
    it("Work item picker still functions", () => {
        // Sprint 2.20 picker preserved
    });
    
    it("Suggestions can still be created (no edit)", () => {
        // Default flow still works
    });
});
```

---

## 5. CHECKPOINTS

### CHECKPOINT A : Drawer revision (3-4h)

A1. Drawer component + CSS (45 min)
A2. useDrawer hook (15 min)
A3. AiSuggestionEditDrawer component (1h30)
A4. Integration dans AiGenerateModal (45 min)
A5. Migration AiSuggestionCard : trigger drawer au lieu inline (30 min)
A6. Tests T-2.21.2-drawer + T-2.21.2-ai-suggestion-edit-drawer (30 min)

VALIDATION ALEX (mi-parcours possible) :
- Preview.html : edit drawer s'ouvre correctement
- Save changes met a jour la card
- Regenerate fonctionne (mocked si pas Azure OpenAI configure)

### CHECKPOINT B : Gherkin native (4-5h)

B1. Gherkin parser + serializer + validator (1h30)
B2. GherkinEditor component avec syntax highlight (1h30)
B3. StepsEditor avec toggle Steps/Gherkin (1h)
B4. Integration dans TestCaseFormView + AiSuggestionEditDrawer (45 min)
B5. Tests T-2.21.2-gherkin-* (45 min)

VALIDATION ALEX :
- TestCaseFormView : toggle Steps/Gherkin marche
- Saisie Gherkin -> conversion auto en steps
- Saisie steps -> Gherkin valide
- Errors visibles si syntax incorrect

### CHECKPOINT C : Bump + tests + PR (30 min)

C1. Bump 0.5.28 -> 0.5.29
C2. CHANGELOG update
C3. Tests complets passent
C4. Build VSIX
C5. Commit + push + PR

---

## 6. STRATEGIES SI TEMPS LIMITE

### Scenario A : tout livre (7-9h)
- Sprint 2.21 part 2 complete livre
- Tag v0.5.29

### Scenario B : Drawer fini, Gherkin partiel
- CHECKPOINT A livre
- Commit Drawer + WIP Gherkin
- Sprint 2.21 part 3 mardi : finir Gherkin
- Tag v0.5.29 = Drawer only
- Tag v0.5.30 mardi = Gherkin

### Scenario C : Drawer + Gherkin demarre mais incomplet
- Drawer livre
- Gherkin reporte Sprint 2.21 part 3
- PR avec Drawer seul + note Gherkin pending

DECISION en cours de sprint selon energie et complexity reelle.

---

## 7. WORKFLOW GIT

```powershell
cd E:\Code\TestVault
git checkout main
git pull

git checkout -b feature/sprint-2-21-part-2-drawer-gherkin

# Travail CHECKPOINTS A-B-C...

node tools\release\bump-fixed-version.cjs 0.5.29

git add -A
git commit -F "$env:TEMP\sprint-2-21-part-2-commit-msg.txt"
git push -u origin feature/sprint-2-21-part-2-drawer-gherkin

gh pr create --title "feat(extension): Sprint 2.21 part 2 - Drawer revision + Gherkin native" `
            --body-file "$env:TEMP\sprint-2-21-part-2-pr-body.txt"
```

---

## 8. COMMIT MESSAGE TEMPLATE

```
feat(extension): Sprint 2.21 part 2 - Drawer revision + Gherkin native

Sprint 2.21 part 1 (vendredi 2026-05-22) delivered AI candidates with
basic inline edit. Sprint 2.21 part 2 upgrades the edit pattern to a 
reusable Drawer and adds Gherkin BDD native editor to TestCaseFormView.

Two complementary deliveries :

PART A - DRAWER REVISION :
- Replace basic inline edit with slide-in Drawer pattern
- Reusable Drawer component for Sprint 2.25+ detail views
- Edit form complete : title, priority, coverage, description, tags, 
  steps (with reorder)
- Regenerate single suggestion via LLM
- Pattern extensible for future advanced revision (Phase 4.x)

PART B - GHERKIN NATIVE :
- Gherkin parser (text -> structured)
- Gherkin serializer (structured -> text)
- Gherkin validator (W3C-compliant syntax checking)
- GherkinEditor component with syntax highlighting
- StepsEditor with toggle Steps / Gherkin views
- Bidirectional conversion : write in Steps OR Gherkin, persist both
- USP "BDD Native" delivered

Delivered files :

Components (6 new) :
- Drawer.tsx + Drawer.css : reusable slide-in drawer
- AiSuggestionEditDrawer.tsx : drawer content edit
- GherkinEditor.tsx : Gherkin editor with highlight
- GherkinSyntaxHighlight.tsx : color-code Given/When/Then
- StepsEditor.tsx (modified) : toggle Steps/Gherkin views

Gherkin module (5 new) :
- gherkin-parser.ts : text -> structured
- gherkin-serializer.ts : structured -> text
- gherkin-validator.ts : syntax validation
- gherkin-keywords.ts : i18n keywords (en + fr ready)
- gherkin-bridge.ts : bidirectional Steps <-> Gherkin

Hooks (1 new) :
- use-drawer.ts : drawer state management

Tests (6 new) :
- T-2.21.2-drawer-component
- T-2.21.2-ai-suggestion-edit-drawer
- T-2.21.2-gherkin-parser
- T-2.21.2-gherkin-serializer
- T-2.21.2-gherkin-bidirectional
- T-2.21.2-no-regression-suggestions

Architecture decisions :
- Drawer pattern reusable (Sprint 2.25 detail views will reuse)
- Gherkin engine self-contained (no external library, lightweight)
- Bidirectional conversion preserves user intent
- Default language en, fr keywords ready for i18n
- Pattern extensible for Sprint 4.x advanced revision features

Future features unlocked :
- Sprint 2.25 : Drawer for Test Plan / Test Case detail views
- Sprint 4.x : Advanced revision (bulk edit, history, compare)
- Sprint 4.x : Gherkin advanced (Scenario Outline, Examples tables)
- Sprint 4.x : Gherkin i18n full (8+ languages)

Out of scope (next sprints) :
- Sprint 2.22 : Coverage Matrix + Test Execution UI advanced
- Sprint 2.23+ : Reports avances, drag-reorder linked cases
- Bulk operations on suggestions : Phase 4.x
- Scenario Outline / Examples table : Phase 4.x
- Gherkin Cucumber.js integration : non prevu (lightweight self-contained)

Bump 0.5.28 -> 0.5.29

Refs :
- Sprint 2.21 part 1 (basic AI candidates)
- ARGOS_ANALYSE_MARCHE_COMPLETE.md v1.1 : F04 + F05 [DONE]
- USP "AI-First + BDD Native" complete
- Drawer pattern preparation Sprint 2.25
```

---

## 9. PR BODY TEMPLATE

```markdown
## Summary

Sprint 2.21 part 2 -- Drawer revision + Gherkin native.

Two complementary features :

### A. Drawer revision (CHECKPOINT A)
Upgrades the AI suggestion edit from basic inline (Sprint 2.21 part 1) 
to a reusable slide-in Drawer pattern. Reusable for Sprint 2.25+ detail
views and Phase 4.x advanced revision features.

### B. Gherkin native (CHECKPOINT B)
Adds Gherkin BDD support directly in TestCaseFormView. Users can toggle
between Steps view and Gherkin view, with bidirectional conversion 
preserving content. USP "BDD Native" delivered.

## Architecture

### Drawer
- Slide-in animation 250ms
- Width variants : narrow/medium/wide
- Full keyboard navigation (Escape closes)
- Focus trap for accessibility
- ARIA dialog modal pattern

### Gherkin
- Self-contained engine (no external lib)
- Parser + Serializer + Validator
- i18n ready (en, fr keywords)
- Lightweight (no Cucumber dependency)

## Tests

- 6 new regression tests T-2.21.2-*
- All existing Sprint 2.21 part 1 tests pass
- No regression on 7 WIT views

## Reusable for future sprints

- Drawer : Sprint 2.25 Drawer detail view, Phase 4.x advanced revision
- Gherkin : Phase 4.x Scenario Outline, Examples tables, i18n complete

## Out of scope

- Sprint 2.22 : Coverage Matrix + advanced Test Execution UI
- Sprint 4.x : Bulk operations, history, compare suggestions
- Sprint 4.x : Scenario Outline, Examples tables, full i18n

## Bump

0.5.28 -> 0.5.29

## Refs

- ARGOS_ANALYSE_MARCHE_COMPLETE.md v1.1 : F04 + F05 [DONE]
- USP "AI-First + BDD Native" complete
- Sprint 2.21 part 1 (basic edit) -> Sprint 2.21 part 2 (Drawer + Gherkin)
```

---

## 10. APRES MERGE

```powershell
git checkout main
git pull
git tag -a v0.5.29 -m "Release v0.5.29 - Sprint 2.21 part 2 Drawer + Gherkin native"
git push origin v0.5.29

# Surveille CI ~8 min

# Reinstall extension BCEE-QA

# Test E2E :
# 1. Open Test Case form
# 2. Click "AI Generate" -> modal opens
# 3. Generate suggestions (if Azure OpenAI configured)
# 4. Click "Edit" on a suggestion : Drawer slides in from right
# 5. Edit all fields, save : drawer closes, card updated
# 6. Regenerate single suggestion : drawer content updates
# 7. Cancel : original kept
# 8. Test Case form : toggle Steps / Gherkin
# 9. Write in Steps view : Gherkin auto-generates
# 10. Edit in Gherkin view : Steps auto-update
# 11. Invalid Gherkin : errors shown
# 12. Save Test Case : both formats preserved
```

---

## 11. NOTES IMPORTANTES

### 11.1 ASCII strict

Tous commentaires, messages git, JSON, descriptions = ASCII.
Exception : Gherkin scenarios peuvent contenir natural language 
(mais en anglais pour Sprint 2.21).

### 11.2 Performance Drawer

- Animation slide CSS-only (pas de JS animation lib)
- No re-render des suggestions cards pendant edit
- Drawer mount/unmount = OK pour MVP
- Si perf issue : optimiser avec memoization plus tard

### 11.3 Gherkin parser sans lib externe

Decision architecturale : NE PAS utiliser :
- gherkin-cucumber (gros, complet, overkill MVP)
- @cucumber/gherkin (idem)

Notre parser custom :
- ~200 lignes total
- Couvre 80% des besoins
- Extensible si demande user

### 11.4 Bidirectional preservation

Quand user edit en Gherkin puis revient en Steps :
- Si Gherkin valide : steps regenerated
- Si Gherkin invalide : steps preserves (pas de loss)
- Errors affichees en realtime

### 11.5 Si CHECKPOINT B trop long

Acceptable de livrer :
- CHECKPOINT A only = Drawer revision
- Sprint 2.21 part 3 mardi = Gherkin
- Pas de honte, decoupage sage

### 11.6 Maintenance docs strategiques

Apres ce sprint :
- F04 [DONE] confirme (Sprint 2.21 part 1 + 2)
- F05 [DONE] (Gherkin native)
- USP "AI-First + BDD Native" complet
- Pattern Drawer documente pour Sprint 2.25

---

## 12. CHECKLIST FINALE

Avant PR :

- [ ] CHECKPOINT A done (Drawer + edit drawer)
- [ ] CHECKPOINT B done (Gherkin parser + editor)
- [ ] CHECKPOINT C done (bump + tests + PR)
- [ ] 6 tests T-2.21.2-* passent
- [ ] Tests existants passent (no regression Sprint 2.21 part 1)
- [ ] Bump 0.5.28 -> 0.5.29
- [ ] CHANGELOG.md update
- [ ] Specs/tasks.md update
- [ ] preview.html : Drawer s'ouvre, Gherkin toggle marche
- [ ] VSIX rebuild reussit
- [ ] ASCII strict (sauf prompts LLM)
- [ ] Drawer accessible (ARIA, focus trap, Escape)
- [ ] Gherkin valide syntax W3C

OU CHECKPOINT B reporte :
- [ ] CHECKPOINT A complete livre
- [ ] Sprint 2.21 part 3 mardi planifie pour Gherkin
- [ ] PR avec note "Gherkin pending Sprint 2.21 part 3"

---

Fin du prompt CLAUDE_TASK Sprint 2.21 part 2.

Estimation : 7-9 heures pour Claude Code.
Suite : Sprint 2.22 (Coverage Matrix + Test Execution UI advanced).
