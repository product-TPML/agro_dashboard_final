# CMS Media Library — Bulk Upload Flow (Browser UI)

How to upload images in bulk to the Prajavani CMS media library and obtain CDN URLs, using the browser UI (no direct API calls).

## Prerequisites

- Authenticated session at `https://prajavani.quintype.com/media-library` (user: Suhas Bhandari / prajavani).
- Files to upload (PNG/SVG only — the file input has `accept="image/*"`).

## Flow (per batch of up to 15 files)

### 1. Open Add New file picker
- URL: `https://prajavani.quintype.com/media-library`
- Click the grid card `[data-test-id="add-new-file-btn"]` (the "Add New" card with the plus symbol).
- A native file chooser opens (Playwright: handled via `browser_file_upload`).

### 2. Select files (multi-select supported)
- The input supports `multiple` — select all batch files at once.
- Page navigates to `https://prajavani.quintype.com/media-library/upload/new`.

### 3. Wait for S3 uploads to finish
- Each file independently does:
  - `GET /sign?file-name=<name>&mime-type=<type>` → 200 (returns pre-signed S3 policy)
  - `POST https://quintype-dropbox.s3-accelerate.amazonaws.com/` → 201 (binary upload)
- UI shows "Uploading..." (heading) until done — wait for it to disappear.

### 4. Fill caption per image (compulsory)
The Media Properties panel shows a carousel (`X/15`). For each image:
1. Read the `File Name` input value (use it as the caption text).
2. Click the caption editor: `.ProseMirror` (ProseMirror rich-text). It must be clicked first to focus (the focused instance is `.ProseMirror.ProseMirror-focused`).
3. Fill the caption with the exact filename.
4. Click next arrow `[data-test-id="image-arrow-right-btn"]`.

Notes:
- The caption wrapper is `div[data-test-id="text-area-wrapper"]`; the label div has text exactly `Caption`.
- `div:has-text("^Caption$")` stops matching once the caption has content — click the `.ProseMirror` directly instead.
- Alt Text, Attribution, Link to a User are optional — leave empty.

### 5. Save
- Click `[data-test-id="inspector-action-btn"]` ("Save").
- App calls `POST /api/media-library-elements` → 201 for the whole batch (one request, array of media).
- Auto-navigates back to `/media-library`.

### 6. Capture CDN URLs
- Response body of `POST /api/media-library-elements` contains one object per image with `image-s3-key` (e.g. `prajavani/2026-08-13/<hash>/<file-name>`).
- Final CDN URL: `https://images.assettype.com/<image-s3-key>` (e.g. `https://images.assettype.com/prajavani/2026-08-13/wcdzmstc/alasande-gram-thumb-real.png`).
- The upload flow uploads to S3 first; the CDN URL only exists after the save (registration) step.

## Playwright automation snippets

### Select 15 files
```js
await fileChooser.setFiles([...paths]); // 15 absolute paths
```

### Wait for uploads + fill captions + advance
```js
await page.waitForFunction(() => ![...document.querySelectorAll('h5')]
  .some(h => h.textContent.includes('Uploading')), { timeout: 90000 }).catch(() => {});
await page.waitForTimeout(1500);
for (let i = 0; i < 15; i++) {
  const vals = await page.locator('input').evaluateAll(els => els.map(e => e.value));
  const file = vals.find(v => (v.endsWith('.png') || v.endsWith('.svg')) && !v.startsWith('http'));
  const s3url = vals.find(v => v.startsWith('https://quintype-dropbox'));
  await page.locator('.ProseMirror').first().click();
  await page.waitForTimeout(120);
  await page.locator('.ProseMirror.ProseMirror-focused').fill(file);
  if (i < 14) {
    await page.locator('[data-test-id="image-arrow-right-btn"]').click();
    await page.waitForTimeout(400);
  }
}
```

### Save
```js
await page.locator('[data-test-id="inspector-action-btn"]').click();
```

## Reference: request chain per image

| # | Method | URL | Status | Purpose |
|---|--------|-----|--------|---------|
| 1 | GET | `/sign?file-name=<name>&mime-type=<type>` | 200 | Pre-signed S3 upload URL + policy |
| 2 | POST | `https://quintype-dropbox.s3-accelerate.amazonaws.com/` | 201 | Upload binary (multipart form-data) |
| 3 | POST | `/api/media-library-elements` | 201 | Register media (batch of N) |
| 4 | GET | `/api/search/media/image?operator=or&provider=all` | 200 | Reload library grid |

## Key selectors

| Element | Selector |
|---------|----------|
| Add New (plus card) | `[data-test-id="add-new-file-btn"]` |
| Next image arrow | `[data-test-id="image-arrow-right-btn"]` |
| Save | `[data-test-id="inspector-action-btn"]` |
| Caption editor | `.ProseMirror` (first) → fill focused `.ProseMirror.ProseMirror-focused` |
| File Name input | `input` whose value ends in `.png`/`.svg` and isn't an S3 URL |
| S3 URL input (read-only) | `input[value^="https://quintype-dropbox"]` |
