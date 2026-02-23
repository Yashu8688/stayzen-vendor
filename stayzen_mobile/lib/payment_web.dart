import 'dart:js' as js;
import 'payment_interface.dart';

class WebPaymentBridge implements PaymentBridge {
  late Function(String?) _onSuccess;
  late Function(String?) _onError;

  @override
  void init(Function(String?) onSuccess, Function(String?) onError) {
    _onSuccess = onSuccess;
    _onError = onError;
  }

  @override
  void openCheckout(Map<String, dynamic> options) {
    js.context.callMethod('checkoutRazorpay', [
      js.JsObject.jsify(options),
      js.allowInterop((id) => _onSuccess(id)),
      js.allowInterop((err) => _onError(err)),
    ]);
  }

  @override
  void dispose() {}
}

PaymentBridge getPaymentBridge() => WebPaymentBridge();
