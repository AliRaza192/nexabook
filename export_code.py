import os

def generate_code_report():
    print("Scanning project directory...")
    extensions = ('.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.prisma', '.env.example')
    ignored_dirs = {'node_modules', '.next', '.git', 'dist', 'build', 'out'}
    
    html_content = '''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page {
        size: A4;
        margin: 20mm 15mm;
        background-color: #ffffff;
        @bottom-right { content: "Page " counter(page); font-family: sans-serif; font-size: 9pt; color: #718096; }
        @bottom-left { content: "Nexa Book - Complete Source Code"; font-family: sans-serif; font-size: 9pt; color: #718096; }
    }
    body { font-family: sans-serif; color: #2d3748; line-height: 1.5; margin: 0; padding: 0; }
    .cover { page-break-after: always; text-align: center; padding-top: 50mm; }
    .cover h1 { font-size: 28pt; color: #1a365d; margin-bottom: 5mm; }
    .cover h2 { font-size: 16pt; color: #4a5568; font-weight: normal; margin-bottom: 20mm; }
    .file-section { page-break-inside: avoid; margin-bottom: 30px; }
    .file-header { background-color: #ebf8ff; border-left: 4px solid #3182ce; padding: 8px 12px; font-family: monospace; font-size: 11pt; font-weight: bold; color: #2b6cb0; margin-bottom: 10px; }
    pre { background-color: #f7fafc; border: 1px solid #e2e8f0; padding: 12px; font-family: monospace; font-size: 9pt; white-space: pre-wrap; word-wrap: break-word; color: #1a202c; }
</style>
</head>
<body>
    <div class="cover">
        <h1>Nexa Book</h1>
        <h2>Complete Source Code Export for Expert Audit</h2>
        <p>Framework: Next.js / TypeScript / Prisma</p>
    </div>
'''
    project_root = os.getcwd()
    file_count = 0

    for root, dirs, files in os.walk(project_root):
        dirs[:] = [d for d in dirs if d not in ignored_dirs]
        for file in files:
            if file.endswith(extensions):
                if file in ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']:
                    continue
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, project_root)
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    escaped_content = content.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    html_content += f'''
                    <div class="file-section">
                        <div class="file-header">FILE: {rel_path}</div>
                        <pre>{escaped_content}</pre>
                    </div>\n'''
                    file_count += 1
                except Exception as e:
                    pass

    html_content += "</body>\n</html>"
    with open("nexabook_project_export.html", "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"Success! Processed {file_count} files and generated 'nexabook_project_export.html'")

if __name__ == '__main__':
    generate_code_report()
