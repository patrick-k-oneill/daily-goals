import { useState, type ReactNode, type RefObject } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { placePopover, type AnchorBox, type WindowSize } from './popover-placement';

interface PopoverProps {
  anchor: RefObject<View | null>;
  width: number;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}

export function Popover({ anchor, width, closeLabel, onClose, children }: PopoverProps) {
  const theme = useTheme();
  const [measured, setMeasured] = useState<{ anchor: AnchorBox; window: WindowSize } | null>(null);
  const placement = measured && placePopover(measured.anchor, width, measured.window);

  const measure = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    anchor.current?.measureInWindow((x, y, _anchorWidth, height) =>
      setMeasured({ anchor: { x, y, height }, window: layout }),
    );
  };

  return (
    <Modal
      transparent
      animationType="fade"
      supportedOrientations={[
        'portrait',
        'portrait-upside-down',
        'landscape-left',
        'landscape-right',
      ]}
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <Pressable
        key={width}
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        focusable={false}
        style={StyleSheet.absoluteFill}
        onLayout={measure}
        onPress={onClose}
      />
      {placement && (
        <View
          style={[
            styles.panel,
            placement,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              boxShadow: `0px 6px 16px ${theme.shadow}`,
            },
          ]}>
          <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  content: {
    padding: Spacing.two,
  },
});
