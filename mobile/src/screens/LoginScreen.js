
import React, { useState } from "react";
import { Text, TouchableOpacity, ActivityIndicator } from "react-native";
import Screen from "../components/Screen";
import FormField from "../components/FormField";
import { C } from "../theme";
import { useSaathi } from "../context/SaathiContext";
import { login } from "../api";

export default function LoginScreen({ navigation }) {
  const [em, setEm] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { setCurrentUser, t } = useSaathi();

  const submit = async () => {
    if (!em.trim() || !pw) {
      setError("Enter your email and password.");
      return;
    }

    try {
      setError("");
      setLoading(true);

      const user = await login(em.trim().toLowerCase(), pw);

      setCurrentUser(user);

      navigation.reset({
        index: 0,
        routes: [{ name: "Dashboard" }],
      });
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Log In"
      subtitle="Sign in to open your Saathi dashboard."
      onBack={() => navigation.navigate("Landing")}
      onNext={submit}
      nextLabel={loading ? "Logging in..." : "Log In"}
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
        Log in using your registered Saathi account.
      </Text>

      <FormField
        label="Email"
        value={em}
        onChange={(v) => {
          setEm(v);
          setError("");
        }}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <FormField
        label="Password"
        value={pw}
        onChange={(v) => {
          setPw(v);
          setError("");
        }}
        secureTextEntry
      />
      
<TouchableOpacity
  onPress={() => navigation.navigate("ForgotPassword")}
  disabled={loading}
  style={{
    minHeight: 44,
    justifyContent: "left",
    alignSelf: "flex-left",
    marginTop: 10,
    
  }}
>
  <Text
    style={{
      color: C.teal,
      fontSize: 15,
      fontWeight: "700",
    }}
  >
    Forgot password?
  </Text>
</TouchableOpacity>

      {!!error && (
        <Text style={{ color: C.red, marginVertical: 8 }}>
          {error}
        </Text>
      )}

      <TouchableOpacity
        onPress={() => navigation.navigate("Signup")}
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
          New here? Sign up
        </Text>
      </TouchableOpacity>
    </Screen>
  );
}
