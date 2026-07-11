import 'package:flutter/material.dart';

import 'tami_colors.dart';

class TamiRouteRibbon extends StatelessWidget {
  const TamiRouteRibbon({
    required this.currentStep,
    required this.steps,
    this.animate = true,
    super.key,
  }) : assert(steps > 0),
       assert(currentStep >= 0 && currentStep < steps);

  final int currentStep;
  final int steps;
  final bool animate;

  @override
  Widget build(BuildContext context) {
    final reducedMotion = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    return Semantics(
      container: true,
      label: 'Ride progress: step ${currentStep + 1} of $steps',
      child: SizedBox(
        height: 6,
        child: Row(
          children: List.generate(steps, (index) {
            final state = index < currentStep
                ? _RibbonState.completed
                : index == currentStep
                ? _RibbonState.active
                : _RibbonState.pending;
            return Expanded(
              key: Key('route-ribbon-segment-$index'),
              child: Padding(
                padding: EdgeInsets.only(right: index == steps - 1 ? 0 : 4),
                child: AnimatedContainer(
                  key: Key('route-ribbon-${state.name}-$index'),
                  duration: animate && !reducedMotion
                      ? const Duration(milliseconds: 360)
                      : Duration.zero,
                  curve: Curves.easeOutCubic,
                  decoration: BoxDecoration(
                    color: switch (state) {
                      _RibbonState.completed => TamiColors.civicGreen,
                      _RibbonState.active => TamiColors.signalYellow,
                      _RibbonState.pending => const Color(0xFFD2DFDA),
                    },
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}

enum _RibbonState { completed, active, pending }
