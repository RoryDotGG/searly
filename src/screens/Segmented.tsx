import { Pressable, StyleSheet, Text, View } from "react-native";

/** A row of mutually exclusive options. */
export default function Segmented<T extends string>(props: {
  options: readonly { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {props.options.map((o) => {
        const selected = o.value === props.value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: !!props.disabled }}
            disabled={props.disabled}
            onPress={() => props.onChange(o.value)}
            style={[styles.option, selected && styles.selected, props.disabled && styles.disabled]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", borderRadius: 8, backgroundColor: "#e4e4e4", padding: 3, gap: 3 },
  option: { flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: "center" },
  selected: { backgroundColor: "#fff" },
  disabled: { opacity: 0.5 },
  label: { fontSize: 15, color: "#444" },
  selectedLabel: { color: "#000", fontWeight: "600" },
});
