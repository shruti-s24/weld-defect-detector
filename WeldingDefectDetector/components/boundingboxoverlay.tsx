import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
  const [x1, y1, x2, y2] = bbox;

  const scaleX = displayWidth / imageWidth;
  const scaleY = displayHeight / imageHeight;

  const left: number = x1 * scaleX;
  const top: number = y1 * scaleY;
  const boxWidth: number = (x2 - x1) * scaleX;
  const boxHeight: number = (y2 - y1) * scaleY;

  return (
    <View
      style={[
        styles.box,
        {
          left: left,
          top: top,
          width: boxWidth,
          height: boxHeight,
        },
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#00ffff',
  },
  label: {
    position: 'absolute',
    top: -18,
    left: 0,
    backgroundColor: '#00ffff',
    color: '#000',
    fontSize: 10,
    paddingHorizontal: 4,
  },
});
