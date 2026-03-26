import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "#0f0e0c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color: "#c8843a",
            fontSize: 20,
            fontWeight: 700,
            fontFamily: "serif",
            lineHeight: 1,
          }}
        >
          b
        </span>
      </div>
    ),
    { ...size }
  );
}
