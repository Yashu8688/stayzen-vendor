import 'payment_interface.dart';
import 'web_stub.dart'
    if (dart.library.js) 'payment_web.dart'
    if (dart.library.io) 'payment_mobile.dart' as platform;

PaymentBridge getPaymentBridge() {
  // On web, dart.library.js is true. On mobile, dart.library.io is true.
  // This function is defined in both platform files.
  // We need to use a trick to call the platform-specific getPaymentBridge.
  return platform.getPaymentBridge();
}
