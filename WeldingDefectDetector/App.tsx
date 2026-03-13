import React, { useState } from "react";
import { TextInput } from "react-native";
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
  getUserJobs,
} from "./utils/api";
import socket

hostname = socket.gethostname()
local_ip = socket.gethostbyname(hostname)
// Ensure all image and PDF URLs are absolute
import { Platform } from "react-native";
const API_BASE_URL = `http://${local_ip}:8000`;

function makeAbsoluteUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  // If it's an image in uploads, rewrite to /get-image/
  if (path.includes("uploads/")) {
    const fname = path.split("uploads/")[1];
    return `${API_BASE_URL}/get-image/${fname}`;
  }
  // If it's a PDF in reports, rewrite to /get-pdf/
  if (path.includes("reports/")) {
    const fname = path.split("reports/")[1];
    return `${API_BASE_URL}/get-pdf/${fname}`;
  }
  if (path.startsWith("/")) return `${API_BASE_URL}${path}`;
  return `${API_BASE_URL}/${path}`;
}
import CameraView from "./components/CameraView";
import ResultsView from "./components/ResultsView";
import { AnalysisResult } from "./types/analysis";

// 🔴 REMOVED: generateMockAnalysis
// import { generateMockAnalysis } from './utils/mockAnalysis';

type AppMode =
  | "login"
  | "register"
  | "home"
  | "jobsList"
  | "camera"
  | "results"
  | "jobHistory"
  | "scanDetail"
  | "report";

// 🔁 CHANGE THIS ONLY
const API_URL = "http://10.30.20.215:8000/inspect/image";

