import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 18,
          background: "#4f46e5",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          borderRadius: 7,
          fontWeight: 800,
          fontFamily: "sans-serif",
          boxShadow: "0 2px 4px rgba(79, 70, 229, 0.4)",
        }}
      >
        B
      </div>
    ),
    {
      ...size,
    }
  );
}
