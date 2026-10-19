
import React, { useState } from "react";
import {
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import Screen from "../components/Screen";
import FormField from "../components/FormField";
import PasswordField from "../components/PasswordField";
import { C } from "../theme";
import { useSaathi } from "../context/SaathiContext";
import { forgotPassword, resetPassword } from "../api";

export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useSaathi();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState("email");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setMessage("");

    if (step === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError("Enter a valid email address.");
        return;
      }

      try {
        setLoading(true);
        const result = await forgotPassword(email.trim().toLowerCase());
        setMessage(result.message);
        setStep("reset");
      } catch (err) {
        setError(err.message || "Could not request a reset code.");
      } finally {
        setLoading(false);
      }

      return;
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit code.");
      return;
    }

    if (password.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const result = await resetPassword(
        email.trim().toLowerCase(),
        otp.trim(),
        password
      );

      setMessage(result.message);
      navigation.navigate("Login");
    } catch (err) {
      setError(err.message || "Could not reset your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Forgot Password"
      subtitle={
        step === "email"
          ? "Enter your registered email to receive a reset code."
          : "Enter the code from your email and choose a new password."
      }
      onBack={() => navigation.navigate("Login")}
      onNext={submit}
      nextLabel={
        loading
          ? "Please wait..."
          : step === "email"
            ? "Send Reset Code"
            : "Reset Password"
      }
    >
      {loading && (
        <ActivityIndicator color={C.teal} style={{ marginBottom: 10 }} />
      )}

      <FormField
        label="Email"
        value={email}
        onChange={(v) => {
          setEmail(v);
          setError("");
        }}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {step === "reset" && (
        <>
          <FormField
            label="6-digit verification code"
            value={otp}
            onChange={(v) => {
              setOtp(v.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            keyboardType="number-pad"
          />

          <PasswordField
            label="New password"
            value={password}
            onChange={(v) => {
              setPassword(v);
              setError("");
            }}
          />

          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            onChange={(v) => {
              setConfirmPassword(v);
              setError("");
            }}
          />
        </>
      )}

      {!!message && (
        <Text style={{ color: C.teal, marginVertical: 8 }}>
          {message}
        </Text>
      )}

      {!!error && (
        <Text style={{ color: C.red, marginVertical: 8 }}>
          {error}
        </Text>
      )}

      <TouchableOpacity
        onPress={() => navigation.navigate("Login")}
        disabled={loading}
        style={{ minHeight: 44, justifyContent: "center" }}
      >
        <Text style={{ color: C.teal, fontWeight: "700" }}>
          Back to Log In
        </Text>
      </TouchableOpacity>
    </Screen>
  );
}
