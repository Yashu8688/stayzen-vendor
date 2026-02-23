import 'payment_interface.dart';

class StubPaymentBridge implements PaymentBridge {
  @override
  void init(Function(String?) onSuccess, Function(String?) onError) {}

  @override
  void openCheckout(Map<String, dynamic> options) {}

  @override
  void dispose() {}
}

PaymentBridge getPaymentBridge() => StubPaymentBridge();

void callRazorpayWeb(Map<String, dynamic> options, Function(String) onSuccess, Function(String) onError) {}
