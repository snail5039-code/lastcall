import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { ComponentProps } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Radius, Tap, ThemeColors, useThemeColors, useThemeStyles } from "../constants/design";

type IconName = ComponentProps<typeof FontAwesome6>["name"];

type Props = {
  icon: IconName;
  title: string;
  description?: string;
  /** 오류는 긴급색, 빈 결과는 중립색으로 칠한다. */
  tone?: "neutral" | "error";
  actionLabel?: string;
  onAction?: () => void;
};

/** 빈 결과·오류를 한 모양으로 보여준다. 막다른 화면이 되지 않게 다음 행동 버튼을 둘 수 있다. */
export function StateView({ icon, title, description, tone = "neutral", actionLabel, onAction }: Props) {
  const Colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const isError = tone === "error";

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, isError && styles.iconCircleError]}>
        <FontAwesome6 name={icon} size={26} color={isError ? Colors.urgent : Colors.navySoft} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.button} onPress={onAction} accessibilityRole="button">
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 44, paddingHorizontal: 28, gap: 10 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.surfaceSunken, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  iconCircleError: { backgroundColor: Colors.urgentBg },
  title: { color: Colors.text, fontSize: 16, fontWeight: "700", textAlign: "center" },
  description: { color: Colors.textMuted, fontSize: 13, lineHeight: 20, textAlign: "center" },
  button: { marginTop: 8, minHeight: Tap.min, paddingHorizontal: 24, borderRadius: Radius.control, backgroundColor: Colors.navy, alignItems: "center", justifyContent: "center" },
  buttonText: { color: Colors.onDark, fontSize: 14, fontWeight: "700" },
});
