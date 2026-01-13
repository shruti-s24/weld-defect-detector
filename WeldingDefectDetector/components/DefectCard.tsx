import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Defect, DefectSeverity } from '../types/analysis';

interface DefectCardProps {
  defect: Defect;
}

const DEFECT_COLORS: Record<string, string> = {
  Porosity: '#ff6b6b',
  Cracks: '#ff3333',
  'Incomplete Fusion': '#ffa500',
  Undercut: '#ffcc00',
  Spatter: '#ff9500',
};

export default function DefectCard({ defect }: DefectCardProps) {
  const defectColor = DEFECT_COLORS[defect.type] || '#ff6b6b';

  const getSeverityLabel = (severity: DefectSeverity): string => {
    if (severity === 'Critical') return '⚠️ CRITICAL';
    if (severity === 'High') return '⚠ HIGH';
    if (severity === 'Medium') return '⚡ MEDIUM';
    return '• LOW';
  };

  return (
    <View style={[styles.card, { borderColor: defectColor }]}>
      <View style={styles.header}>
        <Text style={[styles.type, { color: defectColor }]}>{defect.type}</Text>
        <Text style={[styles.severity, { color: defectColor }]}>
          {getSeverityLabel(defect.severity)}
        </Text>
      </View>

      <Text style={styles.description}>{defect.description}</Text>

      <View style={styles.footer}>
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>Confidence</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${defect.confidence}%`, backgroundColor: defectColor },
              ]}
            />
          </View>
          <Text style={styles.confidenceValue}>{defect.confidence}%</Text>
        </View>

        {defect.location && (
          <View style={styles.location}>
            <Text style={styles.locationLabel}>📍 {defect.location}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  type: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  severity: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  description: {
    fontSize: 14,
    color: '#b0b0b0',
    marginBottom: 15,
    lineHeight: 20,
  },
  footer: {
    gap: 12,
  },
  confidenceContainer: {
    gap: 5,
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#808080',
    textTransform: 'uppercase',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceValue: {
    fontSize: 12,
    color: '#e0e0e0',
    fontWeight: '600',
  },
  location: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#3a3a3a',
  },
  locationLabel: {
    fontSize: 12,
    color: '#a0a0a0',
  },
});