export default function App() {
  const [mode, setMode] = useState<AppMode>("login");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(
    null,
  );
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobScans, setJobScans] = useState<any[] | null>(null);
  const [userJobs, setUserJobs] = useState<any[] | null>(null);
    // Fetch all jobs for user
    const fetchUserJobs = async () => {
      if (!userId) return;
      try {
        const jobs = await getUserJobs(userId);
        setUserJobs(jobs);
        setMode("jobsList");
      } catch (err) {
        Alert.alert("Error", "Could not fetch jobs");
      }
    };
  const [selectedScan, setSelectedScan] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  //const [mode, setMode] = useState<AppMode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);


  const API_BASE = "http://10.30.20.215:8000";

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Enter email and password");
      return;
    }

    try {
      setIsLoggingIn(true);
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });
      const data = await response.json();
      if (data.user_id) {
        setUserId(data.user_id);
        setMode("home");
      } else {
        Alert.alert("Login Failed", data.error || "Invalid credentials");
      }
    } catch (err) {
      Alert.alert("Error", "Server not reachable");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Enter email and password");
      return;
    }
    try {
      setIsRegistering(true);
      const response = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });
      const data = await response.json();
      if (data.user_id) {
        Alert.alert("Registration Successful", "You can now log in.");
        setMode("login");
      } else {
        Alert.alert("Registration Failed", data.error || "Could not register");
      }
    } catch (err) {
      Alert.alert("Error", "Server not reachable");
    } finally {
      setIsRegistering(false);
    }
  };


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
        if (!userId) throw new Error('No userId');
        const job = await createJob(userId);
        setJobId(job.job_id);
      }

      const raw = await scanWeld(jobId!, imageUri);
      const results = mapApiResponse(raw);
      console.log(results);
      
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



  if (mode === "login") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
          <Text style={styles.title}>WELD INSPECTOR</Text>
          <TextInput
            placeholder="Email"
            placeholderTextColor="#888"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#888"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.captureButton} onPress={handleLogin}>
            {isLoggingIn ? (
              <ActivityIndicator color="#00ffff" />
            ) : (
              <Text style={styles.captureButtonText}>LOGIN</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.captureButton, { backgroundColor: '#444', marginTop: 10 }]}
            onPress={() => setMode("register")}
          >
            <Text style={styles.captureButtonText}>REGISTER</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (mode === "register") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
          <Text style={styles.title}>Register</Text>
          <TextInput
            placeholder="Email"
            placeholderTextColor="#888"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#888"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.captureButton} onPress={handleRegister}>
            {isRegistering ? (
              <ActivityIndicator color="#00ffff" />
            ) : (
              <Text style={styles.captureButtonText}>REGISTER</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.captureButton, { backgroundColor: '#444', marginTop: 10 }]}
            onPress={() => setMode("login")}
          >
            <Text style={styles.captureButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 📚 JOB HISTORY SCREEN
  if (mode === "jobHistory" && jobScans) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.sectionTitle}>Job Scans</Text>
        <ScrollView>
          {jobScans.map((scan) => (
            <TouchableOpacity
              key={scan.scan_id}
              onPress={() => handleScanDetail(scan.scan_id)}
              style={{ marginBottom: 18 }}
              activeOpacity={0.85}
            >
              <View style={{
                backgroundColor: '#23272e',
                borderRadius: 16,
                padding: 18,
                marginHorizontal: 8,
                shadowColor: '#000',
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 6,
                alignItems: 'center',
              }}>
                {/* Always show image if image_path exists */}
                {scan.image_path && (
                  <Image
                    source={{ uri: makeAbsoluteUrl(scan.image_path) }}
                    style={{
                      width: 280,
                      height: 150,
                      borderRadius: 10,
                      marginBottom: 14,
                      backgroundColor: '#111',
                      borderWidth: 2,
                      borderColor: '#00ffff',
                      shadowColor: '#00ffff',
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                    }}
                    resizeMode="cover"
                  />
                )}
                <Text style={{ color: '#00ffff', fontWeight: 'bold', fontSize: 17, marginBottom: 2 }}>Scan: {scan.scan_id}</Text>
                <Text style={{ color: '#fff', marginTop: 2, fontSize: 15 }}>Defects: {Object.keys(scan.defect_summary).join(", ")}</Text>
                <Text style={{ color: '#aaa', marginTop: 2, fontSize: 12 }}>Timestamp: {scan.timestamp}</Text>
                {/* Always show Download PDF if report_path exists */}
                {scan.report_path && (
                  <TouchableOpacity
                    style={{
                      marginTop: 14,
                      backgroundColor: '#007bff',
                      borderRadius: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 24,
                      alignItems: 'center',
                      width: '100%',
                    }}
                    onPress={() => {
                      const url = makeAbsoluteUrl(scan.report_path);
                      if (url) Linking.openURL(url).catch((e) =>
                        console.error("could not open report url", e),
                      );
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Download PDF</Text>
                  </TouchableOpacity>
                )}
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
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={{
            backgroundColor: '#23272e',
            borderRadius: 18,
            padding: 22,
            margin: 10,
            shadowColor: '#000',
            shadowOpacity: 0.22,
            shadowRadius: 10,
            elevation: 7,
            alignItems: 'center',
          }}>
            <Text style={{ color: '#00ffff', fontWeight: 'bold', fontSize: 19, marginBottom: 6 }}>Scan: {selectedScan.scan_id}</Text>
            <Text style={{ color: '#aaa', fontSize: 13, marginBottom: 8 }}>Timestamp: {selectedScan.timestamp}</Text>
            {(selectedScan.image_path || selectedScan.annotated_image) && (
              <Image
                source={{ uri: makeAbsoluteUrl(selectedScan.image_path || selectedScan.annotated_image) }}
                style={{
                  width: 340,
                  height: 180,
                  borderRadius: 12,
                  marginVertical: 16,
                  backgroundColor: '#111',
                  borderWidth: 2,
                  borderColor: '#00ffff',
                  shadowColor: '#00ffff',
                  shadowOpacity: 0.18,
                  shadowRadius: 10,
                  alignSelf: 'center',
                }}
                resizeMode="cover"
              />
            )}
            <Text style={{ color: '#fff', fontSize: 16, marginBottom: 8 }}>Defects:</Text>
            {Object.entries(selectedScan.defect_summary).map(([d, info]) => (
              <View key={d} style={{
                backgroundColor: '#181c22',
                borderRadius: 8,
                padding: 8,
                marginBottom: 6,
                width: 220,
                alignSelf: 'center',
                alignItems: 'center',
              }}>
                <Text style={{ color: '#00ffff', fontWeight: 'bold', fontSize: 15 }}>{d}</Text>
                <Text style={{ color: '#fff', fontSize: 14 }}>Count: {(info as any).count ?? 0}</Text>
                {info && info.explanation && (
                  <Text style={{ color: '#aaa', fontSize: 13, marginTop: 2 }}>{info.explanation}</Text>
                )}
              </View>
            ))}
            {/* Always show Download PDF if report_path exists */}
            {selectedScan.report_path && (
              <TouchableOpacity
                style={{
                  marginTop: 22,
                  backgroundColor: '#007bff',
                  borderRadius: 10,
                  paddingVertical: 14,
                  paddingHorizontal: 32,
                  alignItems: 'center',
                  width: '100%',
                  alignSelf: 'center',
                }}
                onPress={() => {
                  const url = makeAbsoluteUrl(selectedScan.report_path);
                  if (url) Linking.openURL(url).catch((e) =>
                    console.error("could not open report url", e),
                  );
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Download PDF</Text>
              </TouchableOpacity>
            )}
          </View>
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

  // Jobs List Screen
  if (mode === "jobsList" && userJobs) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.sectionTitle}>My Jobs</Text>
        <ScrollView>
          {userJobs.map((job) => (
            <View key={job.job_id} style={{
              backgroundColor: '#23272e',
              borderRadius: 12,
              padding: 18,
              marginHorizontal: 10,
              marginBottom: 18,
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 6,
              elevation: 4,
            }}>
              <TouchableOpacity
                onPress={async () => {
                  setJobId(job.job_id);
                  // fetch scans for this job
                  try {
                    const resp = await getJobScans(job.job_id);
                    setJobScans(resp.scans);
                    setMode("jobHistory");
                  } catch (err) {
                    Alert.alert("Error", "Could not fetch scans for job");
                  }
                }}
              >
                <Text style={{ color: '#00ffff', fontWeight: 'bold', fontSize: 18 }}>Job: {job.job_id}</Text>
                <Text style={{ color: '#fff', marginTop: 4 }}>Created: {job.created_at}</Text>
                <Text style={{ color: '#aaa', marginTop: 2, fontSize: 12 }}>Scans: {job.scans?.length || 0}</Text>
              </TouchableOpacity>
              {/* PDF Download for job if report_path exists */}
              {job.report_path && (
                <TouchableOpacity
                  style={{ marginTop: 12, backgroundColor: '#007bff', borderRadius: 6, padding: 10, alignItems: 'center' }}
                  onPress={() => {
                    const url = makeAbsoluteUrl(job.report_path);
                    if (url) Linking.openURL(url).catch((e) =>
                      console.error("could not open report url", e),
                    );
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Download PDF</Text>
                </TouchableOpacity>
              )}
            </View>
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
                    if (!userId) return;
                    const job = await createJob(userId);
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

              {/* View My Jobs Button */}
              <TouchableOpacity
                style={styles.captureButton}
                onPress={fetchUserJobs}
              >
                <Text style={styles.captureButtonText}>View My Jobs</Text>
              </TouchableOpacity>

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
    color: "#d0dde9",
    letterSpacing: 3,
    
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    padding:15,
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
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "#00ffff",
    shadowColor: "#aee8e8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
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
    padding:10,
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
    marginTop: 50,
    marginLeft:20
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
    marginBottom: 40,
  },
  reportLink: {
    color: "#00ffff",
    fontSize: 18,
    textAlign: "center",
    marginVertical: 20,
  },
  input: {
    backgroundColor: "#2a2a2a",
    color: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#444",
  },
});
