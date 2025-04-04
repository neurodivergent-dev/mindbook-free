// This file is contains SVG Mindbook Logo
import Svg, { Path } from 'react-native-svg';

export const Logo = ({ size = 120, color = '#000', style }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" style={style}>
      {/* Book Shape - Full Screen */}
      <Path
        d="M20 20C20 15 25 10 30 10H90C95 10 100 15 100 20V100C100 105 95 110 90 110H30C25 110 20 105 20 100V20Z"
        fill={color}
        opacity="1"
      />

      {/* Book Pages */}
      <Path
        d="M25 20C25 17 27 15 30 15H90C93 15 95 17 95 20V95C95 98 93 100 90 100H30C27 100 25 98 25 95V20Z"
        fill="#FFFFFF"
        opacity="0.2"
      />

      {/* Letter M */}
      <Path d="M35 40H42L60 65L78 40H85V80H78V52L60 77L42 52V80H35V40Z" fill="#FFFFFF" />
    </Svg>
  );
};
