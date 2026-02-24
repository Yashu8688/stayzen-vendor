import 'dart:js' as js;

void callRazorpayWeb(Map<String, dynamic> options, Function(String) onSuccess, Function(String) onError) {
  js.context.callMethod('checkoutRazorpay', [
    js.JsObject.jsify(options),
    js.allowInterop(onSuccess),
    js.allowInterop(onError),
  ]);
}
