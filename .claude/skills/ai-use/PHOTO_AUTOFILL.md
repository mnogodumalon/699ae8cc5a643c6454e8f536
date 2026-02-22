# Auto-Fill Form Fields from a Photo Upload

A user uploads a photo of a product (e.g. furniture, electronics, a vehicle) through a file input. The application sends it to the LLM, which returns structured data — manufacturer, model, color, condition, etc. The application then auto-populates form fields.

**Applicable to:** product listing forms, inventory management, insurance claims, receipt/label scanning.

## Implementation

### 1. Derive the extraction schema from the backend data model

Reuse the backend field names, types, and constraints directly — do not invent a separate schema.

```javascript
const PRODUCT_SCHEMA = {
  manufacturer: "string — brand or manufacturer name",
  model: "string — product model or name",
  color: "string — primary color",
  size: "string — dimensions or size label (e.g. '42x30x15 cm', 'XL')",
  condition: "string — one of: new, like-new, good, fair, poor",
  additional_notes: "string — any other notable details visible in the photo",
};
```

The keys must correspond to actual backend field identifiers. Incorporate enum constraints and date formats from the backend so the LLM returns values the backend will accept without transformation.

### 2. Listen for file selection

```javascript
document.getElementById("photo-upload").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const dataUri = await fileToDataUri(file);
  const extracted = await extractProductFromPhoto(dataUri);
  fillFormFields(extracted);
});
```

### 3. Send the photo with a structured extraction prompt

```javascript
async function extractProductFromPhoto(imageDataUri) {
  const schemaString = JSON.stringify(PRODUCT_SCHEMA, null, 2);

  const result = await chatCompletion([
    {
      role: "system",
      content: [
        "Analyze the product in the provided photo.",
        "Extract information and respond ONLY with valid JSON matching this schema:",
        schemaString,
        "Use null for any field that cannot be determined from the image.",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        { type: "text", text: "Extract product details from this photo." },
        { type: "image_url", image_url: { url: imageDataUri } },
      ],
    },
  ], { temperature: 0 });

  return JSON.parse(result);
}
```

### 4. Populate form fields

Map each key to the corresponding form input. Skip `null` values so partial extraction doesn't overwrite existing user input.

```javascript
function fillFormFields(data) {
  const fieldMapping = {
    manufacturer: "input-manufacturer",
    model: "input-model",
    color: "input-color",
    size: "input-size",
    condition: "select-condition",
    additional_notes: "textarea-notes",
  };

  for (const [key, elementId] of Object.entries(fieldMapping)) {
    if (data[key] == null) continue;
    const el = document.getElementById(elementId);
    if (!el) continue;
    el.value = data[key];
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
```

### 5. Add loading state and error handling

```javascript
document.getElementById("photo-upload").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const status = document.getElementById("analysis-status");
  status.textContent = "Analyzing photo...";
  status.className = "status-loading";

  try {
    const dataUri = await fileToDataUri(file);
    const extracted = await extractProductFromPhoto(dataUri);
    fillFormFields(extracted);
    status.textContent = "Fields updated from photo.";
    status.className = "status-success";
  } catch (err) {
    console.error("Photo analysis failed:", err);
    status.textContent = "Could not analyze photo. Please fill in fields manually.";
    status.className = "status-error";
  }
});
```

## Key Considerations

- **Dispatch `input` events** after setting values so framework-managed state (React, Vue) picks up changes. In React, you may need the native input setter via the prototype to trigger synthetic events.
- **Resize large images** before base64 encoding — 1024px wide is usually sufficient for product identification.
- **Let users review and edit** auto-filled values. AI extraction is not perfect — always treat it as a suggestion.
