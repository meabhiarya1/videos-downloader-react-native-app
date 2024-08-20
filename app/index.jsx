import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import axios from "axios";

function App() {
  const [inputStates, setInputStates] = useState([""]); // Initialize with one empty input
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState([]); // Track individual errors for each input
  let downloadedVideos = [];
  const connection = "http://localhost:8080"; // Replace with your actual API URL

  const handleDownload = async (url, index) => {
    try {
      const response = await axios.post(`${connection}/download/video`, {
        url,
      });

      const videoName = response.data;
      downloadedVideos.push(videoName);

      // const downloadUrl = `${connection}/downloads/${videoName}`;
      // const videoResponse = await fetch(downloadUrl);
      // const videoBlob = await videoResponse.blob();

      if (!videoBlob.type.startsWith("video/")) {
        throw new Error("Downloaded file is not a video");
      }

      // In React Native, you'll need a different approach to download and save files (e.g., using expo-file-system)
    } catch (error) {
      console.error(`Error downloading video at index ${index + 1}:`, error);
      throw new Error(`Failed to download video at index ${index + 1}`);
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
      // await cleanup();
      setIsLoading(false);
      setInputStates([""]); // Reset input fields after processing
      downloadedVideos = [];
    }
  };

  const handleChange = (value, index) => {
    setInputStates((prevInputs) => {
      const updatedInputs = [...prevInputs];
      updatedInputs[index] = value;
      return updatedInputs;
    });
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "black",
      }}
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
}

export default App;
