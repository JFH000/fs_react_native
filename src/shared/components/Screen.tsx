import { SafeAreaView } from "react-native-safe-area-context";
import type { PropsWithChildren } from "react";

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900" testID="screen-root">
      {children}
    </SafeAreaView>
  );
}
