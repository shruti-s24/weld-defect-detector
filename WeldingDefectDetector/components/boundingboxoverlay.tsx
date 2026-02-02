import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface BoundingBoxProps {
  bbox: number[];
  imageWidth: number;
  imageHeight: number;
  displayWidth: number;
  displayHeight: number;
  label: string;
}

export default function BoundingBoxOverlay({
  bbox,
  imageWidth,
  imageHeight,
  displayWidth,
  displayHeight,
  label,
}: BoundingBoxProps) {
  // require sizes
  if (!imageWidth || !imageHeight || !displayWidth || !displayHeight)
    return null;

  // defensive: bbox may be undefined, malformed, or an object {x,y,w,h}
  if (!bbox) {
    console.warn("BoundingBoxOverlay: empty bbox — skipping");
    return null;
  }

  let coords: number[] | null = null;
  if (Array.isArray(bbox) && bbox.length >= 4) {
    coords = bbox.slice(0, 4).map((v) => Number(v));
  } else {
    // support { x, y, w, h } or { left, top, width, height }
    const b = bbox as any;
    if (
      b &&
      typeof b.x === "number" &&
      typeof b.y === "number" &&
      typeof b.w === "number"
    ) {
      coords = [b.x, b.y, b.x + b.w, b.y + b.w ? b.y + b.h : b.y + b.w].map(
        (v) => Number(v),
      );
    } else if (
      b &&
      typeof b.left === "number" &&
      typeof b.top === "number" &&
      typeof b.width === "number" &&
      typeof b.height === "number"
    ) {
      coords = [b.left, b.top, b.left + b.width, b.top + b.height].map((v) =>
        Number(v),
      );
    } else {
      console.warn("BoundingBoxOverlay: unsupported bbox format:", bbox);
      return null;
    }
  }

  let [x1, y1, x2, y2] = coords;

  // support normalized coordinates (0..1) as well as absolute pixels
  const maxVal = Math.max(x1, y1, x2, y2);
  if (maxVal <= 1) {
    x1 *= imageWidth;
    x2 *= imageWidth;
    y1 *= imageHeight;
    y2 *= imageHeight;
  }

  // clamp
  x1 = Math.max(0, Math.min(x1, imageWidth));
  x2 = Math.max(0, Math.min(x2, imageWidth));
  y1 = Math.max(0, Math.min(y1, imageHeight));
  y2 = Math.max(0, Math.min(y2, imageHeight));

  const scaleX = displayWidth / imageWidth;
  const scaleY = displayHeight / imageHeight;

  const left = x1 * scaleX;
  const top = y1 * scaleY;
  const boxWidth = Math.max(1, (x2 - x1) * scaleX);
  const boxHeight = Math.max(1, (y2 - y1) * scaleY);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.box,
        {
          left,
          top,
          width: boxWidth,
          height: boxHeight,
          zIndex: 10,
        },
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#00ffff",
    borderRadius: 4,
  },
  label: {
    position: "absolute",
    top: -18,
    left: 0,
    backgroundColor: "#00ffff",
    color: "#000",
    fontSize: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
