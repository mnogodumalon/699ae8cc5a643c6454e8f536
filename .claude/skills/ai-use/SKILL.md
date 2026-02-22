---
name: adding-ai-features
description: Adds smart AI features to web applications — automatically sort or categorize content, extract information from text or uploaded photos and documents, summarize long text, and translate between languages. Use when the user wants the app to be smart or intelligent, or asks for auto-fill from photos, automatic categorization or sorting, content summarization, language translation, document reading, image recognition, receipt scanning, invoice parsing, or extracting information from files. Implements these features using a built-in AI endpoint. All generated code is pure JavaScript with no external dependencies.
---

# Adding AI Features

Add smart features to web applications using the built-in AI endpoint. Pure JavaScript, zero external dependencies.

## Contents

- [API Configuration](#api-configuration) — Endpoint and model details
- [Core Helper](#core-helper) — Reusable function all features build on
- [Use Cases](#use-cases) — Categorize, extract data, summarize, translate
- [Working with Files](#working-with-files) — Analyze images, PDFs, documents
- [API Parameters Reference](#api-parameters-reference)
- [Error Handling](#error-handling)
- [Real-World Example: Auto-Fill from Photo](#real-world-example) — See [PHOTO_AUTOFILL.md](PHOTO_AUTOFILL.md)
- [Guidelines](#guidelines)

## API Configuration

| Property       | Value                                                        |
|----------------|--------------------------------------------------------------|
| **Endpoint**   | `https://my.living-apps.de/litellm/v1/chat/completions`   |
| **Method**     | `POST`                                                       |
| **Model**      | `default`                                               |
| **Auth**       | None required                                                |
| **Format**     | OpenAI-compatible chat completions                           |

## Core Helper

Every use case builds on one reusable function. Include it once in the application, call it everywhere.

```javascript
const AI_ENDPOINT = "https://my.living-apps.de/litellm/v1/chat/completions";
const AI_MODEL = "default";

async function chatCompletion(messages, options = {}) {
  const res = await fetch(AI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      ...options,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI API ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}
```

## Use Cases

### 1. Automatic Categorization

Automatically sort text into predefined categories (e.g. support tickets, feedback, content types).

```javascript
async function classify(text, categories) {
  const result = await chatCompletion([
    {
      role: "system",
      content: [
        "You are a classifier. Respond ONLY with valid JSON, nothing else.",
        "Output format: {\"category\": \"<one of the allowed categories>\", \"confidence\": <0-1>}",
        `Allowed categories: ${JSON.stringify(categories)}`,
      ].join("\n"),
    },
    { role: "user", content: text },
  ], { temperature: 0 });

  return JSON.parse(result);
}
```

Usage:

```javascript
const { category, confidence } = await classify(
  "The server crashed at 3am and all requests are timing out",
  ["bug", "feature-request", "question", "documentation"]
);
// { category: "bug", confidence: 0.97 }
```

### 2. Extract Information from Text

Pull structured fields out of free-form text (e.g. invoices, emails, descriptions).

```javascript
async function extract(text, schemaDescription) {
  const result = await chatCompletion([
    {
      role: "system",
      content: [
        "You are a data extraction engine. Respond ONLY with valid JSON matching the requested schema.",
        "If a field cannot be determined from the input, use null.",
        `Schema:\n${schemaDescription}`,
      ].join("\n"),
    },
    { role: "user", content: text },
  ], { temperature: 0 });

  return JSON.parse(result);
}
```

Usage:

```javascript
const invoice = await extract(
  "Invoice #2024-0892 from Acme Corp, dated March 15 2025. Total: EUR 1,450.00. Due in 30 days.",
  `{
    "invoice_number": "string",
    "vendor": "string",
    "date": "YYYY-MM-DD",
    "total_amount": number,
    "currency": "string",
    "due_date": "YYYY-MM-DD or null"
  }`
);
// { invoice_number: "2024-0892", vendor: "Acme Corp", date: "2025-03-15", ... }
```

### 3. Summarize Text

Condense long text to key points.

```javascript
async function summarize(text, { maxSentences = 3, language } = {}) {
  const instructions = [
    `Summarize the following text in at most ${maxSentences} sentences.`,
    "Be concise and preserve key facts.",
  ];
  if (language) {
    instructions.push(`Write the summary in ${language}.`);
  }

  return chatCompletion([
    { role: "system", content: instructions.join(" ") },
    { role: "user", content: text },
  ]);
}
```

Usage:

```javascript
const summary = await summarize(longArticleText, { maxSentences: 2 });
```

### 4. Translate Text

Translate text between any language pair.

```javascript
async function translate(text, targetLanguage, sourceLanguage) {
  const from = sourceLanguage ? ` from ${sourceLanguage}` : "";
  return chatCompletion([
    {
      role: "system",
      content: `Translate the following text${from} to ${targetLanguage}. Output ONLY the translation, nothing else.`,
    },
    { role: "user", content: text },
  ]);
}
```

Usage:

```javascript
const german = await translate("The meeting is at 3pm tomorrow", "German");
// "Das Meeting ist morgen um 15 Uhr"

const english = await translate("お疲れ様です", "English", "Japanese");
// "Thank you for your hard work"
```

## Working with Files

Files must be base64 data URIs. Three encoding helpers:

```javascript
function fileToDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function urlToDataUri(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to encode file"));
    reader.readAsDataURL(blob);
  });
}

function bytesToDataUri(bytes, mimeType) {
  const uint8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}
```

### Analyze Images

Use the `image_url` content type:

```javascript
async function analyzeImage(imageDataUri, prompt) {
  return chatCompletion([
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageDataUri } },
      ],
    },
  ]);
}
```

### Read Documents (PDF, etc.)

Use the `file` content type:

```javascript
async function analyzeDocument(fileDataUri, prompt) {
  return chatCompletion([
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "file", file: { file_data: fileDataUri } },
      ],
    },
  ]);
}
```

### Extract Information from Photos

Combine image analysis with structured data extraction:

```javascript
async function extractFromPhoto(imageDataUri, schemaDescription) {
  const result = await chatCompletion([
    {
      role: "system",
      content: [
        "Extract structured data from the provided image.",
        "Respond ONLY with valid JSON matching the schema.",
        "Use null for fields that cannot be determined.",
        `Schema:\n${schemaDescription}`,
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        { type: "text", text: "Extract the data from this image." },
        { type: "image_url", image_url: { url: imageDataUri } },
      ],
    },
  ], { temperature: 0 });

  return JSON.parse(result);
}
```

### Multipart Content Messages

Combine text, images, and files in a single message:

```javascript
const result = await chatCompletion([
  {
    role: "user",
    content: [
      { type: "text", text: "Compare the design in the image with the requirements in the PDF." },
      { type: "image_url", image_url: { url: screenshotDataUri } },
      { type: "file", file: { file_data: specPdfDataUri } },
    ],
  },
]);
```

## API Parameters Reference

These optional parameters can be passed as the second argument to `chatCompletion`:

| Parameter          | Type              | Purpose                                                        |
|--------------------|-------------------|----------------------------------------------------------------|
| `temperature`      | `number` (0-2)    | Randomness. Use `0` for deterministic extraction/classification |
| `max_tokens`       | `number`          | Cap response length                                            |
| `top_p`            | `number` (0-1)    | Nucleus sampling alternative to temperature                    |
| `stop`             | `string[]`        | Stop sequences                                                 |
| `response_format`  | `object`          | Force JSON output: `{ type: "json_object" }`                   |
| `stream`           | `boolean`         | Enable SSE streaming (requires different response handling)     |

Example with explicit parameters:

```javascript
const result = await chatCompletion(messages, {
  temperature: 0,
  max_tokens: 500,
  response_format: { type: "json_object" },
});
```

## Error Handling

Always wrap API calls. The endpoint may be temporarily unavailable or the model may return unparseable output.

```javascript
async function safeJsonCompletion(messages, options = {}) {
  const raw = await chatCompletion(messages, options);

  const jsonMatch = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(`Expected JSON but got: ${raw.slice(0, 200)}`);
  }

  return JSON.parse(jsonMatch[0]);
}
```

For retries:

```javascript
async function withRetry(fn, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

// Usage
const data = await withRetry(() =>
  extract("some messy text...", '{"name": "string", "email": "string"}')
);
```

## Real-World Example

**Photo auto-fill**: Upload a product photo, extract structured data, auto-populate form fields. See [PHOTO_AUTOFILL.md](PHOTO_AUTOFILL.md) for complete implementation guide.

## Guidelines

- **Always set `temperature: 0`** for classification, extraction, and any task where determinism matters.
- **Always request JSON output** in the system prompt when you need structured data. Include the exact schema shape.
- **Parse defensively** - use `safeJsonCompletion` or regex extraction to handle models that wrap JSON in markdown fences.
- **Parallelize independent calls** with `Promise.all` to reduce total latency.
- **Keep system prompts short and precise** - vague instructions produce vague output.
- **Use `max_tokens`** when you know the expected output size to avoid unnecessary token usage.
- **MIME types matter** for file data URIs - `data:application/pdf;base64,...` for PDFs, `data:image/png;base64,...` for PNGs, `data:image/jpeg;base64,...` for JPEGs.
- **No authentication** is needed for this endpoint. Do not add API keys or bearer tokens.
- **No external dependencies** - everything uses the browser-native `fetch`, `FileReader`, `btoa`, and `JSON` APIs.
