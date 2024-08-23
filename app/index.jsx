import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import axios from "axios";
import * as FileSystem from "expo-file-system";
import { shareAsync } from "expo-sharing";
import { Platform } from "react-native";

const App = () => {
  const [inputStates, setInputStates] = useState([""]); // Initialize with one empty input
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState([]); // Track individual errors for each input
  const [refreshing, setRefreshing] = useState(false);
  const connection = "http://192.168.1.31:8080"; // Replace with your actual API URL

  const handleDownload = async (url, index) => {
    try {
      // Step 1: Download the video file
      const response = await axios.post(`${connection}/download/video`, {
        url,
      });
      const videoName = response.data.file;
      const downloadUrl = `${connection}/downloads/${videoName}`;

      const result = await FileSystem.downloadAsync(
        downloadUrl,
        FileSystem.documentDirectory + videoName
      );
      console.log("Video downloaded to:", result.uri);
      save(result.uri, videoName, result.headers["Content-Type"]);
      Alert.alert("Success", "Video downloaded and saved successfully!");
    } catch (error) {
      console.error(`Error downloading video at index ${index + 1}:`, error);
      setErrorDetails((prev) => [...prev, { index, message: error.message }]);
    }
  };

  const save = async (uri, filename, mimetype) => {
    if (Platform.OS === "android") {
      const permissions =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          filename,
          mimetype
        )
          .then(async (uri) => {
            await FileSystem.writeAsStringAsync(uri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
          })
          .catch((e) => console.log(e));
      } else {
        shareAsync(uri);
      }
    } else {
      shareAsync(uri);
    }
  };

  const downloadAll = async (e) => {
    e.preventDefault();
    setError("");
    setErrorDetails([]);
    setIsLoading(true);

    try {
      const downloadPromises = inputStates.map((link, index) =>
        handleDownload(link, index).catch((err) => {
          setErrorDetails((prev) => [...prev, { index, message: err.message }]);
        })
      );
      await Promise.all(downloadPromises);

      if (errorDetails.length > 0) {
        setError("Some downloads failed. Please check the individual errors.");
      }
    } catch (error) {
      console.error("Error during download all:", error);
      setError("An error occurred during the download. Please try again.");
    } finally {
      setIsLoading(false);
      setInputStates([""]); // Reset input fields after processing
    }
  };

  const handleChange = (value, index) => {
    setInputStates((prevInputs) => {
      const updatedInputs = [...prevInputs];
      updatedInputs[index] = value;
      return updatedInputs;
    });
  };

  // Refresh function to reload content
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Refresh logic, e.g., re-fetching data or resetting states
      setInputStates([""]); // Reset input fields or perform other refresh actions
      setError("");
      setErrorDetails([]);
    } catch (error) {
      console.error("Error refreshing content:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "black",
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#4F46E5"]} // Customize the refresh control color
        />
      }
    >
      <View
        style={{
          width: "90%",
          maxWidth: 600,
          padding: 20,
          backgroundColor: "#374151",
          borderRadius: 10,
        }}
      >
        <Text
          style={{
            marginBottom: 20,
            color: "white",
            textAlign: "center",
            fontSize: 18,
          }}
        >
          Paste Video Link...
        </Text>

        {inputStates.map((link, index) => (
          <View key={index} style={{ marginBottom: 10 }}>
            <TextInput
              style={{
                borderColor: "#4B5563",
                borderWidth: 1,
                borderRadius: 5,
                padding: 10,
                color: "white",
                backgroundColor: "#1F2937",
              }}
              placeholder="Paste link here..."
              placeholderTextColor="#9CA3AF"
              value={link}
              onChangeText={(text) => handleChange(text, index)}
              editable={!isLoading}
            />
            {errorDetails.some((err) => err.index === index) && (
              <Text style={{ color: "red", marginTop: 5 }}>
                {errorDetails.find((err) => err.index === index).message}
              </Text>
            )}
          </View>
        ))}

        <TouchableOpacity
          style={{
            backgroundColor: "#4F46E5",
            padding: 15,
            borderRadius: 5,
            alignItems: "center",
            marginBottom: 10,
          }}
          onPress={() => setInputStates((prevInputs) => [...prevInputs, ""])}
          disabled={isLoading}
        >
          <Text style={{ color: "white" }}>More Link</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: "#4F46E5",
            padding: 15,
            borderRadius: 5,
            alignItems: "center",
            marginBottom: 10,
          }}
          onPress={downloadAll}
          disabled={
            isLoading || inputStates.every((input) => input.trim() === "")
          }
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white" }}>Download</Text>
          )}
        </TouchableOpacity>

        {error && <Text style={{ color: "red", marginTop: 10 }}>{error}</Text>}
      </View>
    </ScrollView>
  );
};

export default App;
