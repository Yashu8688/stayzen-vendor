import 'package:flutter_test/flutter_test.dart';
import 'package:stayzen_mobile/main.dart';

void main() {
  testWidgets('App loads smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const StayZenApp());

    // Verify that the welcome text is present.
    expect(find.textContaining('Welcome'), findsOneWidget);
  });
}
