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

import { placePopover, type PopoverPlacement } from './popover-placement';

interface PopoverProps {
  anchor: RefObject<View | null>;
  width: number;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}

export function Popover({ anchor, width, closeLabel, onClose, children }: PopoverProps) {
  const theme = useTheme();
  const [placement, setPlacement] = useState<PopoverPlacement | null>(null);

  const place = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    anchor.current?.measureInWindow((x, y, _anchorWidth, height) =>
      setPlacement(placePopover({ x, y, height }, width, layout)),
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
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        focusable={false}
        style={StyleSheet.absoluteFill}
        onLayout={place}
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
