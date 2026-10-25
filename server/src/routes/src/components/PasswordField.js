
import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import FormField from "./FormField";

export default function PasswordField(props) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ position: "relative" }}>
      <FormField
        {...props}
        secureTextEntry={!visible}
      />

      <TouchableOpacity
        onPress={() => setVisible((previous) => !previous)}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
        style={{
          position: "absolute",
          right: 12,
          top: 30,
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        <Text style={{ fontSize: 20 }}>
          {visible ? "🙈" : "👁"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
