import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tami_mobile/src/ui/tami_colors.dart';
import 'package:tami_mobile/src/ui/tami_glass.dart';
import 'package:tami_mobile/src/ui/tami_route_ribbon.dart';
import 'package:tami_mobile/src/ui/tami_theme.dart';

void main() {
  test('defines the approved civic color tokens', () {
    expect(TamiColors.civicGreen, const Color(0xFF006C5B));
    expect(TamiColors.deepGreen, const Color(0xFF123C34));
    expect(TamiColors.signalYellow, const Color(0xFFF2BC3D));
    expect(TamiColors.routeCyan, const Color(0xFF2C9FA3));
    expect(TamiColors.mist, const Color(0xFFE7F0EC));
    expect(TamiColors.paper, const Color(0xFFF8FBF9));
    expect(TamiColors.danger, const Color(0xFFB42318));
    expect(TamiColors.ink, const Color(0xFF18302B));
  });

  test('builds a Material theme with stable eight pixel controls', () {
    final theme = buildTamiTheme();

    expect(theme.useMaterial3, isTrue);
    expect(theme.scaffoldBackgroundColor, TamiColors.paper);
    expect(theme.colorScheme.primary, TamiColors.civicGreen);
    expect(
      theme.inputDecorationTheme.border,
      isA<OutlineInputBorder>().having(
        (border) => border.borderRadius,
        'borderRadius',
        BorderRadius.circular(8),
      ),
    );
  });

  testWidgets('renders action glass with blur, radius, and semantics', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Center(
            child: TamiGlass(
              level: TamiGlassLevel.action,
              semanticLabel: 'Booking controls',
              borderRadius: 40,
              child: Text('Where to?'),
            ),
          ),
        ),
      ),
    );

    expect(find.byKey(const Key('tami-glass-blur')), findsOneWidget);
    expect(find.byType(BackdropFilter), findsOneWidget);
    final clip = tester.widget<ClipRRect>(find.byType(ClipRRect).first);
    expect(clip.borderRadius, BorderRadius.circular(8));
    expect(
      find.bySemanticsLabel(RegExp(r'^Booking controls')),
      findsOneWidget,
    );
  });

  testWidgets('uses an opaque fallback when motion effects are disabled', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: MediaQuery(
          data: MediaQueryData(disableAnimations: true),
          child: Scaffold(
            body: TamiGlass(
              level: TamiGlassLevel.navigation,
              child: Text('Karachi'),
            ),
          ),
        ),
      ),
    );

    expect(find.byKey(const Key('tami-glass-opaque')), findsOneWidget);
    expect(find.byType(BackdropFilter), findsNothing);
  });

  testWidgets('renders completed, active, and pending route segments', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: TamiRouteRibbon(currentStep: 1, steps: 3, animate: false),
        ),
      ),
    );

    expect(find.byKey(const Key('route-ribbon-segment-0')), findsOneWidget);
    expect(find.byKey(const Key('route-ribbon-segment-1')), findsOneWidget);
    expect(find.byKey(const Key('route-ribbon-segment-2')), findsOneWidget);
    expect(find.byKey(const Key('route-ribbon-completed-0')), findsOneWidget);
    expect(find.byKey(const Key('route-ribbon-active-1')), findsOneWidget);
    expect(find.byKey(const Key('route-ribbon-pending-2')), findsOneWidget);
    expect(find.bySemanticsLabel('Ride progress: step 2 of 3'), findsOneWidget);
  });
}
