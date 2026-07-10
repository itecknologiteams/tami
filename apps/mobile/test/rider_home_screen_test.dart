import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tami_mobile/src/features/rider/rider_home_screen.dart';

void main() {
  testWidgets('renders rider home screen', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: RiderHomeScreen()));

    expect(find.text('Book a Tami ride'), findsOneWidget);
    expect(
      find.text('Immediate and scheduled rides across Sindh.'),
      findsOneWidget,
    );
  });
}
