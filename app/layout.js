export const metadata = { title: "Asistente de postulaciones" };

const css = `
  * { box-sizing: border-box; }
  body {
    margin: 0 auto;
    padding: 28px 16px 56px;
    max-width: 640px;
    background: #f5f6fa;
    color: #1f2937;
    font-family: -apple-system, system-ui, "Inter", sans-serif;
    line-height: 1.55;
  }
  h1 {
    font-size: 1.9rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0 0 20px;
    color: #111827;
  }
  textarea {
    width: 100%;
    min-height: 120px;
    padding: 14px;
    margin-bottom: 12px;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    font: inherit;
    font-size: 16px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    resize: vertical;
  }
  textarea:focus {
    outline: 2px solid #6366f1;
    border-color: transparent;
  }
  button {
    background: #4f46e5;
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
  hr { border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  details summary { cursor: pointer; color: #4f46e5; font-weight: 600; margin: 8px 0; }
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
