
import React, { useState } from "react";
import {
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import Screen from "../components/Screen";
import FormField from "../components/FormField";
import GoogleButton from "../components/GoogleButton";
import PasswordField from "../components/PasswordField";
import { C } from "../theme";
import { useSaathi } from "../context/SaathiContext";
import { signup, verifySignup } from "../api";

export default function SignupScreen({ navigation }) {
  const [f, setF] = useState({
    name: "",
    email: "",
    pw: "",
    pw2: "",
    otp: "",
  });

  const [step, setStep] = useState("details");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setCurrentUser, t } = useSaathi();

  const set = (key) => (value) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setError("");

    if (step === "details") {
      if (!f.name.trim()) {
        setError(t("Please enter your name."));
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
        setError(t("Enter a valid email address."));
        return;
      }

      if (f.pw.length < 8) {
        setError(t("Use at least 8 characters for your password."));
        return;
      }

      if (f.pw !== f.pw2) {
        setError(t("Passwords do not match."));
        return;
      }

      try {
        setLoading(true);

        await signup(
          f.name.trim(),
          f.email.trim().toLowerCase(),
          f.pw
        );

        setStep("otp");
      } catch (err) {
        setError(err.message || t("Could not send the verification code."));
      } finally {
        setLoading(false);
      }

      return;
    }

    if (!/^\d{6}$/.test(f.otp.trim())) {
      setError(t("Enter the 6-digit code sent to your email."));
      return;
    }

    try {
      setLoading(true);

      const user = await verifySignup(
        f.email.trim().toLowerCase(),
        f.otp.trim()
      );

      setCurrentUser(user);

      navigation.reset({
        index: 0,
        routes: [{ name: "Dashboard" }],
      });
    } catch (err) {
      setError(err.message || t("Verification failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title={step === "details" ? t("Create Account") : t("Verify Email")}
      subtitle={
        step === "details"
          ? t("Create your personal Saathi account.")
          : `${t("Enter the 6-digit code sent to your email.")} ${f.email}.`
      }
      onBack={() => {
        if (step === "otp") {
          setStep("details");
          setError("");
        } else {
          navigation.navigate("Landing");
        }
      }}
      onNext={submit}
      footer={
        step === "details" ? (
          <GoogleButton
            label="Sign up with Google"
            disabled={loading}
            onError={setError}
            onSuccess={(user) => {
        setCurrentUser(user);
        navigation.reset({ index: 0, routes: [{ name: "Dashboard" }] });
      }}
          />
        ) : null
      }
      nextLabel={
        loading
          ? t("Please wait...")
          : step === "details"
            ? t("Send Verification Code")
            : t("Verify & Create Account")
      }
    >
      {loading && (
        <ActivityIndicator color={C.teal} style={{ marginBottom: 10 }} />
      )}

      {step === "details" ? (
        <>
          <FormField
            label={t("Full name")}
            value={f.name}
            onChange={(v) => {
              set("name")(v);
              setError("");
            }}
            error=""
          />

          <FormField
            label={t("Email")}
            value={f.email}
            onChange={(v) => {
              set("email")(v);
              setError("");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <PasswordField
            label={t("Password")}
            value={f.pw}
            onChange={(v) => {
              set("pw")(v);
              setError("");
            }}
          />

          <PasswordField
            label={t("Confirm password")}
            value={f.pw2}
            onChange={(v) => {
              set("pw2")(v);
              setError("");
            }}
          />
        </>
      ) : (
        <>
          <FormField
            label={t("Email verification code")}
            value={f.otp}
            onChange={(v) => {
              set("otp")(v.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            keyboardType="number-pad"
            autoCapitalize="none"
          />

          <TouchableOpacity
            onPress={() => {
              setStep("details");
              set("otp")("");
              setError("");
            }}
            disabled={loading}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={{ color: C.teal, fontWeight: "700" }}>
              {t("Change email or account details")}
            </Text>
          </TouchableOpacity>
        </>
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
        <Text style={{ color: C.teal, fontSize: 16, fontWeight: "700" }}>
          {t("Already have an account? Log in")}
        </Text>
      </TouchableOpacity>
    </Screen>
  );
}
