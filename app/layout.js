export const metadata = { title: "Asistente de postulaciones" };

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui", margin: "0 auto", padding: 16, maxWidth: 640 }}>
        {children}
      </body>
    </html>
  );
}

