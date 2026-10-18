
import React, { useState } from "react";
import {
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Screen from "../components/Screen";
import FormField from "../components/FormField";
import { C } from "../theme";
import { useSaathi } from "../context/SaathiContext";
import { signup } from "../api";

export default function SignupScreen({ navigation }) {
  const [f, setF] = useState({
    name: "",
    email: "",
    pw: "",
    pw2: "",
  });

  const [e, setE] = useState({});
  const [loading, setLoading] = useState(false);

  const { setCurrentUser } = useSaathi();

  const set = (key) => (value) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    const errors = {};

    if (!f.name.trim()) {
      errors.name = "Please enter your name.";
    }

    if (!f.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    // The backend requires at least 8 characters.
    if (f.pw.length < 8) {
      errors.pw = "Use at least 8 characters.";
    }

    if (f.pw2 !== f.pw) {
      errors.pw2 = "Passwords do not match.";
    }

    setE(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setLoading(true);

      const user = await signup(
        f.name.trim(),
        f.email.trim().toLowerCase(),
        f.pw
      );

      setCurrentUser(user);

      navigation.reset({
        index: 0,
        routes: [{ name: "Dashboard" }],
      });
    } catch (err) {
      setE({
        api: err.message || "Account creation failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Create Account"
      subtitle="Create an account to open your personal dashboard."
      onBack={() => navigation.navigate("Landing")}
      onNext={submit}
      nextLabel={loading ? "Creating account..." : "Create Account"}
    >
      {loading && (
        <ActivityIndicator color={C.teal} style={{ marginBottom: 10 }} />
      )}

      <Text
        style={{
          color: C.grey,
          fontSize: 13,
          marginBottom: 10,
        }}
      >
        Create your personal Saathi account.
      </Text>

      <FormField
        label="Full name"
        value={f.name}
        onChange={(v) => {
          set("name")(v);
          setE((prev) => ({ ...prev, name: "", api: "" }));
        }}
        error={e.name}
      />

      <FormField
        label="Email"
        value={f.email}
        onChange={(v) => {
          set("email")(v);
          setE((prev) => ({ ...prev, email: "", api: "" }));
        }}
        error={e.email}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <FormField
        label="Password"
        value={f.pw}
        onChange={(v) => {
          set("pw")(v);
          setE((prev) => ({ ...prev, pw: "", api: "" }));
        }}
        error={e.pw}
        secureTextEntry
      />

      <FormField
        label="Confirm password"
        value={f.pw2}
        onChange={(v) => {
          set("pw2")(v);
          setE((prev) => ({ ...prev, pw2: "", api: "" }));
        }}
        error={e.pw2}
        secureTextEntry
      />

      {!!e.api && (
        <Text style={{ color: C.red, marginVertical: 8 }}>
          {e.api}
        </Text>
      )}

      <TouchableOpacity
        onPress={() => navigation.navigate("Login")}
        style={{ minHeight: 44, justifyContent: "center" }}
        disabled={loading}
      >
        <Text
          style={{
            color: C.teal,
            fontSize: 17,
            fontWeight: "700",
          }}
        >
          Already have an account? Log in
        </Text>
      </TouchableOpacity>
    </Screen>
  );
}
