# Serify Features

## ✅ Current Product

### 1. Reflection Session Creation
- Source types: YouTube URL, article URL, and pasted notes
- Optional session title and selectable difficulty
- Processing state with staged progress indicators

### 2. Concept Extraction
- AI extracts 4-6 core concepts from submitted content
- Concepts are persisted per reflection session
- Session transitions from `processing` to `assessment`

### 3. Diagnostic Assessment
- Open-ended questions generated from extracted concepts
- Mixed cognitive prompts (retrieval, application, misconception)
- Per-question confidence capture (`low`, `medium`, `high`)

### 4. Cognitive Analysis
- Depth score (0-100)
- Strength map (`strong`, `weak`, `missing`)
- Insight cards (strength/weakness/misconception/gap)
- Actionable focus suggestions

### 5. Dashboard + History + Profile
- Session overview with streak and average depth score
- Recent reflection activity cards
- User preference controls (tone + question count)

## 🔌 Active API Surface

- `POST /api/serify/extract`
- `GET /api/serify/assess`
- `POST /api/serify/analyze`

## 🧠 AI Layer

- `extractConcepts(contentSource)`
- `generateAssessment(concepts, preferences)`
- `analyzeAnswers(reflectionSession)`

All three are implemented in `lib/serify-ai.ts` and powered by Gemini 2.5 Flash.

## 📦 Data + Auth

- Supabase Auth for session identity
- Supabase tables for sessions, concepts, questions, answers, and analyses
- Preferences loaded from and persisted to `profiles.preferences`
