'use client';

import dynamic from "next/dynamic";

const BellaiaApp = dynamic(
  () => import("./BellaiaApp"),
  {
    ssr: false,
    loading: () => (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0d0b12",
        color: "#c9a84c",
        fontFamily: "Georgia, serif",
        fontSize: 28,
      }}>
        ◎
      </div>
    ),
  }
);

export default function ClientWrapper() {
  return <BellaiaApp />;
}
