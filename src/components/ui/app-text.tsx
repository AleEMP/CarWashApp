import { Text, type TextProps } from 'react-native';

import { colors, fontSize, fonts } from '@/theme';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'display';

export type AppTextProps = TextProps & {
  weight?: Weight;
  size?: number;
  color?: keyof typeof colors;
};

export function AppText({ weight = 'medium', size = fontSize.body, color = 'text', style, ...rest }: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[{ fontFamily: fonts[weight], fontSize: size, lineHeight: Math.round(size * 1.4), color: colors[color] }, style]}
    />
  );
}
