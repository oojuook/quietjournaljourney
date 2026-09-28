Quiet Journal Journey upload-safe package

Use this package if GitHub web upload keeps flattening the src/ and public/ folders.

How to use:
1. Extract this zip on your computer.
2. Open the folder `quietjournaljourney-web-upload-safe`.
3. Upload ALL files in that folder to the ROOT of your GitHub repo.
4. Do not unzip `src.tar.gz` or `public.tar.gz` before uploading.
5. After upload, your repo root should contain `src.tar.gz`, `public.tar.gz`, `restore-folders.sh`, and this modified `package.json`.
6. Vercel will run the build script, restore the folders automatically, and then build normally.

Why this works:
- GitHub web upload can make folder uploads awkward.
- Keeping src and public as `.tar.gz` files prevents the browser uploader from flattening them into the repo root.
- The restore script recreates the folders during build.
