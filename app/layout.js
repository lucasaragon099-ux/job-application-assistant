export const metadata = { title: "Job Application Assistant" };

const css = `
  * { box-sizing: border-box; }
  :root {
    color-scheme: light dark;
    --bg: #f5f6fa; --card: #ffffff; --text: #1f2937; --muted: #6b7280;
    --border: #e5e7eb; --input: #f9fafb; --primary: #4f46e5; --title: #111827;
    --soft: #f5f6fa;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f1117; --card: #1a1d27; --text: #e5e7eb; --muted: #9ca3af;
      --border: #2a2e3b; --input: #141720; --primary: #6366f1; --title: #f9fafb;
      --soft: #141720;
    }
  }
  body {
    margin: 0 auto;
    padding: 20px 16px 56px;
    max-width: 640px;
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, system-ui, "Inter", sans-serif;
    line-height: 1.55;
  }
  textarea, input[type="password"] {
    width: 100%;
    padding: 14px;
    margin-bottom: 10px;
    background: var(--input);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 14px;
    font: inherit;
    font-size: 16px;
    resize: vertical;
  }
  textarea { min-height: 90px; }
  textarea:focus, input[type="password"]:focus {
    outline: 2px solid #6366f1;
    border-color: transparent;
  }
  button {
    background: var(--primary);
    color: #fff;
    border: 0;
    border-radius: 12px;
    padding: 12px 18px;
    font-size: 16px;
    font-weight: 600;
    font-family: inherit;
  }
  button:active { transform: scale(0.97); }
  button:disabled { opacity: 0.6; }
  form > button { width: 100%; }
  details summary { cursor: pointer; color: var(--primary); font-weight: 600; margin: 8px 0; }
`;

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        {children}
      </body>
    </html>
  );
}
