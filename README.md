# DDeutSch - AI-Powered Business German Trainer 🇩🇪

**DDeutSch** is a specialized vocabulary builder designed for professionals learning German. Unlike generic flashcard apps, it uses **Generative AI (Gemini)** to create context-aware vocabulary cards complete with articles, plurals, and business-oriented example sentences.

It features a custom **Spaced Repetition System (SRS)** with a unique "Phase-Locked" study mode to ensure deep retention.

## 🚀 Key Features

### 🧠 AI-Driven Generation
- Generates vocabulary with **CEFR-graded context** (A1-C1).
- Automatically fetches: *German Term, Article, Plural, Example Sentence, and English Translation*.
- **Smart Fallback System**: Automatically switches between Gemini models (2.5 Flash Lite → 2.0 Flash → Pro) to ensure reliability and handle rate limits.

### 📚 Deep Study Mode
- **Phase Locking Algorithm**: Forces users to complete "Round 1" (New) cards before moving to "Round 2" (Review) or "Round 3" (Final).
- **Session Stability**: Uses database-backed tracking (`learningStep`) so progress is never lost, even on refresh.
- **Audio Support**: Text-to-Speech integration for pronunciation practice.
- **Skip Logic**: "Finish Loop Early" option for easy cards.

### 🛠️ Data Management
- **Manual Entry**: Create custom cards when AI isn't needed.
- **Conflict Resolution**: Smart detection of duplicate cards with an "Overwrite/Upgrade" workflow.
- **Search & Filter**: Real-time filtering by Category, Level, or Text.

## 🏗️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI (Lucide Icons)
- **Backend/DB**: Firebase v9 (Firestore + Auth)
- **AI Engine**: Google Gemini API (via Google AI SDK)

## ⚡ Getting Started

1. **Clone the repository**
  ```bash
  git clone https://github.com/your-username/ddeutsch.git
  ```

2. **Install dependencies**
  ```bash
  npm install
  ```

3. **Configure Environment**
Create a `.env.local` file:

  ```bash
  NEXT_PUBLIC_FIREBASE_API_KEY=...
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
  # ... other firebase config
  GEMINI_API_KEY=...
  ```

4. **Run Development Server**
  ```bash
  npm run dev
  ```

## 📸 Usage

- **Generate**: Type an English business term (e.g., "Supplier") and select a level (B1).
- **Review**: Enter Study Mode. The app will present cards in random order within their active Phase.
- **Rate**:
  - **Again**: Resets card to Round 1 (Immediate review).
  - **Good/Hard**: Advances card to next Round.
  - **Easy**: Graduates card to long-term SRS (days/weeks).# DDeutSch