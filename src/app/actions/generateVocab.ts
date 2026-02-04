'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { ServerActionResponse, GeminiResponse, CefrLevel } from '@/types/vocab'

const genAI = (() => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return null
  }
  return new GoogleGenerativeAI(apiKey)
})()

const MODEL_PRIORITY = [
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-pro',
]

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const VOCAB_PROMPT_TEMPLATE = (englishTerm: string, level: CefrLevel) => `
You are an expert German language instructor.
Target CEFR Level: ${level}

Constraints based on level:
- A1: Use very short, simple sentences. Present tense. Basic vocabulary.
- A2: Simple sentences but with slightly more detail. High-frequency words.
- B1: Moderate sentence length. Standard business/workplace context.
- B2: Complex sentence structures, subordinate clauses, sophisticated vocabulary.
- C1: Advanced, nuanced expression. Use idiomatically correct, complex grammar and sophisticated vocabulary.

English Term: "${englishTerm}"

IMPORTANT REQUIREMENTS:
1. Return ONLY valid JSON, no markdown, no code blocks, no explanations
2. The article must be one of: "der", "die", "das", or "none" (for verbs/adjectives/adverbs)
3. Provide the plural form in German (nominative case)
4. The example sentence must contain the German term and be natural, professional German
5. Provide an English translation of the example sentence

Return JSON in this exact format:
{
  "germanTerm": "German translation of the term",
  "article": "der|die|das|none",
  "plural": "plural form in German (or same as singular if no plural)",
  "exampleSentence": "A professional sentence in German using the term",
  "englishSentence": "English translation of the example sentence"
}

If the term cannot be translated or is invalid, return:
{
  "germanTerm": "untranslatable",
  "article": "none",
  "plural": "N/A",
  "exampleSentence": "Invalid or untranslatable term",
  "englishSentence": "N/A"
}
`

async function generateWithFallback(prompt: string) {
  if (!genAI) {
    throw new Error('Gemini API key not configured')
  }

  for (let i = 0; i < MODEL_PRIORITY.length; i++) {
    const modelName = MODEL_PRIORITY[i]
    try {
      if (i > 0) {
        const waitTime = 2000 * i
        console.log(`...Waiting ${waitTime}ms before trying ${modelName}...`)
        await delay(waitTime)
      }
      console.log(`Attempting generation with model: ${modelName}`)
      const model = genAI.getGenerativeModel({
        model: modelName,
      })

      const result = await model.generateContent(prompt)
      const response = await result.response
      return response.text()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`Model ${modelName} failed.`, message)
    }
  }

  throw new Error('All AI models failed. Please try again later.')
}

async function callGeminiAPI(
  englishTerm: string,
  cefrLevel: CefrLevel
): Promise<GeminiResponse> {
  try {
    const prompt = VOCAB_PROMPT_TEMPLATE(englishTerm, cefrLevel)

    const responseText = await generateWithFallback(prompt)

    const jsonMatch = responseText.match(/\{[\s\S]*?\}/)
    if (!jsonMatch) {
      console.error('No JSON found in response:', responseText)
      return {
        germanTerm: 'error',
        article: 'none',
        plural: 'N/A',
        exampleSentence: 'Failed to parse Gemini response',
        englishSentence: 'Error',
      }
    }

    const cleanedJson = jsonMatch[0]
    const parsedResponse: GeminiResponse = JSON.parse(cleanedJson)

    // Validation layer
    if (!parsedResponse.germanTerm) {
      return {
        germanTerm: 'invalid',
        article: 'none',
        plural: 'N/A',
        exampleSentence: 'Invalid response from Gemini',
        englishSentence: 'Error',
      }
    }

    // Ensure article is valid
    const validArticles: Array<'der' | 'die' | 'das' | 'none'> = [
      'der',
      'die',
      'das',
      'none',
    ]
    if (!validArticles.includes(parsedResponse.article)) {
      parsedResponse.article = 'none'
    }

    // Ensure englishSentence exists
    if (!parsedResponse.englishSentence) {
      parsedResponse.englishSentence = "Translation unavailable"
    }

    return parsedResponse
  } catch (error) {
    console.error('Gemini API Error:', error)
    throw new Error(`Failed to call Gemini API: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function generateVocabData(
  englishTerm: string,
  cefrLevel: CefrLevel = 'B1'
): Promise<ServerActionResponse> {
  // Input validation
  if (!englishTerm || typeof englishTerm !== 'string') {
    return {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'English term must be a non-empty string',
      },
    }
  }

  const trimmedTerm = englishTerm.trim()
  if (trimmedTerm.length < 2 || trimmedTerm.length > 100) {
    return {
      success: false,
      error: {
        code: 'INVALID_TERM_LENGTH',
        message: 'English term must be between 2 and 100 characters',
      },
    }
  }

  // Sanitize input (remove special characters)
  const sanitizedTerm = trimmedTerm.replace(/[^a-zA-Z\s\-]/g, '')
  if (sanitizedTerm.length === 0) {
    return {
      success: false,
      error: {
        code: 'INVALID_CHARACTERS',
        message: 'English term contains invalid characters',
      },
    }
  }

  const validLevels: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1']
  if (!validLevels.includes(cefrLevel)) {
    return {
      success: false,
      error: {
        code: 'INVALID_LEVEL',
        message: 'CEFR level must be one of A1, A2, B1, B2, or C1',
      },
    }
  }

  try {
    const geminiData = await callGeminiAPI(sanitizedTerm, cefrLevel)

    // Check for Gemini API errors
    if (
      geminiData.germanTerm === 'error' ||
      geminiData.germanTerm === 'invalid' ||
      geminiData.germanTerm === 'untranslatable'
    ) {
      return {
        success: false,
        error: {
          code: 'GEMINI_ERROR',
          message: `Could not translate "${englishTerm}". Please try another term.`,
        },
      }
    }

    const vocabData = {
      originalTerm: sanitizedTerm,
      germanTerm: geminiData.germanTerm,
      article: geminiData.article,
      plural: geminiData.plural,
      exampleSentence: geminiData.exampleSentence,
      englishSentence: geminiData.englishSentence,
      category: 'work',
      cefrLevel: cefrLevel,
    }

    return {
      success: true,
      data: vocabData,
    }
  } catch (error) {
    console.error('Server Action Error:', error)
    return {
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to generate vocab data. Please try again.',
      },
    }
  }
}