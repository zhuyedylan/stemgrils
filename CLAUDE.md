## Project: 3D Printing Process Manual Site
A Docusaurus-based repository for junior high school students' 3D printing materials and process guides.

## Build & Development Commands
- `npm start`: Launch the local development server.
- `npm run build`: Build static site (outputs to `./build`).
- `npm run serve`: Serve the locally built site.
- `npm run clear`: Clear Docusaurus cache.
- `npm run deploy`: Deploy to Gitee/Tencent.

## Word-to-Markdown Conversion
- `npm run convert`: Converts Word files in `/uploads` to `/docs`.
- Required Tools: `mammoth`, `path`, `fs-extra`.

## Coding Standards
- **File Naming:** `kebab-case.md`.
- **Components:** Functional React components (PascalCase).
- **Formatting:** 2-space indentation, Prettier.
- **Patterns:** YAML frontmatter required.