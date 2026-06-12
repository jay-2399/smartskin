export default function Home() {
  return (
    <main style={{ padding: 48 }}>
      <p
        style={{
          fontFamily: "var(--fm)",
          fontSize: 10,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--accent-d)",
        }}
      >
        SmartSkin · App
      </p>
      <h1 style={{ fontWeight: 800, letterSpacing: "-0.035em", marginTop: 8 }}>
        Fondation prête.
      </h1>
    </main>
  );
}
