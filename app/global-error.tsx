"use client";

// only when the root layout itself fails: it replaces the whole document, so no app styles or components here
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="es">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          margin: 0,
          padding: 16,
        }}
      >
        <title>Vora Boutique</title>
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <h1>Algo salió mal</h1>
          <p>No se pudo cargar la aplicación.</p>
          <button onClick={() => retry()} style={{ padding: "12px 24px" }}>
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
