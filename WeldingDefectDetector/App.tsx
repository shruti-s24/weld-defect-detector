import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
} from "react-native";
import {
  mapApiResponse,
  createJob,
  scanWeld,
  getJobScans,
  getScan,
  generateJobReport,
} from "./utils/api";
import CameraView from "./components/CameraView";
import ResultsView from "./components/ResultsView";
import { AnalysisResult } from "./types/analysis";

// 🔴 REMOVED: generateMockAnalysis
// import { generateMockAnalysis } from './utils/mockAnalysis';

type AppMode =
  | "home"
  | "camera"
  | "results"
  | "jobHistory"
  | "scanDetail"
  | "report";

// 🔁 CHANGE THIS ONLY
const API_URL = "http://192.168.0.102:8000/inspect/image";

export default function App() {
  const [mode, setMode] = useState<AppMode>("home");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(
    null,
  );
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobScans, setJobScans] = useState<any[] | null>(null);
  const [selectedScan, setSelectedScan] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleCapture = async (imageUri: string) => {
    setCapturedImage(imageUri);
    setMode("home");
    await analyzeImage(imageUri);
  };

  // 🧠 REAL API ANALYSIS — UI FLOW UNCHANGED
  const analyzeImage = async (imageUri: string) => {
    setIsAnalyzing(true);

    try {
      if (!jobId) {
        // create a job when first scan is triggered
        const job = await createJob();
        setJobId(job.job_id);
      }

      const raw = await scanWeld(jobId!, imageUri);
      const results = mapApiResponse(raw);

      setAnalysisResults(results);
      setMode("results");
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Analysis Failed",
        "Could not analyze image. Please try again.",
      );
      setMode("home");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewScan = () => {
    setCapturedImage(null);
    setAnalysisResults(null);
    setMode("home");
  };

  const fetchHistory = async () => {
    if (!jobId) return;
    try {
      const resp = await getJobScans(jobId);
      setJobScans(resp.scans);
      setMode("jobHistory");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not fetch history");
    }
  };

  const handleScanDetail = async (scanId: string) => {
    try {
      const scan = await getScan(scanId);
      setSelectedScan(scan);
      setMode("scanDetail");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Unable to load scan details");
    }
  };

  const handleGenerateReport = async () => {
    if (!jobId) return;
    try {
      const resp = await generateJobReport(jobId);
      Alert.alert("Report", resp.message);
      setMode("report");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to generate report");
    }
  };

  // 📸 CAMERA MODE
  if (mode === "camera") {
    return (
      <CameraView onCapture={handleCapture} onClose={() => setMode("home")} />
    );
  }

  // 📊 RESULTS MODE
  if (mode === "results" && analysisResults) {
    return (
      <ResultsView
        results={analysisResults}
        imageUri={capturedImage}
        onNewScan={handleNewScan}
      />
    );
  }

  // 📚 JOB HISTORY SCREEN
  if (mode === "jobHistory" && jobScans) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.sectionTitle}>Job History</Text>
        <ScrollView>
          {jobScans.map((scan) => (
            <TouchableOpacity
              key={scan.scan_id}
              onPress={() => handleScanDetail(scan.scan_id)}
            >
              <View style={styles.historyItem}>
                {scan.annotated_image && (
                  <Image
                    source={{ uri: scan.annotated_image }}
                    style={styles.historyThumbnail}
                  />
                )}
                <Text>Scan: {scan.scan_id}</Text>
                <Text>
                  Defects: {Object.keys(scan.defect_summary).join(", ")}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setMode("home")}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // 🔍 SCAN DETAIL SCREEN
  if (mode === "scanDetail" && selectedScan) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.sectionTitle}>Scan Detail</Text>
        <ScrollView>
          <Text>ID: {selectedScan.scan_id}</Text>
          <Text>Timestamp: {selectedScan.timestamp}</Text>
          <Text>Defects:</Text>
          {Object.entries(selectedScan.defect_summary).map(([d, info]) => (
            <View key={d} style={styles.historyItem}>
              <Text>
                {d} x {info.count}
              </Text>
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setMode("jobHistory")}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // 📄 REPORT SCREEN
  if (mode === "report") {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.sectionTitle}>Report</Text>
        {jobId && (
          <TouchableOpacity
            onPress={() => {
              const url = `${API_URL.replace("/inspect/image", "")}/job/${jobId}/report/download`;
              Linking.openURL(url).catch((e) =>
                console.error("could not open report url", e),
              );
            }}
          >
            <Text style={styles.reportLink}>Download PDF</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setMode("home")}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // 🏠 HOME SCREEN
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>WELD INSPECTOR</Text>
          <Text style={styles.subtitle}>AI-Powered Defect Detection</Text>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {isAnalyzing ? (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color="#00ffff" />
              <Text style={styles.analyzingText}>Analyzing Weld...</Text>
              <Text style={styles.analyzingSubtext}>
                AI is processing your image
              </Text>
            </View>
          ) : (
            <>
              {/* Job controls */}
              {jobId ? (
                <View style={styles.jobInfo}>
                  <Text style={styles.jobText}>Job: {jobId}</Text>
                  <TouchableOpacity onPress={fetchHistory}>
                    <Text style={styles.jobLink}>View History</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleGenerateReport}>
                    <Text style={styles.jobLink}>Generate Report</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={async () => {
                    const job = await createJob();
                    setJobId(job.job_id);
                    setMode("camera");
                  }}
                >
                  <View style={styles.captureButtonInner}>
                    <Text style={styles.captureButtonText}>START JOB</Text>
                    <Text style={styles.captureButtonSubtext}>
                      Tap to begin session
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Capture Button */}
              <TouchableOpacity
                style={styles.captureButton}
                onPress={() => setMode("camera")}
              >
                <View style={styles.captureButtonInner}>
                  <Text style={styles.captureButtonText}>CAPTURE WELD</Text>
                  <Text style={styles.captureButtonSubtext}>
                    Tap to open camera
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Info Cards */}
              <View style={styles.infoGrid}>
                <View style={styles.infoCard}>
                  <Text style={styles.infoNumber}>5+</Text>
                  <Text style={styles.infoLabel}>Defect Types</Text>
                </View>
                <View style={styles.infoCard}>
                  <Text style={styles.infoNumber}>AI</Text>
                  <Text style={styles.infoLabel}>Powered</Text>
                </View>
              </View>

              {/* Detectable Defects */}
              <View style={styles.defectsSection}>
                <Text style={styles.sectionTitle}>DETECTABLE DEFECTS</Text>
                {[
                  "Burn-through",
                  "Crack",
                  "Excess Reinforcement",
                  "Overlap",
                  "Porosity",
                  "Spatters",
                  "Undercut",
                ].map((defect, index) => (
                  <View key={index} style={styles.defectItem}>
                    <View style={styles.defectDot} />
                    <Text style={styles.defectText}>{defect}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// 🔒 STYLES — 100% UNCHANGED
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#00ffff",
    letterSpacing: 3,
    textShadowColor: "#00ffff",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#a0a0a0",
    marginTop: 8,
    letterSpacing: 1,
  },
  mainContent: {
    flex: 1,
  },
  captureButton: {
    backgroundColor: "#2a2a2a",
    borderRadius: 20,
    padding: 4,
    marginBottom: 30,
    borderWidth: 2,
    borderColor: "#00ffff",
    shadowColor: "#00ffff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  captureButtonInner: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    paddingVertical: 40,
    alignItems: "center",
  },
  captureButtonText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#00ffff",
    letterSpacing: 2,
  },
  captureButtonSubtext: {
    fontSize: 14,
    color: "#a0a0a0",
    marginTop: 8,
  },
  analyzingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  analyzingText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#00ffff",
    marginTop: 20,
  },
  analyzingSubtext: {
    fontSize: 14,
    color: "#a0a0a0",
    marginTop: 8,
  },
  infoGrid: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 30,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3a3a3a",
  },
  infoNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#39ff14",
  },
  infoLabel: {
    fontSize: 12,
    color: "#a0a0a0",
    marginTop: 5,
    textTransform: "uppercase",
  },
  defectsSection: {
    backgroundColor: "#2a2a2a",
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: "#3a3a3a",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#00ffff",
    marginBottom: 15,
    letterSpacing: 1,
  },
  defectItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  defectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#39ff14",
    marginRight: 12,
  },
  defectText: {
    fontSize: 16,
    color: "#e0e0e0",
  },
  jobInfo: {
    marginBottom: 20,
    alignItems: "center",
  },
  jobText: {
    color: "#ffffff",
    marginBottom: 4,
  },
  jobLink: {
    color: "#00ffff",
    textDecorationLine: "underline",
    marginVertical: 2,
  },
  historyItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#333",
    flexDirection: "row",
    alignItems: "center",
  },
  historyThumbnail: {
    width: 50,
    height: 50,
    marginRight: 10,
    borderRadius: 4,
  },
  backButton: {
    marginTop: 20,
    alignSelf: "center",
  },
  backText: {
    color: "#00ffff",
    fontSize: 16,
  },
  reportLink: {
    color: "#00ffff",
    fontSize: 18,
    textAlign: "center",
    marginVertical: 20,
  },
});
