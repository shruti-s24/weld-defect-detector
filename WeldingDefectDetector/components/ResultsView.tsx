import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
} from "react-native";
import DefectCard from "./DefectCard";
import { AnalysisResult } from "../types/analysis";
import BoundingBoxOverlay from "./boundingboxoverlay";

interface ResultsViewProps {
  results: AnalysisResult;
  imageUri?: string | null;
  onNewScan: () => void;
}

export default function ResultsView({
  results,
  imageUri,
  onNewScan,
}: ResultsViewProps) {
  const statusColor = results.status === "PASS" ? "#39ff14" : "#ff3333";
  const statusBg =
    results.status === "PASS"
      ? "rgba(57, 255, 20, 0.1)"
      : "rgba(255, 51, 51, 0.1)";
  const [imageSize, setImageSize] = React.useState({
    width: 0,
    height: 0,
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ANALYSIS RESULTS</Text>
        </View>

        {/* Captured Image */}
        {imageUri && (
          <View style={styles.imageContainer}>
            <View style={styles.imageWrapper}>
              <Image source={{ uri: imageUri }} style={styles.image} />

              {imageSize.width > 0 &&
                results.defects.map((defect, index) => (
                  <BoundingBoxOverlay
                    key={index}
                    bbox={defect.bbox}
                    imageWidth={imageSize.width}
                    imageHeight={imageSize.height}
                    displayWidth={DISPLAY_WIDTH}
                    displayHeight={DISPLAY_HEIGHT}
                    label={defect.type}
                  />
                ))}
            </View>
          </View>
        )}

        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusBg, borderColor: statusColor },
          ]}
        >
          <Text style={[styles.statusText, { color: statusColor }]}>
            {results.status}
          </Text>
          <Text style={styles.statusSubtext}>
            Confidence: {results.confidence}%
          </Text>
        </View>

        {/* Defects Section */}
        {results.defects.length > 0 && (
          <View style={styles.defectsSection}>
            <Text style={styles.sectionTitle}>DETECTED DEFECTS</Text>
            {results.defects.map((defect, index) => (
              <DefectCard key={index} defect={defect} />
            ))}
          </View>
        )}

        {/* No Defects Message */}
        {results.defects.length === 0 && (
          <View style={styles.noDefectsContainer}>
            <Text style={styles.noDefectsText}>✓ No defects detected</Text>
            <Text style={styles.noDefectsSubtext}>
              Weld quality is excellent
            </Text>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.metadata}>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Scan ID:</Text>
            <Text style={styles.metadataValue}>{results.scanId}</Text>
          </View>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Timestamp:</Text>
            <Text style={styles.metadataValue}>{results.timestamp}</Text>
          </View>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Processing Time:</Text>
            <Text style={styles.metadataValue}>{results.processingTime}</Text>
          </View>
        </View>

        {/* New Scan Button */}
        <TouchableOpacity style={styles.newScanButton} onPress={onNewScan}>
          <Text style={styles.newScanButtonText}>NEW SCAN</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#00ffff",
    letterSpacing: 2,
  },
  imageContainer: {
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#00ffff",
  },
  image: {
    width: "100%",
    height: 250,
    resizeMode: "cover",
  },
  statusBadge: {
    padding: 20,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: "center",
    marginBottom: 20,
  },
  statusText: {
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  statusSubtext: {
    fontSize: 14,
    color: "#a0a0a0",
    marginTop: 5,
  },
  defectsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#00ffff",
    marginBottom: 15,
    letterSpacing: 1,
  },
  noDefectsContainer: {
    backgroundColor: "rgba(57, 255, 20, 0.1)",
    borderWidth: 2,
    borderColor: "#39ff14",
    borderRadius: 15,
    padding: 30,
    alignItems: "center",
    marginBottom: 20,
  },
  noDefectsText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#39ff14",
  },
  noDefectsSubtext: {
    fontSize: 14,
    color: "#a0a0a0",
    marginTop: 5,
  },
  metadata: {
    backgroundColor: "#2a2a2a",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#3a3a3a",
  },
  metadataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  metadataLabel: {
    fontSize: 14,
    color: "#a0a0a0",
  },
  metadataValue: {
    fontSize: 14,
    color: "#e0e0e0",
    fontWeight: "600",
  },
  newScanButton: {
    backgroundColor: "#00ffff",
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 20,
  },
  newScanButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
    letterSpacing: 2,
  },
  imageWrapper: {
    position: "relative",
    width: 300,
    height: 300,
    alignSelf: "center",
  },
});
