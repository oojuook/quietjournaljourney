Quiet Journal Journey upload-safe package

Use this package if GitHub web upload keeps flattening the src/ and public/ folders.

How to use:
1. Extract this zip on your computer.
2. Open the folder `quietjournaljourney-web-upload-safe`.
3. Upload ALL files in that folder to the ROOT of your GitHub repo.
4. Do not unzip `src.tar.gz` or `public.tar.gz` before uploading.
5. After upload, your repo root should contain `src.tar.gz`, `public.tar.gz`, `restore-folders.sh`, and this modified `package.json`.
6. Vercel will run the build script, replace any old `src` / `public` folders automatically, restore the new folders from the archives, and then build normally.

Important:
- This is the recommended replacement-safe zip to use when you want the uploaded site to match the latest preview.
- If your repo still has old `src/` and `public/` folders, this package is designed to override them during build.
- Do not manually extract `src.tar.gz` or `public.tar.gz` inside GitHub. Upload them as files.
