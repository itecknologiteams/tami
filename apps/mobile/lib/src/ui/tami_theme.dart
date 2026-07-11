import 'package:flutter/material.dart';

import 'tami_colors.dart';

ThemeData buildTamiTheme() {
  const controlShape = RoundedRectangleBorder(
    borderRadius: BorderRadius.all(Radius.circular(8)),
  );
  const inputBorder = OutlineInputBorder(
    borderRadius: BorderRadius.all(Radius.circular(8)),
    borderSide: BorderSide(color: Color(0xFF9CB5AE)),
  );
  const scheme = ColorScheme.light(
    primary: TamiColors.civicGreen,
    onPrimary: Colors.white,
    secondary: TamiColors.signalYellow,
    onSecondary: TamiColors.ink,
    tertiary: TamiColors.routeCyan,
    onTertiary: Colors.white,
    error: TamiColors.danger,
    onError: Colors.white,
    surface: TamiColors.paper,
    onSurface: TamiColors.ink,
    outline: Color(0xFF78918A),
    outlineVariant: Color(0xFFD2DFDA),
  );

  final base = ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: TamiColors.paper,
    fontFamily: 'Noto Sans',
  );

  return base.copyWith(
    textTheme: base.textTheme.apply(
      bodyColor: TamiColors.ink,
      displayColor: TamiColors.ink,
      fontFamily: 'Noto Sans',
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: TamiColors.paper,
      foregroundColor: TamiColors.ink,
      centerTitle: false,
      elevation: 0,
      scrolledUnderElevation: 0,
    ),
    inputDecorationTheme: const InputDecorationTheme(
      filled: true,
      fillColor: Color(0xF2FFFFFF),
      border: inputBorder,
      enabledBorder: inputBorder,
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.all(Radius.circular(8)),
        borderSide: BorderSide(color: TamiColors.civicGreen, width: 2),
      ),
      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(48, 48),
        backgroundColor: TamiColors.civicGreen,
        foregroundColor: Colors.white,
        shape: controlShape,
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        minimumSize: const Size(48, 48),
        backgroundColor: TamiColors.civicGreen,
        foregroundColor: Colors.white,
        shape: controlShape,
        elevation: 0,
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(48, 48),
        foregroundColor: TamiColors.civicGreen,
        shape: controlShape,
        side: const BorderSide(color: Color(0xFF9CB5AE)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: IconButton.styleFrom(
        minimumSize: const Size(48, 48),
        foregroundColor: TamiColors.ink,
        shape: controlShape,
      ),
    ),
    navigationBarTheme: const NavigationBarThemeData(
      height: 72,
      backgroundColor: Colors.transparent,
      indicatorColor: Color(0xFFD6E9E2),
      labelTextStyle: WidgetStatePropertyAll(
        TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
      ),
    ),
    dividerTheme: const DividerThemeData(color: Color(0xFFD2DFDA)),
  );
}
