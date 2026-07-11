import 'dart:ui';

import 'package:flutter/material.dart';

import 'tami_colors.dart';

enum TamiGlassLevel { navigation, action, darkStatus }

class TamiGlass extends StatelessWidget {
  const TamiGlass({
    required this.child,
    this.level = TamiGlassLevel.action,
    this.padding = const EdgeInsets.all(16),
    this.borderRadius = 8,
    this.semanticLabel,
    super.key,
  });

  final Widget child;
  final TamiGlassLevel level;
  final EdgeInsetsGeometry padding;
  final double borderRadius;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final reducedEffects = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    final radius = BorderRadius.circular(borderRadius.clamp(0, 8).toDouble());
    final content = ClipRRect(
      borderRadius: radius,
      child: reducedEffects
          ? DecoratedBox(
              key: const Key('tami-glass-opaque'),
              decoration: BoxDecoration(
                color: _opaqueColor,
                borderRadius: radius,
                border: Border.all(color: _borderColor),
              ),
              child: Padding(padding: padding, child: child),
            )
          : BackdropFilter(
              key: const Key('tami-glass-blur'),
              filter: ImageFilter.blur(sigmaX: _blur, sigmaY: _blur),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: _glassColor,
                  borderRadius: radius,
                  border: Border.all(color: _borderColor),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x1F123C34),
                      blurRadius: 24,
                      offset: Offset(0, 10),
                    ),
                  ],
                ),
                child: Padding(padding: padding, child: child),
              ),
            ),
    );

    if (semanticLabel == null) {
      return content;
    }
    return Semantics(container: true, label: semanticLabel, child: content);
  }

  double get _blur => switch (level) {
    TamiGlassLevel.navigation => 22,
    TamiGlassLevel.action => 16,
    TamiGlassLevel.darkStatus => 18,
  };

  Color get _glassColor => switch (level) {
    TamiGlassLevel.navigation => TamiColors.paper.withValues(alpha: 0.74),
    TamiGlassLevel.action => TamiColors.paper.withValues(alpha: 0.88),
    TamiGlassLevel.darkStatus => TamiColors.deepGreen.withValues(alpha: 0.86),
  };

  Color get _opaqueColor => switch (level) {
    TamiGlassLevel.navigation || TamiGlassLevel.action => TamiColors.paper,
    TamiGlassLevel.darkStatus => TamiColors.deepGreen,
  };

  Color get _borderColor => switch (level) {
    TamiGlassLevel.navigation || TamiGlassLevel.action =>
      Colors.white.withValues(alpha: 0.78),
    TamiGlassLevel.darkStatus => Colors.white.withValues(alpha: 0.24),
  };
}
