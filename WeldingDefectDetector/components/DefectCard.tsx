import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { Defect } from "../types/analysis";

interface DefectCardProps {
  defect: Defect;
}

const DEFECT_COLORS: Record<string, string> = {
  Porosity: "#ff6b6b",
  Crack: "#ff3333",
  Spatters: "#ff9500",
  Undercut: "#ffcc00",
  Overlap: "#ffa500",
  "Burn-through": "#ff0000",
  "Excess Reinforcement": "#ffaa00",
};

export default function DefectCard({ defect }: DefectCardProps) {
  const color = DEFECT_COLORS[defect.type] || "#ff6b6b";

  return (
    <View style={[styles.card, { borderColor: color }]}>
      <Text style={[styles.type, { color }]}>{defect.type}</Text>
      <Text style={styles.confidence}>Confidence: {defect.confidence}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#2a2a2a",
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  type: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 6,
  },
  confidence: {
    fontSize: 14,
    color: "#e0e0e0",
  },
});
