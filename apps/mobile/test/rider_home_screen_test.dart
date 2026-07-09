import 'package:flutter_test/flutter_test.dart';
import 'package:tami_mobile/src/app/tami_mobile_app.dart';

void main() {
  testWidgets('renders rider home screen', (tester) async {
    await tester.pumpWidget(const TamiMobileApp(mode: TamiAppMode.rider));

    expect(find.text('Book a Tami ride'), findsOneWidget);
    expect(find.text('Immediate and scheduled rides across Sindh.'), findsOneWidget);
  });
}
