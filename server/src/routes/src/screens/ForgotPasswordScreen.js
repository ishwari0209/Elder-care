
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
        setError(t("Enter a valid email address."));
        return;
      }

      try {
        setLoading(true);
        const result = await forgotPassword(email.trim().toLowerCase());
        setMessage(result.message);
        setStep("reset");
      } catch (err) {
        setError(err.message || t("Could not request a reset code."));
      } finally {
        setLoading(false);
      }

      return;
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      setError(t("Enter the 6-digit code."));
      return;
    }

    if (password.length < 8) {
      setError(t("Use at least 8 characters for your new password."));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("Passwords do not match."));
      return;
    }

    try {
      setLoading(true);

      const result = await resetPassword(
        email.trim().toLowerCase(),
        otp.trim(),
        password
      );

      setMessage(t("Password reset successfully. Please log in with your new password."));
      setStep("done");
    } catch (err) {
      setError(err.message || t("Could not reset your password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title={t("Forgot Password")}
      subtitle={
        step === "email"
          ? t("Enter your registered email to receive a reset code.")
          : step === "done" ? t("Password reset successfully. Please log in with your new password.") : t("Enter the code from your email and choose a new password.")
      }
      onBack={() => navigation.navigate("Login")}
      onNext={step === "done" ? () => navigation.navigate("Login") : submit}
      nextLabel={
        loading
          ? t("Please wait...")
          : step === "email"
            ? t("Send Reset Code")
            : step === "done" ? t("Back to Log In") : t("Reset Password")
      }
    >
      {loading && (
        <ActivityIndicator color={C.teal} style={{ marginBottom: 10 }} />
      )}

      <FormField
        label={t("Email")}
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
            label={t("6-digit verification code")}
            value={otp}
            onChange={(v) => {
              setOtp(v.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            keyboardType="number-pad"
          />

          <PasswordField
            label={t("New password")}
            value={password}
            onChange={(v) => {
              setPassword(v);
              setError("");
            }}
          />

          <PasswordField
            label={t("Confirm new password")}
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
          {t("Back to Log In")}
        </Text>
      </TouchableOpacity>
    </Screen>
  );
}
