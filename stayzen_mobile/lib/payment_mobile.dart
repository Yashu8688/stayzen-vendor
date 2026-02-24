import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'payment_interface.dart';

class MobilePaymentBridge implements PaymentBridge {
  late Razorpay _razorpay;
  late Function(String?) _onSuccess;
  late Function(String?) _onError;

  @override
  void init(Function(String?) onSuccess, Function(String?) onError) {
    _onSuccess = onSuccess;
    _onError = onError;
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, (PaymentSuccessResponse res) => _onSuccess(res.paymentId));
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, (PaymentFailureResponse res) => _onError(res.message));
  }

  @override
  void openCheckout(Map<String, dynamic> options) {
    _razorpay.open(options);
  }

  @override
  void dispose() {
    _razorpay.clear();
  }
}

PaymentBridge getPaymentBridge() => MobilePaymentBridge();
